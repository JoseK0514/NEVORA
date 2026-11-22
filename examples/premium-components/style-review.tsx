import {useEffect, useState} from 'react';
import {
  ComponentStyle,
  Dialog,
  Mark,
  Select,
  componentFamilies,
  reviewItems,
  treatmentKeys,
  type ComponentPart,
  type ReviewItem,
  type Treatment,
} from '../../src/components/premium';
import {StyleSample, recoveryCopy, toneLabels} from './style-samples';
import {RadixSample} from './radix-samples';
import {RadixPattern} from './radix-patterns';
import {usesRadix, styleSource, upstream} from './style-sources';
import './style-review.css';

const storageKey = 'nevora-component-style-choices-v1';
type Picks = Partial<Record<ComponentPart, Treatment>>;
function loadPicks(): Picks {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const picks: Picks = {};
    for (const {id} of reviewItems) if (raw && treatmentKeys.includes(raw[id])) picks[id] = raw[id];
    return picks;
  } catch {
    return {};
  }
}
const lookup = (id: string) => reviewItems.find(item => item.id === id) ?? reviewItems[0];
const fromHash = () => lookup(location.hash.split('/')[1] || 'button');
const titleFor = (item: ReviewItem, key: Treatment) => item.options[treatmentKeys.indexOf(key)];
function states(part: ComponentPart): [string, string][] {
  if (part === 'status' || part === 'notice')
    return ['warning', 'danger', 'info', 'success', 'neutral'].map(key => [
      key,
      toneLabels[key as keyof typeof toneLabels],
    ]);
  if (part === 'result') return Object.entries(recoveryCopy).map(([k, v]) => [k, v[0]]);
  if (part === 'navigation')
    return [
      ['phone', 'Phone tabs'],
      ['sidebar', 'Sidebar'],
      ['rail', 'Icon rail'],
    ];
  if (part === 'button')
    return [
      ['primary', 'Primary'],
      ['secondary', 'Secondary'],
      ['quiet', 'Quiet'],
      ['destructive', 'Destructive'],
      ['disabled', 'Disabled'],
    ];
  if (part === 'field' || part === 'search')
    return [
      ['default', 'Default'],
      ['error', 'Validation error'],
      ['disabled', 'Disabled'],
    ];
  if (part === 'select-input')
    return [
      ['default', 'Default'],
      ['disabled', 'Disabled'],
    ];
  return [];
}
function download(picks: Picks) {
  const lines = [
    '# NEVORA component style selections',
    '',
    'Apply the selections below to the corresponding components on the collaboration branch. Each entry gives the source identifiers used by the gallery.',
    '',
  ];
  for (const group of componentFamilies) {
    const chosen = group.items.filter(item => picks[item.id]);
    if (!chosen.length) continue;
    lines.push('## ' + group.title, '');
    for (const item of chosen) {
      const key = picks[item.id]!;
      lines.push(
        '- ' +
          item.label +
          ' — ' +
          titleFor(item, key) +
          ' (part `' +
          item.id +
          '`, treatment `' +
          key +
          '`)',
      );
    }
    lines.push('');
  }
  lines.push('## Sources', '');
  for (const item of reviewItems.filter(i => picks[i.id])) {
    const src = styleSource(item.id);
    lines.push(
      '- ' +
        item.label +
        ' — ' +
        (picks[item.id] === 'original'
          ? 'Use ' +
            upstream(item.id).component +
            ' as shown in ' +
            (usesRadix(item.id) ? 'radix-samples.tsx' : 'radix-patterns.tsx') +
            '. ' +
            upstream(item.id).url +
            ' '
          : 'Use the NEVORA treatment from the comparison. ') +
        src.name +
        ' — ' +
        src.url,
    );
  }
  const href = URL.createObjectURL(
    new Blob([lines.join('\n')], {type: 'text/markdown;charset=utf-8'}),
  );
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'NEVORA-component-choices.md';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
export function StyleReview() {
  const [item, setItem] = useState(fromHash),
    [picks, setPicks] = useState<Picks>(loadPicks),
    [review, setReview] = useState(false),
    [sampleState, setSampleState] = useState(''),
    [storageFailed, setStorageFailed] = useState(false);
  const group = componentFamilies.find(g => g.items.some(i => i.id === item.id))!;
  const sampleStates = states(item.id),
    state = sampleState || sampleStates[0]?.[0] || '';
  const total = Object.keys(picks).length;
  useEffect(() => {
    const change = () => {
      const next = fromHash();
      setItem(next);
      setSampleState('');
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  function go(id: string) {
    const next = lookup(id);
    setItem(next);
    setSampleState('');
    history.replaceState(null, '', '#compare/' + next.id);
  }
  function save(next: Picks) {
    setPicks(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }
  function choose(key: Treatment) {
    const next = {...picks};
    if (next[item.id] === key) delete next[item.id];
    else next[item.id] = key;
    save(next);
  }
  const itemIndex = reviewItems.findIndex(i => i.id === item.id);
  return (
    <div className="nv-review">
      <div className="nv-toolbar">
        <Select
          label="Family"
          value={group.id}
          onChange={e => {
            const g = componentFamilies.find(x => x.id === e.target.value);
            if (g) go(g.items[0].id);
          }}
        >
          {componentFamilies.map(g => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </Select>
        <Select label="Component" value={item.id} onChange={e => go(e.target.value)}>
          {group.items.map(i => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </Select>
        <button type="button" className="nv-review-picks" onClick={() => setReview(true)}>
          <Mark name="check" size={16} weight="bold" />
          Your picks <span>{total}</span>
        </button>
      </div>
      <div className="nv-review-line">
        <h2>{item.label}</h2>
        {sampleStates.length > 0 && (
          <Select
            label="Preview state"
            value={state}
            onChange={e => setSampleState(e.target.value)}
          >
            {sampleStates.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="nv-comparison-grid" role="group" aria-label={item.label + ' options'}>
        {treatmentKeys.map((key, index) => (
          <article
            key={item.id + key}
            data-picked={picks[item.id] === key}
            className="nv-option-card"
            aria-label={item.options[index]}
          >
            <header>
              <div className="nv-option-name">
                <h3>{item.options[index]}</h3>
                {index === 0 && <span>{upstream(item.id).name}</span>}
              </div>
              <button
                type="button"
                aria-label={(picks[item.id] === key ? 'Picked ' : 'Pick ') + item.options[index]}
                aria-pressed={picks[item.id] === key}
                className="nv-pick"
                onClick={() => choose(key)}
              >
                <span className="nv-pick-mark" aria-hidden="true">
                  {picks[item.id] === key && <Mark name="check" size={11} weight="bold" />}
                </span>
                {picks[item.id] === key ? 'Picked' : 'Pick'}
              </button>
            </header>
            <div className="nv-demo" data-sample={item.id}>
              <ComponentStyle part={item.id} treatment={key}>
                {key === 'original' ? (
                  usesRadix(item.id) ? (
                    <RadixSample key={item.id + state} part={item.id} state={state} />
                  ) : (
                    <RadixPattern key={item.id + state} part={item.id} state={state} />
                  )
                ) : (
                  <StyleSample key={item.id + state} look={key} part={item.id} state={state} />
                )}
              </ComponentStyle>
            </div>
          </article>
        ))}
      </div>
      <div className="nv-source">
        <a href={styleSource(item.id).url} target="_blank" rel="noreferrer">
          {styleSource(item.id).name} <Mark name="exit" size={13} weight="bold" />
        </a>
        <span>{styleSource(item.id).detail}</span>
        {!usesRadix(item.id) &&
          item.id !== 'mark' &&
          upstream(item.id).url !== styleSource(item.id).url && (
            <a href={upstream(item.id).url} target="_blank" rel="noreferrer">
              {upstream(item.id).component} <Mark name="exit" size={13} />
            </a>
          )}
      </div>
      <div className="nv-review-foot">
        <button
          className="nv-step"
          type="button"
          disabled={itemIndex === 0}
          onClick={() => go(reviewItems[itemIndex - 1].id)}
        >
          <Mark name="left" size={16} weight="bold" />
          Previous component
        </button>
        <span>
          {itemIndex + 1} / {reviewItems.length}
        </span>
        <button
          className="nv-step"
          type="button"
          disabled={itemIndex === reviewItems.length - 1}
          onClick={() => go(reviewItems[itemIndex + 1].id)}
        >
          Next component
          <Mark name="right" size={16} weight="bold" />
        </button>
      </div>
      {storageFailed && (
        <p role="status">
          Your browser couldn’t save these picks. Download them before closing this page.
        </p>
      )}
      <Dialog
        open={review}
        title="Your picks"
        onClose={() => setReview(false)}
        actions={
          total > 0 ? (
            <button type="button" className="nv-export" onClick={() => download(picks)}>
              Download picks for Claude
            </button>
          ) : undefined
        }
      >
        {total === 0 ? (
          <p>Pick a style on any component to start your list.</p>
        ) : (
          <div className="nv-pick-list">
            {reviewItems
              .filter(i => picks[i.id])
              .map(i => (
                <div key={i.id}>
                  <span>
                    <strong>{i.label}</strong>
                    <small>{titleFor(i, picks[i.id]!)}</small>
                  </span>
                  <button
                    type="button"
                    aria-label={'Review ' + i.label}
                    onClick={() => {
                      setReview(false);
                      go(i.id);
                    }}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    aria-label={'Remove ' + i.label}
                    onClick={() => {
                      const next = {...picks};
                      delete next[i.id];
                      save(next);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

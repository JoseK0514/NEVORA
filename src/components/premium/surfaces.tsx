'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {BAvatar} from '../owner-b/b-kit';
import {Mark, type MarkName} from './artwork';
import {IconButton} from './controls';

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'np-card ' + className}>
      {title && (
        <header className="np-card-head">
          <h2>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Row({
  title,
  detail,
  leading,
  trailing,
  onClick,
  selected,
}: {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  const content = (
    <>
      {leading}
      <span className="np-row-copy">
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      {trailing}
      {onClick && <Mark name="right" size={15} weight="bold" />}
    </>
  );
  return onClick ? (
    <button type="button" className="np-row" data-selected={selected} onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="np-row">{content}</div>
  );
}
export function Disc({icon}: {icon: MarkName}) {
  return (
    <span className="np-disc">
      <Mark name={icon} size={19} />
    </span>
  );
}
export function Avatar({name, size = 38}: {name: string; size?: number}) {
  return <BAvatar name={name} size={size} />;
}

export function WeekControl({
  label,
  onPrevious,
  onNext,
  previousLabel = 'Previous week',
  nextLabel = 'Next week',
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className="np-week">
      <IconButton label={previousLabel} icon="left" onClick={onPrevious} />
      <span aria-live="polite">{label}</span>
      <IconButton label={nextLabel} icon="right" onClick={onNext} />
    </div>
  );
}
export type Metric = {label: string; value: string; icon: MarkName};
export function GlassBand({
  title,
  context,
  action,
  metrics,
}: {
  title: string;
  context?: string;
  action?: ReactNode;
  metrics: readonly Metric[];
}) {
  return (
    <section className="np-band">
      <header>
        <div>
          {context && <p>{context}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      <dl className="np-tiles">
        {metrics.map(metric => (
          <div key={metric.label}>
            <dt>
              <Mark name={metric.icon} size={17} weight="duotone" />
              {metric.label}
            </dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export type NavItem = {id: string; title: string; href: string; icon: MarkName};
export function Navigation({
  items,
  current,
  label,
  mode = 'sidebar',
  onNavigate,
}: {
  items: readonly NavItem[];
  current: string;
  label: string;
  mode?: 'sidebar' | 'rail' | 'phone';
  onNavigate?: (id: string) => void;
}) {
  return (
    <nav className="np-navigation" aria-label={label} data-mode={mode}>
      {items.map(item => (
        <a
          key={item.id}
          href={item.href}
          aria-current={current === item.id ? 'page' : undefined}
          title={mode === 'rail' ? item.title : undefined}
          onClick={e => {
            if (!onNavigate || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onNavigate(item.id);
          }}
        >
          <Mark name={item.icon} size={21} weight={current === item.id ? 'fill' : 'duotone'} />
          <span>{item.title}</span>
        </a>
      ))}
    </nav>
  );
}
export function Overflow({
  label,
  actions,
}: {
  label: string;
  actions: readonly {label: string; icon: MarkName; onSelect: () => void}[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target))
        ref.current.open = false;
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  function close() {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector('summary')?.focus();
    }
  }
  return (
    <details
      ref={ref}
      className="np-overflow"
      onKeyDown={e => {
        if (e.key === 'Escape' && ref.current?.open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <summary aria-label={label} title={label}>
        <Mark name="more" weight="bold" />
      </summary>
      <div>
        {actions.map(action => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              close();
              action.onSelect();
            }}
          >
            <Mark name={action.icon} size={17} />
            {action.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function ShiftRow({
  name,
  time,
  detail,
  status,
}: {
  name: string;
  time: string;
  detail: string;
  status?: ReactNode;
}) {
  return (
    <div className="np-record">
      <Avatar name={name} />
      <span className="np-row-copy">
        <strong>{name}</strong>
        <small>{detail}</small>
      </span>
      <div className="np-record-values">
        <strong>{time}</strong>
        {status}
      </div>
    </div>
  );
}
export function Timecard({
  title,
  period,
  rows,
  total,
}: {
  title: string;
  period: string;
  rows: readonly {label: string; value: string}[];
  total: {label: string; value: string};
}) {
  return (
    <div className="np-timecard">
      <header>
        <Disc icon="receipt" />
        <span className="np-row-copy">
          <strong>{title}</strong>
          <small>{period}</small>
        </span>
      </header>
      <dl>
        {rows.map(r => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
        <div className="np-total">
          <dt>{total.label}</dt>
          <dd>{total.value}</dd>
        </div>
      </dl>
    </div>
  );
}

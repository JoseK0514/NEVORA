import assert from 'node:assert/strict';

// Read actual Direction B cards, excluding duplicate trailing affordances.
// The only card without a displayed count is the explicitly quiet open period.
export async function readVisibleInboxCards(locator, sourceItems, firstNames) {
  const cards = await locator.evaluateAll(elements => elements.map(card => {
    const pill = card.querySelector(':scope > .b-card__h > h2 > .b-pill');
    const rows = [...card.querySelectorAll('ul.b-list > li.b-li > a.b-row--link,ul.b-list > li.b-li > .b-row > a.b-row__hit')].map(row => ({href: row.getAttribute('href'), label: row.getAttribute('aria-label') ?? row.textContent, text: row.textContent}));
    return {id: card.id.slice(2), label: card.querySelector(':scope > .b-card__h > h2')?.textContent ?? '', count: pill ? Number(pill.textContent) : null, hrefs: rows.map(row => row.href), rows};
  }));
  const allTimecards = sourceItems.filter(item => item.type === 'TIMECARD');
  const eligible = allTimecards.filter(item => item.review?.independentReviewRequired !== true);
  for (const card of cards) {
    const quiet = card.id === 'todo-closed-timecards';
    if (!quiet) assert(Number.isInteger(card.count) && card.count > 0, 'Every displayed group count is positive');
    else assert.equal(card.count, null, 'The open period has no actionable count badge');
    if (!card.id.endsWith('timecards')) continue;
    let represented = 0;
    const periods = new Set();
    for (const row of card.rows) {
      const target = new URL(row.href, 'https://nevora.invalid');
      assert.equal(target.pathname, '/app/timecards');
      const start = target.searchParams.get('start'), end = target.searchParams.get('end');
      const key = start + '_' + end;
      assert(!periods.has(key), 'One primary timecard row per period in a group'); periods.add(key);
      const samePeriod = item => item.review?.period?.startDate === start && item.review?.period?.endDate === end;
      const members = eligible.filter(samePeriod);
      assert(members.length > 0, 'A visible period represents actual eligible subjects');
      const total = allTimecards.filter(samePeriod).length;
      const quantity = (members.length === total ? String(members.length) : `${members.length} of ${total}`) + (total === 1 ? ' timecard' : ' timecards');
      assert(new RegExp('\\b' + quantity + '\\b').test(row.text.replace(/\s+/gu, ' ')), 'The visible row states the exact eligible and total membership');
      for (const item of members) {
        assert.equal(typeof firstNames[item.employeeId], 'string');
        assert(row.label.includes(firstNames[item.employeeId]), 'The actual period row names every eligible fixture subject');
      }
      for (const item of allTimecards.filter(item => samePeriod(item) && item.review?.independentReviewRequired === true)) {
        if (!members.some(member => firstNames[member.employeeId] === firstNames[item.employeeId])) assert(!row.label.includes(firstNames[item.employeeId]), 'Independent review subjects are absent from this reviewer’s row');
      }
      const expected = new URL(members[0].href, 'https://nevora.invalid');
      if (members.length > 1) expected.hash = '';
      assert.equal(row.href, expected.pathname + expected.search + expected.hash, 'The actual primary link preserves the eligible subject/period destination');
      represented += members.length;
    }
    assert(represented > 0);
    if (!quiet) assert.equal(card.count, represented, 'The displayed timecard count matches represented source identities');
    card.representedCount = represented;
  }
  return cards;
}

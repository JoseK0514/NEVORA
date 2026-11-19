import assert from 'node:assert/strict';

// Read actual Direction B cards, excluding duplicate trailing affordances.
// Open periods and groups containing only another reviewer’s work carry no actionable count.
export async function readVisibleInboxCards(locator, sourceItems, firstNames) {
  const cards = await locator.evaluateAll(elements => elements.map(card => {
    const pill = card.querySelector(':scope > .b-card__h > h2 > .b-pill');
    const rows = [...card.querySelectorAll('ul.b-list > li.b-li > a.b-row--link,ul.b-list > li.b-li > .b-row > a.b-row__hit')].map(row => ({href: row.getAttribute('href'), label: row.getAttribute('aria-label') ?? row.textContent, text: row.textContent, detail: row.querySelector('.b-row__s')?.textContent ?? ''}));
    return {id: card.id.slice(2), label: card.querySelector(':scope > .b-card__h > h2')?.textContent ?? '', count: pill ? Number(pill.textContent) : null, hrefs: rows.map(row => row.href), rows};
  }));
  const allTimecards = sourceItems.filter(item => item.type === 'TIMECARD');
  const periodOf = item => {const target = new URL(item.href, 'https://nevora.invalid');return item.review?.period ?? {startDate:target.searchParams.get('start'),endDate:target.searchParams.get('end')};};
  const mayReview = item => item.review?.actorMayReview === true && item.review.unavailableReason !== 'facts_unavailable';
  const eligible = allTimecards.filter(mayReview);
  const other = allTimecards.filter(item => !mayReview(item));
  for (const card of cards) {
    const quiet = card.id === 'todo-closed-timecards';
    if (!card.id.endsWith('timecards')) {
      assert(Number.isInteger(card.count) && card.count > 0, 'Every displayed group count is positive');
      continue;
    }
    let represented = 0;
    const periods = new Set(), observedPeriods = new Set(), otherSeen = new Set();
    for (const row of card.rows) {
      const target = new URL(row.href, 'https://nevora.invalid');
      assert.equal(target.pathname, '/app/timecards');
      const start = target.searchParams.get('start'), end = target.searchParams.get('end');
      const key = start + '_' + end;
      observedPeriods.add(key);
      const samePeriod = item => periodOf(item).startDate === start && periodOf(item).endDate === end;
      // U03 retains the signed-in person's own card and unknown review facts as
      // separate, uncounted subject rows. Match their immutable target against
      // typed source facts; never infer review authority from the English label.
      const subject = other.find(item => item.href === row.href && samePeriod(item));
      if (subject) {
        assert(!otherSeen.has(subject.id), 'One non-reviewable row per source identity'); otherSeen.add(subject.id);
        if (subject.review?.concernsActor === true) assert(row.label.includes('Your timecard'), 'The own row identifies the signed-in subject');
        else {assert.equal(typeof firstNames[subject.employeeId], 'string');assert(row.label.includes(firstNames[subject.employeeId]), 'The non-reviewable row preserves its authorized subject');}
        if (subject.review?.independentReviewRequired === true && subject.review.unavailableReason !== 'facts_unavailable') {
          assert(row.label.includes('Another reviewer approves this one') && row.label.includes('It needs an Owner or a Manager with company access.'), 'The independent reviewer explanation remains explicit');
        } else assert(row.label.includes('Who approves this could not be checked'), 'Unknown review facts remain explicit');
        assert(!/\b\d+(?:\s+of\s+\d+)?\s+timecards?\b/u.test(row.detail), 'Non-reviewable rows carry no actionable count');
        continue;
      }
      assert(!periods.has(key), 'One actionable timecard row per period in a group'); periods.add(key);
      const members = eligible.filter(samePeriod);
      assert(members.length > 0, 'A visible period represents actual eligible subjects');
      const total = allTimecards.filter(samePeriod).length;
      const quantity = (members.length === total ? String(members.length) : `${members.length} of ${total}`) + (total === 1 ? ' timecard' : ' timecards');
      assert(new RegExp('\\b' + quantity + '\\b').test(row.detail.replace(/\s+/gu, ' ')), 'The visible detail states the exact eligible and total membership: ' + JSON.stringify({quantity, detail:row.detail}));
      for (const item of members) {
        assert.equal(typeof firstNames[item.employeeId], 'string');
        assert(row.label.includes(firstNames[item.employeeId]), 'The actual period row names every eligible fixture subject: ' + JSON.stringify({employeeId:item.employeeId, expected:firstNames[item.employeeId], label:row.label}));
      }
      for (const item of other.filter(samePeriod)) {
        if (!members.some(member => firstNames[member.employeeId] === firstNames[item.employeeId])) assert(!row.label.includes(firstNames[item.employeeId]), 'Non-reviewable subjects are absent from this reviewer’s row');
      }
      const expected = new URL(members[0].href, 'https://nevora.invalid');
      if (members.length > 1) expected.hash = '';
      assert.equal(row.href, expected.pathname + expected.search + expected.hash, 'The actual primary link preserves the eligible subject/period destination');
      represented += members.length;
    }
    for (const item of other) {
      const period = periodOf(item);
      if (period && observedPeriods.has(period.startDate + '_' + period.endDate)) assert(otherSeen.has(item.id), 'Every non-reviewable subject remains visible in its period');
    }
    assert(represented > 0 || otherSeen.size > 0, 'The card represents actual source identities');
    if (quiet || represented === 0) assert.equal(card.count, null, 'Open or other-reviewer-only periods have no actionable badge');
    else assert.equal(card.count, represented, 'The displayed timecard count matches represented source identities');
    card.representedCount = represented;
    card.nonReviewableCount = otherSeen.size;
    card.quietOnly = represented === 0;
  }
  return cards;
}

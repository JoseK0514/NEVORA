import {readFile} from 'node:fs/promises';
import {expect, it} from '@rstest/core';

const source = (file: string) => readFile(new URL(file, import.meta.url), 'utf8');

/* "Discard changes?" on Employee and Lead forms (Jose, Nov 21, 2026). The guard itself is tested in kit/; these keep each
 * form wired to it with the condition that decides when it asks. */
it('asks before leaving unsaved availability hours, in both layouts, and not while saving or on a closed week', async () => {
  for (const file of ['./availability-signature.tsx'])
    expect(await source(file), file).toContain('<DiscardGuard dirty={dirty && !disabled} />');
});
it('asks before leaving the Employee availability page with unsaved hours, and never when moving between its weeks', async () => {
  const page = await source('./employee-mobile/availability.tsx');
  expect(page).toContain('<DiscardGuard dirty={unsaved}/>');
  expect(page).toContain("const unsaved=!pending&&!uncertain&&Object.entries(drafts).some(([key,stored])=>changedDays(stored).length>0&&ops.peek(key)?.result?.state!=='complete');");
  // The page keeps a draft per week, so its own week links are not a leave.
  expect(page.match(/data-discard-skip=""/g)?.length).toBe(5);
  expect(await source('./employee-b/availability-b.tsx')).toContain('<span data-discard-skip="" style={{display:\'contents\'}}><BButtonLink href={change} kind="glass">');
});
it('asks before leaving a Lead’s unsent message to today’s team, as it does for a Manager’s update', async () => {
  const compose = await source('./communication-compose.tsx');
  expect(compose).toContain("<DiscardGuard dirty={!action.pending&&(title!==(initial?.title??'')||body!==(initial?.body??''))}/>");
  expect(compose).not.toContain("mode==='manager'?<DiscardGuard");
});
it('asks before an Employee leaves or cancels a changed work-restrictions request, and never for an untouched one', async () => {
  const screen = await source('./restrictions/restrictions-screen.tsx');
  expect(screen).toContain('useDiscardGuard(scope === "employee" && step !== "view" && draft !== null && !busy && JSON.stringify(draft) !== draftStart)');
  expect(screen).toContain('onClick={() => guard.leave(() => { setDraft(null); setProblems([]); setStep("view"); })}>{t.cancel}');
  expect(screen).toContain('<DiscardDialog open={guard.asking} onKeep={guard.keep} onDiscard={guard.discard} lang={lang} />');
});

'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSession, requireSessionMutationProof } from '@/lib/auth/session';
import { executeOpenShift } from '@/lib/data/open-shifts.server';
import { parseOpenShiftCommand, type OpenShiftCommand, type OpenShiftResult } from '@/lib/scheduling/open-shifts';
import { moduleEnabled } from '@/lib/workspace-presentation/current.server';

export async function submitOpenShift(
  previous: {result?: OpenShiftResult; postId: string},
  form: FormData,
): Promise<{result?: OpenShiftResult; postId: string; retry?: OpenShiftCommand}> {
  const session = await getSession();
  const {postId} = previous;
  if (!session || session.id !== form.get('actorId') || !await moduleEnabled('marketplace')) {
    return {result: {state: 'forbidden'}, postId};
  }
  const proof = await requireSessionMutationProof();
  if (proof.employee.id !== session.id || proof.employee.role !== session.role) {
    return {result: {state: 'forbidden'}, postId};
  }
  const kind = form.get('kind');
  const id = form.get('id');
  const input = kind === 'post' ? { kind, id, locationId: form.get('locationId'), positionId: form.get('positionId'),
    date: form.get('date'), startTime: form.get('startTime'), endTime: form.get('endTime') } : {kind, id};
  const command = parseOpenShiftCommand(input);
  if (!command) return {result: {state: 'invalid'}, postId};
  let result: OpenShiftResult;
  try { result = await executeOpenShift(proof, command); }
  catch { result = {state: 'unavailable'}; }
  if (['posted', 'claimed', 'withdrawn', 'filled', 'expired', 'ineligible'].includes(result.state)) {
    revalidatePath('/app/exchange/open-shifts');
    if (result.state === 'claimed') revalidatePath('/app/schedule');
  }
  return {result, postId: result.state === 'posted' ? randomUUID() : postId,
    ...(result.state === 'outcome_unknown' ? {retry: command} : {})};
}

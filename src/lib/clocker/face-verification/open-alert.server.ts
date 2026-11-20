import 'server-only';
import type {SessionMutationProof} from '../../shift-changes/types';
import {faceAlertId} from './alerts.server';
import {getClockerFaceRuntime} from './runtime.server';

export async function readClockerFaceAlert(proof: SessionMutationProof, id: string, markRead = false) {
  if (proof.employee.role !== 'OWNER' || !faceAlertId(id)) return null;
  const binding = await getClockerFaceRuntime();
  if (!binding) return null;
  return binding.service.alertReference(await binding.photo.portalProof(proof), id, markRead);
}

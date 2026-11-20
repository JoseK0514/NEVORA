import 'server-only';
import type {SqlStatement} from '../../notifications/types';
import {readPhotoPlatformBinding} from '../photo-server/platform-lifecycle';
import {readFaceKey} from './crypto.server';

const faces = /^clocker-face-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
export const faceAlertId = (value: string) => faces.exec(value)?.[1] ?? null;
export const faceAlertWorkspace = () => readFaceKey() ? readPhotoPlatformBinding(process.env)?.workspaceId : undefined;
export const faceAlertScope = (workspaceId: string): SqlStatement => ({
  text: "SELECT set_config('nevora.clocker.photo_workspace',$1,true)", values: [workspaceId],
});

const ownedPhoto = `JOIN clocker_punch_photos p ON (p.workspace_id,p.device_id,p.command_id)=(a.workspace_id,a.device_id,a.command_id)
  JOIN employees e ON e.id=a.owner_id AND e.active AND e.role='OWNER'
  JOIN locations l ON l.id=e.primary_location_id AND l.workspace_id=a.workspace_id`;
const currentPhoto = "p.state='stored' AND p.expires_at>clock_timestamp()";

export function faceAlertCandidatesSql(actorPlaceholder: string) {
  return `SELECT 'clocker-face-'||a.id::text AS id,a.created_at::text AS at,a.read_at::text AS read,true AS face,p.expires_at::text AS "expiresAt"
   FROM clocker_face_alerts a ${ownedPhoto}
   WHERE a.owner_id=${actorPlaceholder} AND ${currentPhoto}`;
}

export function faceAlertReferenceSql(workspaceId: string, ownerId: string, notificationId: string, read: boolean): SqlStatement {
  const visible = `SELECT a.id,a.device_id,a.command_id FROM clocker_face_alerts a ${ownedPhoto}
    WHERE a.workspace_id=$1 AND a.owner_id=$2 AND a.id=$3::uuid AND ${currentPhoto}`;
  return {
    text: read
      ? `WITH visible AS (${visible}) UPDATE clocker_face_alerts a SET read_at=COALESCE(a.read_at,clock_timestamp())
         FROM visible v WHERE a.workspace_id=$1 AND a.owner_id=$2 AND a.id=v.id RETURNING v.device_id AS "deviceId",v.command_id::text AS "commandId"`
      : `SELECT device_id AS "deviceId",command_id::text AS "commandId" FROM (${visible}) visible`,
    values: [workspaceId, ownerId, notificationId],
  };
}

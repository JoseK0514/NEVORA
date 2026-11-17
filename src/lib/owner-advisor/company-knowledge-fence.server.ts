import 'server-only';
import type { SqlStatement } from '@/lib/notifications/types';
import type { KnowledgeFence } from './company-knowledge';
/** Knowledge writers take the conflicting workspace lock. The time guard also
 * catches activation/expiry with no intervening revision write. */
export function knowledgeFenceGuards(workspaceId: string, fence: KnowledgeFence): SqlStatement[] {
  return [
    { text: 'SELECT id FROM workspaces WHERE id=$1 FOR SHARE', values: [workspaceId] },
    { text: "SELECT(CASE WHEN COALESCE((SELECT revision FROM owner_advisor_company_knowledge_state WHERE workspace_id=$1),0)=$2 AND ($3::timestamptz IS NULL OR $3::timestamptz>clock_timestamp()) THEN '1' ELSE 'advisor_knowledge_changed' END)::integer", values: [workspaceId, fence.revision, fence.validUntil] },
  ];
}

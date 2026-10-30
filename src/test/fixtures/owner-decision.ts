/** Hand-authored fictional decision protocol; not a live-model quality sample. */
export function ownerDecision() {
  return {
    language: "en", summary: "Two shifts are recorded. Review the missing facts before changing the schedule.",
    observations: [{ statement: "The current briefing records two shifts.", evidenceIds: ["E1"] }],
    options: [{ id: "review", description: "Review the recorded exceptions with the Owner.", tradeoff: "Requires an Owner decision before any business change.", evidenceIds: ["E1"], feasibility: "unverified", coverage: null as { evidenceId: string; alternativeIndex: number } | null }],
    recommendation: { optionId: "review" as string | null, rationale: "Start with the current evidence and preserve existing work." },
    uncertainties: ["Employee availability has not been confirmed."], nextStep: "Open the existing review workflow.", outcomeCheck: "Read the current canonical records again after the Owner's action.",
    acknowledgedPartialEvidence: [] as string[],
  };
}
export const decisionCall = (value: unknown = ownerDecision(), id = "decision-1") => ({ type: "function_call", name: "review_decision", arguments: JSON.stringify(value), call_id: id });
export const decisionReply = (value: unknown = ownerDecision(), id = "decision-1") => ({ output: [decisionCall(value, id)] });

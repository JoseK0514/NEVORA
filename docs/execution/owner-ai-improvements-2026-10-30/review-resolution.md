# R1 source correction — behavioral acceptance still held

The independent reviewer found a medium/P2 defect in immutable checkpoint `67fbd50d3154e7e36e2abd9652ac9f847ed83d25`: selecting task B after task A retained the question automatically filled from A, mixing A's question with B's notes/scope/evidence. The original report and source checkpoint remain preserved.

The controller now tracks automatic question provenance separately from deliberate Owner text. Switching tasks replaces an automatic objective; choosing a general investigation clears it. An explicit question edit ends that automatic provenance, so manually authored drafts survive selection changes. Fresh saved-task objectives update automatic text only. Retirement and accepted answers clear the provenance with the existing lifecycle.

Three controller regressions were authored before the correction: A→B submission uses B's objective/ID, explicitly edited text survives task/general choices, and refreshed objectives replace automatic text while retaining explicit edits. They remain NOT RUN. This raises newly authored cases to 23. Follow-up static command results are preserved in `static-checks/followup`; the independent reviewer's follow-up will identify the exact corrected commit. This author note does not close the independent finding or claim behavioral acceptance.

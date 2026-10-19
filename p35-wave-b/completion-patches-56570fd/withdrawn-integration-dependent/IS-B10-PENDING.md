# IS-B10 pending Settings feedback candidate completion

Candidate-only against56570fd. Source9bd/ready368 already has wb-payroll-feedback. Primary report interaction-states.md:26 specifically measures pending Company Recording action offscreen; source float fixed row143. Candidate21e603b reveals after busy settles, which does not address held pending feedback.

One wrapper reuses the scoped feedback float supplied by the IS-B33 patch. The existing CSS class name pw-runs-feedback is used as a pure shared presentation hook; no duplicate styling and no operation/copy/command changes. Root may rename both classes together for clarity while reviewing the concrete diffs. Keep Company post-settlement focus behavior intact. No tests/runtime/app edits. Verify held Company feedback visible at390/100 and320/200, plus settled interrupted feedback, preserving original reason focus unless the user chooses a recovery control.

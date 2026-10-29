# Read-only Phase1 Notifications503 diagnosis — October29

Author: /root/creation_transport_diagnosis, read-only explorer; no edits or processes.

Source-publication overlap is a strong code-supported explanation but thef836 artifact does not demonstrate the precise failing guard. The reader freezes discovered keys/versions and replays fresh protected observations. Changed Schedule receipt identity can throw Unobserved receipt source (employee-notification-list.server.ts:200); a newly required observation can throw at236; catch at246 returns read_failed; route maps it to503. Existing cfr003-carry-forward test:78 explicitly expects changed versions to become unavailable.

Phase1 lines158–161 edit/publish then wait for Schedule UI/screenshot, which does not establish background notification completion, before another deletion/publication. Native log lines124–127 place122ms503 between republished and removed Schedule responses, followed200. No mutation timestamps or exact swallowed guard are captured, so do not certify the exact historical cause.

Smallest next correction: stop admitting new notification reads while changing this fixture; drain already-started reads before SQL; retain existing edit and publication; release queued requests unchanged afterward. Record read start/end and mutation start/publication end. A bare single-response wait is insufficient and an atomic writer alone cannot stop a multi-transaction reader straddling its commit. Retain unexpected503/error assertions; if503 persists with proved non-overlap, instrument exact fail-closed reason and keep failure open. This does not certify production never has a transient unavailable read during publication. Later403 is separate and cannot authorize earlier503.

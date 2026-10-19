# Compose auth truthfulness observation

Exact source `cd764f614be8ca5b5215be19d46e07cf968638d7`; static only, no browser reproduction.

`src/components/communication-compose.tsx:126,128` handles a context/detail unauthorized response by returning `{state:"unauthorized",reason:"access_denied"}`, dropping the HTTP status preserved by `communicationRequest`. `:135,:144` then uses “Your session ended” for both401 and403. A real403 means access changed and should not assert that a session ended. Recovery Sign in is present; this is not the Updates list missing401 recovery.

Fresh scope: Employee/Manager Compose context401/403 and manager edit-read401/403, actual mocked HTTP responses and settled rendered copy, at390/100 and320/200 in both engines. No existing LIST401/403 pass closes Compose. Parent was informed. Neither source nor the frozen1546-ID prep was modified for this observation.

CommunicationDetail is separately correct in source: `communication-detail.tsx:146` maps both unavailable reasons to unauthorized, and `:59–69` distinguishes session_ended from access_denied. Fresh runtime evidence remains required.

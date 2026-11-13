import type {BatchSnapshot} from '../../invitation-batch.server';

// Fictional browser-visible responses only. No invitation or session bearer.
export const invitationBatchFixtures: {name:string;result:BatchSnapshot}[] = [
  {
    "name": "pending",
    "result": {
      "state": "ready",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
      "version": "2",
      "stage": "PENDING",
      "receipt": {
        "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
        "commandKind": "PREPARE_INVITATION_BATCH",
        "committedAt": "2026-11-12T12:00:00+00:00",
        "resultingVersion": "4"
      },
      "items": [
        {
          "employeeId": "EMP-1",
          "operationId": "00000000-0000-8000-8000-000000000001",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000001",
              "invitationId": "10000000-0000-4000-8000-000000000001",
              "revision": 1,
              "employeeId": "EMP-1",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "PROVIDER_ACCEPTED"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-1",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000001",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "PROVIDER_ACCEPTED",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        },
        {
          "employeeId": "EMP-2",
          "operationId": "00000000-0000-8000-8000-000000000002",
          "commandState": "PREPARED",
          "result": null,
          "status": {
            "state": "ready",
            "employeeId": "EMP-2",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 0,
            "invitation": null,
            "delivery": "UNAVAILABLE",
            "allowedCommands": [
              "ISSUE"
            ],
            "retryAfterMs": null
          }
        }
      ]
    }
  },
  {
    "name": "partial",
    "result": {
      "state": "ready",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
      "version": "2",
      "stage": "PARTIAL",
      "receipt": {
        "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
        "commandKind": "PREPARE_INVITATION_BATCH",
        "committedAt": "2026-11-12T12:00:00+00:00",
        "resultingVersion": "4"
      },
      "items": [
        {
          "employeeId": "EMP-1",
          "operationId": "00000000-0000-8000-8000-000000000001",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000001",
              "invitationId": "10000000-0000-4000-8000-000000000001",
              "revision": 1,
              "employeeId": "EMP-1",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "PROVIDER_ACCEPTED"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-1",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000001",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "PROVIDER_ACCEPTED",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        },
        {
          "employeeId": "EMP-2",
          "operationId": "00000000-0000-8000-8000-000000000002",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000002",
              "invitationId": "10000000-0000-4000-8000-000000000002",
              "revision": 1,
              "employeeId": "EMP-2",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "FAILED"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-2",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000002",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "FAILED",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        },
        {
          "employeeId": "EMP-3",
          "operationId": "00000000-0000-8000-8000-000000000003",
          "commandState": "BLOCKED",
          "result": {
            "state": "invalid",
            "fieldErrors": [
              {
                "field": "employee",
                "message": "This employee cannot receive an invitation."
              }
            ]
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-3",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "NO_EMAIL",
            "registeredEmailMasked": null,
            "invitationRevision": 0,
            "invitation": null,
            "delivery": "UNAVAILABLE",
            "allowedCommands": [],
            "retryAfterMs": null
          }
        }
      ]
    }
  },
  {
    "name": "unknown",
    "result": {
      "state": "ready",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
      "version": "2",
      "stage": "UNKNOWN",
      "receipt": {
        "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
        "commandKind": "PREPARE_INVITATION_BATCH",
        "committedAt": "2026-11-12T12:00:00+00:00",
        "resultingVersion": "4"
      },
      "items": [
        {
          "employeeId": "EMP-1",
          "operationId": "00000000-0000-8000-8000-000000000001",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000001",
              "invitationId": "10000000-0000-4000-8000-000000000001",
              "revision": 1,
              "employeeId": "EMP-1",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "PROVIDER_ACCEPTED"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-1",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000001",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "PROVIDER_ACCEPTED",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        },
        {
          "employeeId": "EMP-2",
          "operationId": "00000000-0000-8000-8000-000000000002",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000002",
              "invitationId": "10000000-0000-4000-8000-000000000002",
              "revision": 1,
              "employeeId": "EMP-2",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "UNKNOWN"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-2",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000002",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "UNKNOWN",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        },
        {
          "employeeId": "EMP-3",
          "operationId": "00000000-0000-8000-8000-000000000003",
          "commandState": "UNKNOWN",
          "result": null,
          "status": {
            "state": "ready",
            "employeeId": "EMP-3",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 0,
            "invitation": null,
            "delivery": "UNAVAILABLE",
            "allowedCommands": [
              "ISSUE"
            ],
            "retryAfterMs": null
          }
        }
      ]
    }
  },
  {
    "name": "complete",
    "result": {
      "state": "ready",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
      "version": "2",
      "stage": "COMPLETE",
      "receipt": {
        "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
        "commandKind": "PREPARE_INVITATION_BATCH",
        "committedAt": "2026-11-12T12:00:00+00:00",
        "resultingVersion": "4"
      },
      "items": [
        {
          "employeeId": "EMP-1",
          "operationId": "00000000-0000-8000-8000-000000000001",
          "commandState": "SAVED",
          "result": {
            "state": "saved",
            "receipt": {
              "operationId": "00000000-0000-8000-8000-000000000001",
              "invitationId": "10000000-0000-4000-8000-000000000001",
              "revision": 1,
              "employeeId": "EMP-1",
              "action": "ISSUE",
              "committedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "delivery": "PROVIDER_ACCEPTED"
            }
          },
          "status": {
            "state": "ready",
            "employeeId": "EMP-1",
            "employeeVersion": "2026-11-12T12:00:00+00:00",
            "eligibility": "INVITABLE",
            "registeredEmailMasked": "f***@example.invalid",
            "invitationRevision": 1,
            "invitation": {
              "id": "10000000-0000-4000-8000-000000000001",
              "state": "ISSUED",
              "issuedAt": "2026-11-12T12:00:00+00:00",
              "expiresAt": "2026-11-19T12:00:00+00:00",
              "issuerName": "Fictional Owner"
            },
            "delivery": "PROVIDER_ACCEPTED",
            "allowedCommands": [
              "ISSUE",
              "REVOKE"
            ],
            "retryAfterMs": null
          }
        }
      ]
    }
  },
  {
    "name": "unavailable",
    "result": {
      "state": "unavailable"
    }
  }
];

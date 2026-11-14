import type {OnboardingResult} from '../../contracts';

// Fictional browser-safe command outcomes; checked against the current union.
export const commandResults: {name:string;http:number;result:OnboardingResult}[] = [
  {
    "name": "recovered-saved",
    "http": 200,
    "result": {
      "state": "saved",
      "receipt": {
        "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
        "commandKind": "SETUP_BUSINESS",
        "committedAt": "2026-11-12T12:00:00+00:00",
        "resultingVersion": "3"
      },
      "snapshot": {
        "schemaVersion": 1,
        "version": "3",
        "registrationState": "SETUP_IN_PROGRESS",
        "workspace": {
          "id": "170837ce-471d-4c6f-a322-aa73ce9863d6",
          "displayName": "Fictional Example Company",
          "portalUrl": "https://example-company.portal.example.invalid/"
        },
        "sections": [
          {
            "id": "BUSINESS",
            "state": "READY",
            "reasonCodes": [],
            "allowedActions": [
              "OPEN",
              "SAVE"
            ]
          },
          {
            "id": "LOCATIONS",
            "state": "READY",
            "reasonCodes": [],
            "allowedActions": [
              "OPEN",
              "SAVE"
            ]
          },
          {
            "id": "POSITIONS",
            "state": "OPTIONAL",
            "reasonCodes": [
              "POSITIONS_OPTIONAL_UNLESS_REQUIRED"
            ],
            "allowedActions": [
              "OPEN",
              "SAVE"
            ]
          },
          {
            "id": "SCHEDULING",
            "state": "IN_PROGRESS",
            "reasonCodes": [
              "STAFFING_NOT_CONFIGURED",
              "COVERAGE_NOT_CONFIGURED"
            ],
            "allowedActions": [
              "OPEN",
              "SAVE"
            ]
          },
          {
            "id": "PEOPLE",
            "state": "OPTIONAL",
            "reasonCodes": [
              "TEAM_CAN_BE_ADDED_LATER"
            ],
            "allowedActions": [
              "OPEN",
              "SAVE"
            ]
          },
          {
            "id": "INVITATIONS",
            "state": "OPTIONAL",
            "reasonCodes": [
              "DELIVERY_NOT_CONFIGURED"
            ],
            "allowedActions": [
              "OPEN",
              "CHECK_STATUS"
            ]
          },
          {
            "id": "TIME_TRACKING",
            "state": "OPTIONAL",
            "reasonCodes": [
              "TIMEKEEPING_SETUP_REQUIRED"
            ],
            "allowedActions": [
              "OPEN"
            ]
          },
          {
            "id": "PAYROLL",
            "state": "OPTIONAL",
            "reasonCodes": [
              "PAYROLL_DISABLED"
            ],
            "allowedActions": [
              "OPEN"
            ]
          },
          {
            "id": "OPTIONAL_FEATURES",
            "state": "OPTIONAL",
            "reasonCodes": [
              "FEATURES_REQUIRE_EXPLICIT_CONFIGURATION"
            ],
            "allowedActions": [
              "OPEN"
            ]
          }
        ],
        "nextStep": "SCHEDULING"
      }
    }
  },
  {
    "name": "pending",
    "http": 202,
    "result": {
      "state": "pending",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9",
      "stage": "INVITATIONS_REVIEW_STATUS",
      "pollAfterMs": 1000
    }
  },
  {
    "name": "invalid",
    "http": 400,
    "result": {
      "state": "invalid",
      "fieldErrors": [
        {
          "field": "employee",
          "code": "EMPLOYEE_DETAILS_REQUIRED"
        }
      ]
    }
  },
  {
    "name": "stale",
    "http": 409,
    "result": {
      "state": "conflict",
      "reason": "version_changed"
    }
  },
  {
    "name": "changed-replay",
    "http": 409,
    "result": {
      "state": "conflict",
      "reason": "changed_replay"
    }
  },
  {
    "name": "limited",
    "http": 429,
    "result": {
      "state": "limited",
      "retryAfterMs": 60000
    }
  },
  {
    "name": "unavailable",
    "http": 503,
    "result": {
      "state": "unavailable",
      "reasonCode": "SOURCE_UNAVAILABLE"
    }
  },
  {
    "name": "expired-session",
    "http": 401,
    "result": {
      "state": "unavailable",
      "reasonCode": "AUTH_REQUIRED"
    }
  },
  {
    "name": "denied",
    "http": 403,
    "result": {
      "state": "unavailable",
      "reasonCode": "ACCESS_DENIED"
    }
  },
  {
    "name": "outcome-unknown",
    "http": 202,
    "result": {
      "state": "outcome_unknown",
      "operationId": "59f60420-ec96-455a-9292-0b1a416509e9"
    }
  }
];

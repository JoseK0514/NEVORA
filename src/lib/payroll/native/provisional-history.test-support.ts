import type { PayrollRun } from '../contracts';
import type { Snapshot } from '../service';
import type { NativePaystubPresentation } from './paystub-document';
export const approvedHistory = {
  "base": "ababb96e182a417c81e2a5c0638b54cb0d5fd9b8",
  "run": {
    "id": "11111111-1111-4111-8111-111111111111",
    "revision": 2,
    "period": {
      "startDate": "2026-10-05",
      "endDate": "2026-10-11"
    },
    "payday": "2026-10-16",
    "status": "APPROVED",
    "correctionOf": null,
    "rows": [
      {
        "employeeId": "E1",
        "grossMinor": "100000",
        "employeeDeductions": [
          {
            "code": "PR_INCOME_TAX",
            "label": "PR INCOME TAX",
            "amountMinor": "9965"
          },
          {
            "code": "SOCIAL_SECURITY",
            "label": "SOCIAL SECURITY",
            "amountMinor": "6200"
          },
          {
            "code": "MEDICARE",
            "label": "MEDICARE",
            "amountMinor": "1450"
          },
          {
            "code": "ADDITIONAL_MEDICARE",
            "label": "ADDITIONAL MEDICARE",
            "amountMinor": "0"
          },
          {
            "code": "SINOT",
            "label": "SINOT",
            "amountMinor": "300"
          }
        ],
        "employerContributions": [
          {
            "code": "SOCIAL_SECURITY",
            "label": "Employer Social Security",
            "amountMinor": "6200"
          },
          {
            "code": "MEDICARE",
            "label": "Employer Medicare",
            "amountMinor": "1450"
          },
          {
            "code": "SINOT",
            "label": "Employer SINOT",
            "amountMinor": "300"
          }
        ],
        "netMinor": "82085",
        "earnings": [
          {
            "code": "NATIVE_EARNING_1",
            "label": "REGULAR",
            "amountMinor": "100000"
          }
        ],
        "employeeName": "Ángel Vélez"
      }
    ],
    "sourceAuthority": "NATIVE_RECORDED_TIME",
    "importRevision": 0,
    "exceptionRevisions": [],
    "sourceName": "NEVORA actual recorded time",
    "sourceReference": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    "totals": {
      "grossMinor": "100000",
      "netMinor": "82085",
      "deductionsMinor": "17915",
      "employerContributionsMinor": "7950",
      "employeeCount": 1
    },
    "reviewToken": "e4b4640abd3328a5ccbb9d2d6142a5963a922937f586d813fb7cc86a6f808fd3",
    "settingsRevision": null,
    "populationRevision": null,
    "exceptions": [],
    "documents": [],
    "approvedBy": "OWNER",
    "approvedAt": "2026-10-17T12:00:00Z",
    "createdAt": "2026-10-14T18:32:02.252Z",
    "coverage": {
      "complete": true,
      "locationIds": [
        "L1"
      ]
    },
    "nativeCalculation": {
      "version": "NATIVE_RUN_V1",
      "state": "ready",
      "ruleRevision": 1,
      "templateVersion": "NEVORA_NATIVE_PAYSTUB_PDF_V1",
      "employees": [
        {
          "state": "ready",
          "schema": "NEVORA_NATIVE_PAYROLL_RESULT_V1",
          "employeeId": "E1",
          "sourceAuthority": "NATIVE_RECORDED_TIME",
          "currency": "USD",
          "row": {
            "employeeId": "E1",
            "grossMinor": "100000",
            "employeeDeductions": [
              {
                "code": "PR_INCOME_TAX",
                "label": "PR INCOME TAX",
                "amountMinor": "9965"
              },
              {
                "code": "SOCIAL_SECURITY",
                "label": "SOCIAL SECURITY",
                "amountMinor": "6200"
              },
              {
                "code": "MEDICARE",
                "label": "MEDICARE",
                "amountMinor": "1450"
              },
              {
                "code": "ADDITIONAL_MEDICARE",
                "label": "ADDITIONAL MEDICARE",
                "amountMinor": "0"
              },
              {
                "code": "SINOT",
                "label": "SINOT",
                "amountMinor": "300"
              }
            ],
            "employerContributions": [
              {
                "code": "SOCIAL_SECURITY",
                "label": "Employer Social Security",
                "amountMinor": "6200"
              },
              {
                "code": "MEDICARE",
                "label": "Employer Medicare",
                "amountMinor": "1450"
              },
              {
                "code": "SINOT",
                "label": "Employer SINOT",
                "amountMinor": "300"
              }
            ],
            "netMinor": "82085",
            "earnings": [
              {
                "code": "NATIVE_EARNING_1",
                "label": "REGULAR",
                "amountMinor": "100000"
              }
            ]
          },
          "breakdown": {
            "earnings": [
              {
                "code": "NATIVE_EARNING_1",
                "kind": "REGULAR",
                "locationId": "L1",
                "wageProfileId": "W1",
                "wageRevision": 1,
                "rateMinorPerHour": "2500",
                "premiumBasisMinorPerHour": null,
                "nanoseconds": "144000000000000",
                "amountMinor": "100000",
                "exactAmount": {
                  "numerator": "100000",
                  "denominator": "1"
                }
              }
            ],
            "regularNanoseconds": "144000000000000",
            "overtimeNanoseconds": "0",
            "unpaidBreakNanoseconds": "0",
            "locationIds": [
              "L1"
            ],
            "taxYear": 2026,
            "ytdBefore": {
              "year": 2026,
              "revision": 1,
              "evidenceReference": "Fictional signed opening zero",
              "attested": true,
              "grossMinor": "0",
              "netMinor": "0",
              "socialSecurityWagesMinor": "0",
              "medicareWagesMinor": "0",
              "sinotWagesMinor": "0",
              "deductions": {},
              "employerContributions": {},
              "locationIds": [],
              "employerWagesMinor": {
                "FUTA": "0",
                "PR_UI": "0",
                "CFSE": "0"
              },
              "ledgerFingerprint": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            },
            "ytdAfter": {
              "year": 2026,
              "revision": 1,
              "evidenceReference": "Fictional signed opening zero",
              "attested": true,
              "grossMinor": "100000",
              "netMinor": "82085",
              "socialSecurityWagesMinor": "100000",
              "medicareWagesMinor": "100000",
              "sinotWagesMinor": "100000",
              "deductions": {
                "PR_INCOME_TAX": "9965",
                "SOCIAL_SECURITY": "6200",
                "MEDICARE": "1450",
                "ADDITIONAL_MEDICARE": "0",
                "SINOT": "300"
              },
              "employerContributions": {
                "SOCIAL_SECURITY": "6200",
                "MEDICARE": "1450",
                "SINOT": "300"
              },
              "locationIds": [
                "L1"
              ],
              "employerWagesMinor": {
                "FUTA": "100000",
                "PR_UI": "100000",
                "CFSE": "100000"
              },
              "ledgerFingerprint": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            },
            "taxes": [
              {
                "code": "PR_INCOME_TAX",
                "amountMinor": "9965",
                "taxableMinor": "93300",
                "exactAmount": {
                  "numerator": "99650000",
                  "denominator": "10000"
                }
              },
              {
                "code": "SOCIAL_SECURITY",
                "amountMinor": "6200",
                "taxableMinor": "100000",
                "exactAmount": {
                  "numerator": "6200",
                  "denominator": "1"
                }
              },
              {
                "code": "MEDICARE",
                "amountMinor": "1450",
                "taxableMinor": "100000",
                "exactAmount": {
                  "numerator": "1450",
                  "denominator": "1"
                }
              },
              {
                "code": "ADDITIONAL_MEDICARE",
                "amountMinor": "0",
                "taxableMinor": "0",
                "exactAmount": {
                  "numerator": "0",
                  "denominator": "1"
                }
              },
              {
                "code": "SINOT",
                "amountMinor": "300",
                "taxableMinor": "100000",
                "exactAmount": null
              }
            ]
          },
          "provenance": {
            "federalEmployeeTax": {
              "version": "NATIVE_FEDERAL_EMPLOYEE_COLLECTION_V1",
              "ruleId": "26_CFR_31_3102_1_D",
              "operations": [
                {
                  "code": "SOCIAL_SECURITY",
                  "taxableMinor": "100000",
                  "basisPoints": 620,
                  "exactAmount": {
                    "numerator": "6200",
                    "denominator": "1"
                  },
                  "collectedMinor": "6200",
                  "roundingDifference": {
                    "numerator": "0",
                    "denominator": "1"
                  },
                  "ruleId": "26_CFR_31_3102_1_D"
                },
                {
                  "code": "MEDICARE",
                  "taxableMinor": "100000",
                  "basisPoints": 145,
                  "exactAmount": {
                    "numerator": "1450",
                    "denominator": "1"
                  },
                  "collectedMinor": "1450",
                  "roundingDifference": {
                    "numerator": "0",
                    "denominator": "1"
                  },
                  "ruleId": "26_CFR_31_3102_1_D"
                },
                {
                  "code": "ADDITIONAL_MEDICARE",
                  "taxableMinor": "0",
                  "basisPoints": 90,
                  "exactAmount": {
                    "numerator": "0",
                    "denominator": "1"
                  },
                  "collectedMinor": "0",
                  "roundingDifference": {
                    "numerator": "0",
                    "denominator": "1"
                  },
                  "ruleId": "26_CFR_31_3102_1_D"
                }
              ]
            },
            "boundaryEvidence": {
              "version": "NATIVE_BOUNDARY_EVIDENCE_V1",
              "workweekPolicy": {
                "version": "PR_WORKWEEK_POLICY_V1",
                "id": "Fictional-WP1",
                "revision": 1,
                "employeeId": "E1",
                "effectiveFrom": "2026-01-01T00:00:00-04:00",
                "effectiveTo": null,
                "boundary": {
                  "weekday": 1,
                  "startTime": "00:00",
                  "timeZone": "America/Puerto_Rico"
                },
                "federalWorkweek": "SAME_VERIFIED_BOUNDARY",
                "federalEvidenceReference": "Fictional separately documented matching FLSA boundary",
                "origin": {
                  "kind": "EMPLOYER_NOTICE",
                  "noticeReference": "Fictional actual employee-covered initial written notice for component verification only",
                  "deliveredAt": "2025-12-01T12:00:00-04:00",
                  "deliveryMethod": "WRITTEN_EMPLOYEE",
                  "employeeCoverageConfirmed": true,
                  "noticeKind": "INITIAL",
                  "previousPolicyReference": null
                }
              },
              "workweekPolicySha256": "64c2f3b16d5ab6291ffe7742d41aeacd890c91023cd971b880ccafe149cb28af",
              "sourceWindow": {
                "startAt": "2026-09-28T04:01:00Z",
                "endAt": "2026-10-12T04:00:00Z"
              },
              "fullWeekWindow": {
                "startAt": "2026-10-05T04:00:00Z",
                "endAt": "2026-10-12T04:00:00Z"
              },
              "dailyInterpretation": "UNRESOLVED",
              "dailyInputDisposition": "INVARIANT_NO_FIRST_MINUTE_ENTRIES",
              "dailyModels": [
                "CIVIL_MIDNIGHT_24H",
                "CIVIL_00_01_24H"
              ],
              "sourceSha256": "db33b27b180c2f0a82cdecf70b516d89edf0a834d75d9bd27d69e01f30306bf0"
            },
            "inputSha256": "abf31406fb757dfb3194c43438012c7beace140a49066e55f0008bec947920e3",
            "rulesetId": "PR_STANDARD_2026_V1",
            "rulesSha256": "770b3385591c2f5d3811625611791fc2b99ea0fdc33ce0025f1f418eb7e9bfae",
            "rounding": "EXACT_CENT_NO_ROUNDING_REQUIRED",
            "taxRounding": "EXACT_CENT_NO_ROUNDING_REQUIRED",
            "exactnessOperations": [
              {
                "operation": "WAGE_STRAIGHT",
                "reference": "W1",
                "numerator": "20000",
                "denominator": "1",
                "amountMinor": "20000"
              },
              {
                "operation": "WAGE_STRAIGHT",
                "reference": "W1",
                "numerator": "20000",
                "denominator": "1",
                "amountMinor": "20000"
              },
              {
                "operation": "WAGE_STRAIGHT",
                "reference": "W1",
                "numerator": "20000",
                "denominator": "1",
                "amountMinor": "20000"
              },
              {
                "operation": "WAGE_STRAIGHT",
                "reference": "W1",
                "numerator": "20000",
                "denominator": "1",
                "amountMinor": "20000"
              },
              {
                "operation": "WAGE_STRAIGHT",
                "reference": "W1",
                "numerator": "20000",
                "denominator": "1",
                "amountMinor": "20000"
              },
              {
                "operation": "WAGE_PREMIUM",
                "reference": "W1",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "WAGE_PREMIUM",
                "reference": "W1",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "WAGE_PREMIUM",
                "reference": "W1",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "WAGE_PREMIUM",
                "reference": "W1",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "WAGE_PREMIUM",
                "reference": "W1",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "FLSA_WEEKLY_FLOOR",
                "reference": "2026-10-05T04:00:00Z",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "FLSA_PREMIUM_CREDIT",
                "reference": "2026-10-05T04:00:00Z",
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              },
              {
                "operation": "WAGE_GROUP",
                "reference": "",
                "numerator": "100000",
                "denominator": "1",
                "amountMinor": "100000"
              },
              {
                "operation": "EMPLOYER_FICA_SOCIAL_SECURITY",
                "reference": null,
                "numerator": "6200",
                "denominator": "1",
                "amountMinor": "6200"
              },
              {
                "operation": "EMPLOYER_FICA_MEDICARE",
                "reference": null,
                "numerator": "1450",
                "denominator": "1",
                "amountMinor": "1450"
              },
              {
                "operation": "SINOT_EMPLOYEE",
                "reference": null,
                "numerator": "300",
                "denominator": "1",
                "amountMinor": "300"
              },
              {
                "operation": "SINOT_EMPLOYER",
                "reference": null,
                "numerator": "300",
                "denominator": "1",
                "amountMinor": "300"
              },
              {
                "operation": "PR_BASE_PERCENTAGE",
                "reference": null,
                "numerator": "23325",
                "denominator": "1",
                "amountMinor": "23325"
              },
              {
                "operation": "PR_FIXED_EXTRA",
                "reference": null,
                "numerator": "0",
                "denominator": "1",
                "amountMinor": "0"
              }
            ]
          }
        }
      ]
    }
  },
  "snapshot": {
    "source": {
      "roster": [
        {
          "employeeId": "E1",
          "name": "Ángel Vélez",
          "active": true,
          "locationId": "L1"
        }
      ],
      "timecards": {
        "cards": []
      },
      "population": null,
      "settings": [
        {
          "revision": 1,
          "effectiveFrom": "2026-01-01",
          "reason": "Fictional company",
          "actorId": "OWNER",
          "createdAt": "2026-01-01T00:00:00Z",
          "preferences": {
            "companyName": "Compañía Ficticia",
            "language": "es",
            "currency": "USD",
            "schedule": {
              "frequency": "WEEKLY",
              "anchorDate": "2026-01-05",
              "paydayOffsetDays": 5
            },
            "rules": [],
            "automation": {
              "prepare": true,
              "publish": false,
              "reminders": false,
              "reminderLeadDays": []
            },
            "bankProfile": null
          }
        }
      ],
      "exceptions": []
    },
    "settings": {
      "revision": 1,
      "effectiveFrom": "2026-01-01",
      "reason": "Fictional company",
      "actorId": "OWNER",
      "createdAt": "2026-01-01T00:00:00Z",
      "preferences": {
        "companyName": "Compañía Ficticia",
        "language": "es",
        "currency": "USD",
        "schedule": {
          "frequency": "WEEKLY",
          "anchorDate": "2026-01-05",
          "paydayOffsetDays": 5
        },
        "rules": [],
        "automation": {
          "prepare": true,
          "publish": false,
          "reminders": false,
          "reminderLeadDays": []
        },
        "bankProfile": null
      }
    },
    "exceptions": [],
    "amounts": {
      "schema": "NEVORA_PAYROLL_IMPORT_V1",
      "currency": "USD",
      "sourceName": "NEVORA actual recorded time",
      "sourceReference": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "period": {
        "startDate": "2026-10-05",
        "endDate": "2026-10-11"
      },
      "payday": "2026-10-16",
      "rows": [
        {
          "employeeId": "E1",
          "grossMinor": "100000",
          "employeeDeductions": [
            {
              "code": "PR_INCOME_TAX",
              "label": "PR INCOME TAX",
              "amountMinor": "9965"
            },
            {
              "code": "SOCIAL_SECURITY",
              "label": "SOCIAL SECURITY",
              "amountMinor": "6200"
            },
            {
              "code": "MEDICARE",
              "label": "MEDICARE",
              "amountMinor": "1450"
            },
            {
              "code": "ADDITIONAL_MEDICARE",
              "label": "ADDITIONAL MEDICARE",
              "amountMinor": "0"
            },
            {
              "code": "SINOT",
              "label": "SINOT",
              "amountMinor": "300"
            }
          ],
          "employerContributions": [
            {
              "code": "SOCIAL_SECURITY",
              "label": "Employer Social Security",
              "amountMinor": "6200"
            },
            {
              "code": "MEDICARE",
              "label": "Employer Medicare",
              "amountMinor": "1450"
            },
            {
              "code": "SINOT",
              "label": "Employer SINOT",
              "amountMinor": "300"
            }
          ],
          "netMinor": "82085",
          "earnings": [
            {
              "code": "NATIVE_EARNING_1",
              "label": "REGULAR",
              "amountMinor": "100000"
            }
          ]
        }
      ]
    },
    "native": {
      "version": "NATIVE_SNAPSHOT_V1",
      "facts": {
        "inputs": [
          {
            "schema": "NEVORA_NATIVE_PAYROLL_INPUT_V1",
            "employeeId": "E1",
            "period": {
              "startDate": "2026-10-05",
              "endDate": "2026-10-11"
            },
            "payday": "2026-10-16",
            "frequency": "WEEKLY",
            "timeZone": "America/Puerto_Rico",
            "timecards": [
              {
                "employeeId": "E1",
                "period": {
                  "startDate": "2026-09-28",
                  "endDate": "2026-10-11"
                },
                "revision": 2,
                "state": "FINALIZED",
                "sourceHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "finalizedSourceHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "pendingCorrections": 0,
                "entries": [
                  {
                    "id": "DOC5",
                    "locationId": "L1",
                    "startAt": "2026-10-05T08:00:00-04:00",
                    "endAt": "2026-10-05T16:00:00-04:00",
                    "sourceKind": "RECORDED",
                    "recordedVersion": 1,
                    "adjustmentId": null,
                    "breaks": []
                  },
                  {
                    "id": "DOC6",
                    "locationId": "L1",
                    "startAt": "2026-10-06T08:00:00-04:00",
                    "endAt": "2026-10-06T16:00:00-04:00",
                    "sourceKind": "RECORDED",
                    "recordedVersion": 1,
                    "adjustmentId": null,
                    "breaks": []
                  },
                  {
                    "id": "DOC7",
                    "locationId": "L1",
                    "startAt": "2026-10-07T08:00:00-04:00",
                    "endAt": "2026-10-07T16:00:00-04:00",
                    "sourceKind": "RECORDED",
                    "recordedVersion": 1,
                    "adjustmentId": null,
                    "breaks": []
                  },
                  {
                    "id": "DOC8",
                    "locationId": "L1",
                    "startAt": "2026-10-08T08:00:00-04:00",
                    "endAt": "2026-10-08T16:00:00-04:00",
                    "sourceKind": "RECORDED",
                    "recordedVersion": 1,
                    "adjustmentId": null,
                    "breaks": []
                  },
                  {
                    "id": "DOC9",
                    "locationId": "L1",
                    "startAt": "2026-10-09T08:00:00-04:00",
                    "endAt": "2026-10-09T16:00:00-04:00",
                    "sourceKind": "RECORDED",
                    "recordedVersion": 1,
                    "adjustmentId": null,
                    "breaks": []
                  }
                ]
              }
            ],
            "wages": [
              {
                "id": "W1",
                "revision": 1,
                "effectiveFrom": "2026-01-01T00:00:00-04:00",
                "effectiveTo": null,
                "locationIds": [
                  "L1"
                ],
                "hourlyRateMinor": "2500",
                "compensation": "HOURLY",
                "employment": "PR_PRIVATE_NONEXEMPT",
                "minimumWageCoverage": "PR_ACT_47_STANDARD_2026",
                "overtime": "TIME_AND_HALF",
                "dailyBasis": "CALENDAR_DAY",
                "workweekAnchorDate": "2026-01-05",
                "workweekStartTime": "00:00",
                "workweekPolicy": {
                  "version": "PR_WORKWEEK_POLICY_V1",
                  "id": "Fictional-WP1",
                  "revision": 1,
                  "employeeId": "E1",
                  "effectiveFrom": "2026-01-01T00:00:00-04:00",
                  "effectiveTo": null,
                  "boundary": {
                    "weekday": 1,
                    "startTime": "00:00",
                    "timeZone": "America/Puerto_Rico"
                  },
                  "federalWorkweek": "SAME_VERIFIED_BOUNDARY",
                  "federalEvidenceReference": "Fictional separately documented matching FLSA boundary",
                  "origin": {
                    "kind": "EMPLOYER_NOTICE",
                    "noticeReference": "Fictional actual employee-covered initial written notice for component verification only",
                    "deliveredAt": "2025-12-01T12:00:00-04:00",
                    "deliveryMethod": "WRITTEN_EMPLOYEE",
                    "employeeCoverageConfirmed": true,
                    "noticeKind": "INITIAL",
                    "previousPolicyReference": null
                  }
                },
                "overtimeBasis": "WEIGHTED_WEEKLY",
                "wageCentRounding": "UNVERIFIED",
                "breakRules": [
                  {
                    "typeId": "REST",
                    "treatment": "PAID_REST"
                  },
                  {
                    "typeId": "MEAL",
                    "treatment": "UNPAID_RELIEVED_MEAL"
                  }
                ],
                "standardContextAttested": true,
                "evidenceReference": "Fictional signed wage/context attestation"
              }
            ],
            "tax": {
              "id": "TAX1",
              "revision": 1,
              "effectiveFrom": "2026-01-01",
              "effectiveTo": null,
              "coverage": "PR_REGULAR_TAXABLE_RESIDENT",
              "certificate": {
                "personal": "INDIVIDUAL_FULL",
                "fullDependents": 0,
                "halfDependents": 0,
                "deductionAllowances": 0,
                "veteran": false,
                "additionalMethod": "FIXED",
                "additionalBasisPoints": null,
                "wageDollarRounding": "NONE",
                "additionalMinor": "0"
              },
              "certificateReference": "Fictional signed 499R4",
              "ficaCoverage": "STANDARD",
              "sinotCoverage": "STANDARD",
              "sinotEmployeeBasisPoints": 30,
              "prCentRounding": "UNVERIFIED",
              "ruleEvidenceReference": null,
              "employerContributions": [
                {
                  "code": "FUTA",
                  "label": "FUTA",
                  "applicability": "EXEMPT",
                  "basisPoints": null,
                  "capMinor": null,
                  "wagesBeforeMinor": "0",
                  "evidenceReference": "Fictional specifically verified exemption FUTA"
                },
                {
                  "code": "PR_UI",
                  "label": "PR_UI",
                  "applicability": "EXEMPT",
                  "basisPoints": null,
                  "capMinor": null,
                  "wagesBeforeMinor": "0",
                  "evidenceReference": "Fictional specifically verified exemption PR_UI"
                },
                {
                  "code": "CFSE",
                  "label": "CFSE",
                  "applicability": "EXEMPT",
                  "basisPoints": null,
                  "capMinor": null,
                  "wagesBeforeMinor": "0",
                  "evidenceReference": "Fictional specifically verified exemption CFSE"
                }
              ],
              "employerCoverageAttested": true
            },
            "ytd": {
              "year": 2026,
              "revision": 1,
              "evidenceReference": "Fictional signed opening zero",
              "attested": true,
              "grossMinor": "0",
              "netMinor": "0",
              "socialSecurityWagesMinor": "0",
              "medicareWagesMinor": "0",
              "sinotWagesMinor": "0",
              "deductions": {},
              "employerContributions": {},
              "locationIds": [],
              "employerWagesMinor": {
                "FUTA": "0",
                "PR_UI": "0",
                "CFSE": "0"
              },
              "ledgerFingerprint": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            },
            "deductions": []
          }
        ],
        "population": [
          {
            "employeeId": "E1",
            "name": "Ángel Vélez",
            "disposition": "INCLUDE"
          }
        ],
        "sourceFingerprint": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "ruleRevision": 1,
        "rulesVerified": true,
        "employeeLocations": {
          "E1": [
            "L1"
          ]
        },
        "unknownCoverageEmployeeIds": []
      },
      "employeeCoverage": {
        "E1": {
          "complete": true,
          "locationIds": [
            "L1"
          ]
        }
      },
      "originalRunId": "11111111-1111-4111-8111-111111111111",
      "calculationVersion": "NEVORA_NATIVE_WAGE_V9_OWNER_ATTESTED_PR_PERIODIC_CENTS",
      "ruleEvidence": {
        "status": "EXACT_CENT_NO_ROUNDING_REQUIRED",
        "assessmentSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    }
  },
  "presentation": {
    "version": "NEVORA_NATIVE_PAYSTUB_PRESENTATION_V1",
    "templateVersion": "NEVORA_NATIVE_PAYSTUB_PDF_V1",
    "sourceAuthority": "NATIVE_RECORDED_TIME",
    "currency": "USD",
    "language": "es",
    "companyName": "Compañía Ficticia",
    "employeeName": "Ángel Vélez",
    "employeeReference": "E1",
    "period": {
      "startDate": "2026-10-05",
      "endDate": "2026-10-11"
    },
    "payDate": "2026-10-16",
    "approvedAt": "2026-10-17T12:00:00Z",
    "runReference": "11111111-1111-4111-8111-111111111111",
    "runRevision": 2,
    "correction": {
      "kind": "ORIGINAL"
    },
    "ytdYear": 2026,
    "earnings": [
      {
        "label": "Horas regulares",
        "kind": "REGULAR",
        "amountMinor": "100000",
        "work": {
          "nanoseconds": "144000000000000",
          "baseRateMinorPerHour": {
            "numerator": "2500",
            "denominator": "1"
          },
          "premiumRateMinorPerHour": {
            "numerator": "0",
            "denominator": "1"
          },
          "paidRateMinorPerHour": {
            "numerator": "2500",
            "denominator": "1"
          }
        }
      }
    ],
    "taxes": [
      {
        "label": "Medicare adicional",
        "amount": {
          "currentMinor": "0",
          "ytdMinor": "0"
        }
      },
      {
        "label": "Medicare",
        "amount": {
          "currentMinor": "1450",
          "ytdMinor": "1450"
        }
      },
      {
        "label": "Contribución sobre ingresos de Puerto Rico",
        "amount": {
          "currentMinor": "9965",
          "ytdMinor": "9965"
        }
      },
      {
        "label": "Seguro por incapacidad (SINOT)",
        "amount": {
          "currentMinor": "300",
          "ytdMinor": "300"
        }
      },
      {
        "label": "Seguro Social",
        "amount": {
          "currentMinor": "6200",
          "ytdMinor": "6200"
        }
      }
    ],
    "authorizedDeductions": [],
    "totals": {
      "gross": {
        "currentMinor": "100000",
        "ytdMinor": "100000"
      },
      "taxes": {
        "currentMinor": "17915",
        "ytdMinor": "17915"
      },
      "authorizedDeductions": {
        "currentMinor": "0",
        "ytdMinor": "0"
      },
      "net": {
        "currentMinor": "82085",
        "ytdMinor": "82085"
      }
    },
    "employerContributions": {
      "lines": [
        {
          "label": "Medicare",
          "amount": {
            "currentMinor": "1450",
            "ytdMinor": "1450"
          }
        },
        {
          "label": "Seguro por incapacidad (SINOT)",
          "amount": {
            "currentMinor": "300",
            "ytdMinor": "300"
          }
        },
        {
          "label": "Seguro Social",
          "amount": {
            "currentMinor": "6200",
            "ytdMinor": "6200"
          }
        }
      ],
      "total": {
        "currentMinor": "7950",
        "ytdMinor": "7950"
      }
    },
    "sourceReferences": [
      {
        "label": "Referencia de nómina aprobada",
        "value": "11111111-1111-4111-8111-111111111111 / 2"
      }
    ]
  },
  "pdfSha256": "f0a3c7715c338d72a30c6e18ce12a85b38e8948396048c62dddbe12a115310bf"
} satisfies { base: string; run: PayrollRun; snapshot: Snapshot; presentation: NativePaystubPresentation; pdfSha256: string };

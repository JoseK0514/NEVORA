import { createHash } from 'node:crypto';
/** Migration planning only. These types cannot grant customer or control-plane authority. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type EvidenceLocation = { path: string; line: number };
export type ReferenceRule = { columns: string[]; target: string; targetColumns: string[]; historical: boolean; source: EvidenceLocation };
export type ObservedTable = { table: string; source: EvidenceLocation; columns: { name: string; type: string; nullable: boolean }[]; primaryKey: string[]; declaredKeys: { kind: string; columns: string[]; name: string | null }[]; references: ReferenceRule[] };
export type OwnershipAnchor = { kind: 'ROOT'; column: string } | { kind: 'DIRECT'; column: string } | { kind: 'CAPTURED_IMMUTABLE' } | { kind: 'INSTALLATION_PROVENANCE' } | { kind: 'PARENT'; columns: string[]; target: string; targetColumns: string[] } | { kind: 'TYPED_SCOPE'; discriminator: string; identifier: string } | { kind: 'GLOBAL_SECURITY_CONTROL' };
export type OwnershipStorage = 'DIRECT_IMMUTABLE' | 'IMMUTABLE_PARENT' | 'TYPED_HISTORICAL_SIDECAR' | 'GLOBAL_SECURITY_CONTROL';
export type PayloadContract = { column: string; type: 'JSON' | 'ARRAY'; contractId: string; source: EvidenceLocation; treatment: 'COMPLETE_TYPED_LEAF_CAPTURE'; historical: boolean };
export type TableOwnership = ObservedTable & { anchor: OwnershipAnchor; storage: OwnershipStorage; sidecar: string | null; mirroredIdentityColumns: string[]; payloads: PayloadContract[]; typedFields: string[]; globalFences: string[] };
export type MigrationSource = { path: string; text: string };
export type OwnershipRegistry = { version: 1; schemaCommit: string; schemaTree: string; schemaDigest: string; digest: string; tables: TableOwnership[]; semantics: 'SOURCE_BOUND_MIGRATION_CONTRACT_NOT_DEPLOYED_CATALOG' };
export type OwnershipDiagnostic = { code: string; table?: string; key?: JsonValue[]; field?: string; detail: string };
export const OWNERSHIP_SCHEMA_COMMIT = '7c628e374f03c9025b2c0cfd3568be033f07238d';
export const OWNERSHIP_SCHEMA_TREE = '5a2df7788b4a5f52b77b1273bedd59e191438379';
/** Only lossless own JSON data is accepted. Descriptor inspection never invokes
 * capture accessors; arrays must be dense, ordinary and free of ignored fields. */
export function canonicalOwnershipJson(value: unknown): string {
 const ancestors=new Set<object>();
 const unsupported=():never=>{throw new Error('Unsupported migration capture value');};
 function encode(current:unknown):string{
  if(current===null||typeof current==='boolean'||typeof current==='string')return JSON.stringify(current);
  if(typeof current==='number'&&Number.isFinite(current))return JSON.stringify(current);
  if(typeof current!=='object'||!current||ancestors.has(current))return unsupported();
  const array=Array.isArray(current);
  if(Object.getPrototypeOf(current)!==(array?Array.prototype:Object.prototype))return unsupported();
  const keys=Reflect.ownKeys(current),descriptors=Object.getOwnPropertyDescriptors(current);
  if(keys.some(k=>typeof k!=='string'))return unsupported();
  ancestors.add(current);
  try{
   if(array){
    const length=descriptors.length;
    if(!length||!('value' in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)return unsupported();
    const values:string[]=[];
    for(let i=0;i<length.value;i++){
     const descriptor=descriptors[String(i)];
     if(!descriptor||!('value' in descriptor)||!descriptor.enumerable)return unsupported();
     values.push(encode(descriptor.value));
    }
    return '['+values.join(',')+']';
   }
   return '{'+(keys as string[]).sort().map(k=>{
    const descriptor=descriptors[k];
    if(!descriptor||!('value' in descriptor)||!descriptor.enumerable)return unsupported();
    return JSON.stringify(k)+':'+encode(descriptor.value);
   }).join(',')+'}';
  }finally{ancestors.delete(current);}
 }
 return encode(value);
}
export function ownershipDigest(value: unknown): string { return createHash('sha256').update(canonicalOwnershipJson(value)).digest('hex'); }
export const OWNERSHIP_SOURCE = [
 {
  "path": "db/migrations/0001_initial.sql",
  "sha256": "330e125060422506f92403307224b739b73f5fc8697ed43039b22e56bcba61a1"
 },
 {
  "path": "db/migrations/0002_schedule_health.sql",
  "sha256": "0dd019d1658c22763d11531ef72b39db9e5a106bb418b1a4fc63f5caaff7f9f0"
 },
 {
  "path": "db/migrations/0003_schedule_assistance.sql",
  "sha256": "d82513ab58c0e8a84f976a05c2be0e342309467c586ded8347cce4ef9001900a"
 },
 {
  "path": "db/migrations/0004_assistance_layer.sql",
  "sha256": "c0263d1e40bbfe3aa646a4740b0fe345728783eac39dfda916495ccf7a1ab7e5"
 },
 {
  "path": "db/migrations/0005_time_clock.sql",
  "sha256": "fc4afbdf4770bd7a3a718cd54fd204bc8df1b96296c04cb676dab3f4f6d0c4e5"
 },
 {
  "path": "db/migrations/0006_scheduling_rule_inputs.sql",
  "sha256": "4a0eb437395a5f4d1873c9b06b3c1104da5a23319e968d422a5a14f3c310483a"
 },
 {
  "path": "db/migrations/0007_portal_web_push.sql",
  "sha256": "020c45cbeb1c5000be22b3ce240f94225fc0c88471e540a67246dd54085440d2"
 },
 {
  "path": "db/migrations/0008_workspace_positions.sql",
  "sha256": "f517e18d468556c25814141a959427c969f620fa4ac6e98cc709b31ee1d88756"
 },
 {
  "path": "db/migrations/0009_schedule_generation.sql",
  "sha256": "aadde6a1f5d3167ed4f346817d1feeb0c9f99f28d50adcf904a989b86120f007"
 },
 {
  "path": "db/migrations/0010_shift_coverage_automation.sql",
  "sha256": "0d8b55abe49995204bda9e63492026158b91b8dc4ca414d05c77b595a6474d8e"
 },
 {
  "path": "db/migrations/0011_clocker_devices.sql",
  "sha256": "788b748bbbd995c44f40d130ea079296aa3e6affcad86c78cbb3857e866c0cd0"
 },
 {
  "path": "db/migrations/0012_clocker_pins.sql",
  "sha256": "9b607ca2e9e111953695ba5cf1a1dbc87f65ae483caeccc3d8056f19aab8c90f"
 },
 {
  "path": "db/migrations/0013_clocker_punches.sql",
  "sha256": "f222d8b52e5cace6698f22b8d4a10fa5ffcd93db1d8c7d5cfd551a02b74216e5"
 },
 {
  "path": "db/migrations/0014_clocker_breaks.sql",
  "sha256": "c20cd86b16fe2f82c05b69687402c52f37a648eb1d79c8f1418436ed8e4c5508"
 },
 {
  "path": "db/migrations/0015_clocker_schedule_context.sql",
  "sha256": "5b5160bff760e17d4e235c35e4936271fba0b8124f5da8a8989e01478fff6796"
 },
 {
  "path": "db/migrations/0016_time_corrections.sql",
  "sha256": "36532a3efc7c641a96b447f5caf2efbd3c4184cbfae2c6e080b548fa3fac4b35"
 },
 {
  "path": "db/migrations/0017_missing_time_supersession.sql",
  "sha256": "2a35c4e3180c3294c7197af56415b231bf66a0b30417000e08de17d161ef8fea"
 },
 {
  "path": "db/migrations/0018_timecards.sql",
  "sha256": "0221827d5faa0670a85661b6a15e59882382703a42bb9800576c30a1f66c1a81"
 },
 {
  "path": "db/migrations/0019_payroll_export_mappings.sql",
  "sha256": "1610d1018824ec84ba9cdbe2f42f3ae36c12ba509a735ea10dce3ee21b594262"
 },
 {
  "path": "db/migrations/0020_account_recovery.sql",
  "sha256": "26bc594863f1950588250be50a1ae66ba2191f90e8a908aea6a41a6ac76c61db"
 },
 {
  "path": "db/migrations/0021_timecard_reassignment_interlock.sql",
  "sha256": "c5e9f1df923c67d4764427cca9f005fed93a4cb148c4a469866d15d4253b4918"
 },
 {
  "path": "db/migrations/0022_timecard_reopen_revision_authority.sql",
  "sha256": "616dc741d8b48679b05958cfbd9dcf3ece018a356892034f2f1ad6a644ba584b"
 },
 {
  "path": "db/migrations/0023_employee_attention_receipts.sql",
  "sha256": "2758fd0dd5567839537483bb49eba8f4e5618b67a9a77c1deccf0e550cefcef1"
 },
 {
  "path": "db/migrations/0024_contextual_communications.sql",
  "sha256": "f130df4238379aa50347decbc863c51f37b108a9f5975b49ca8696b49fc08277"
 },
 {
  "path": "db/migrations/0025_calendar_subscriptions.sql",
  "sha256": "357bce5c806af4f3f0d9ff8a5b48e09a90b1342e8168206efce4f949072d824b"
 }
] as const;
/** Observed explicit DDL only; no function/trigger/catalog effect is guessed from this snapshot. */
const OBSERVED_TABLES: ObservedTable[] = [
 {
  "table": "locations",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "short_name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "clocker_key",
    "type": "text",
    "nullable": false
   },
   {
    "name": "calendar_serial",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "calendar_modified_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "clocker_key"
    ],
    "name": "location_clocker_key_unique"
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "id"
    ],
    "name": "communication_location_workspace_key"
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 16
    }
   }
  ]
 },
 {
  "table": "employees",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 18
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "first_name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "last_name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "phone",
    "type": "text",
    "nullable": false
   },
   {
    "name": "email",
    "type": "text",
    "nullable": true
   },
   {
    "name": "role",
    "type": "text",
    "nullable": false
   },
   {
    "name": "primary_location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "primary_location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 18
    }
   }
  ]
 },
 {
  "table": "employee_location_eligibility",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 35
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   }
  ],
  "primaryKey": [
   "employee_id",
   "location_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id",
     "location_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 35
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 35
    }
   }
  ]
 },
 {
  "table": "employee_credentials",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 41
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "password_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "must_change_password",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "password_updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 41
    }
   }
  ]
 },
 {
  "table": "employee_sessions",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 48
  },
  "columns": [
   {
    "name": "token_hash",
    "type": "char(64)",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "token_hash"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "token_hash"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 48
    }
   }
  ]
 },
 {
  "table": "availability_windows",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 60
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "day_of_week",
    "type": "smallint",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 60
    }
   }
  ]
 },
 {
  "table": "availability_exceptions",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 72
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": true
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": true
   },
   {
    "name": "note",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 72
    }
   }
  ]
 },
 {
  "table": "time_off_requests",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 87
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "start_date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "end_date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": true
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": true
   },
   {
    "name": "reason",
    "type": "text",
    "nullable": true
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "reviewed_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "reviewed_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 87
    }
   },
   {
    "columns": [
     "reviewed_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 87
    }
   }
  ]
 },
 {
  "table": "schedules",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 111
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "published_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "published_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "location_id",
     "week_start"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 111
    }
   },
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 111
    }
   },
   {
    "columns": [
     "published_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 111
    }
   }
  ]
 },
 {
  "table": "shifts",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 125
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "schedule_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "notes",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "is_designated_lead",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "assignment_origin",
    "type": "text",
    "nullable": false
   },
   {
    "name": "generated_claims",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "assignment_episode_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "terms_revision",
    "type": "integer",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "schedule_id"
    ],
    "target": "schedules",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 125
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 125
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 54
    }
   }
  ]
 },
 {
  "table": "shift_exchanges",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 143
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_shift_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "requested_by_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "target_employee_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "target_shift_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "resolved_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "resolved_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "request_revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "legacy_manual",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "requester_consent",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "target_consent",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "source_terms",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "target_terms",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "submission_deadline",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "completion_deadline",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "policy_revision",
    "type": "integer",
    "nullable": true
   },
   {
    "name": "recorded_approval_mode",
    "type": "text",
    "nullable": true
   },
   {
    "name": "outcome_mode",
    "type": "text",
    "nullable": true
   },
   {
    "name": "outcome_reason",
    "type": "text",
    "nullable": true
   },
   {
    "name": "prior_request_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "linked_callout_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "escalated_at",
    "type": "timestamptz",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "source_shift_id"
    ],
    "target": "shifts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 143
    }
   },
   {
    "columns": [
     "requested_by_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 143
    }
   },
   {
    "columns": [
     "target_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 143
    }
   },
   {
    "columns": [
     "target_shift_id"
    ],
    "target": "shifts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 143
    }
   },
   {
    "columns": [
     "resolved_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 143
    }
   }
  ]
 },
 {
  "table": "notifications",
  "source": {
   "path": "db/migrations/0001_initial.sql",
   "line": 182
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "type",
    "type": "text",
    "nullable": false
   },
   {
    "name": "title",
    "type": "text",
    "nullable": false
   },
   {
    "name": "body",
    "type": "text",
    "nullable": false
   },
   {
    "name": "read_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "action_href",
    "type": "text",
    "nullable": true
   },
   {
    "name": "event_key",
    "type": "text",
    "nullable": true
   },
   {
    "name": "environment",
    "type": "text",
    "nullable": true
   },
   {
    "name": "source_kind",
    "type": "text",
    "nullable": true
   },
   {
    "name": "source_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "source_version",
    "type": "text",
    "nullable": true
   },
   {
    "name": "effective_version",
    "type": "text",
    "nullable": true
   },
   {
    "name": "purpose",
    "type": "text",
    "nullable": true
   },
   {
    "name": "due_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "urgency",
    "type": "text",
    "nullable": true
   },
   {
    "name": "cancelled_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "push_state",
    "type": "text",
    "nullable": false
   },
   {
    "name": "item_keys",
    "type": "text[]",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0001_initial.sql",
     "line": 182
    }
   }
  ]
 },
 {
  "table": "location_staffing_settings",
  "source": {
   "path": "db/migrations/0002_schedule_health.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "minimum_staff_per_shift",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "requires_designated_lead",
    "type": "boolean",
    "nullable": false
   }
  ],
  "primaryKey": [
   "location_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "location_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0002_schedule_health.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "employee_scheduling_settings",
  "source": {
   "path": "db/migrations/0002_schedule_health.sql",
   "line": 18
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "target_weekly_hours",
    "type": "numeric(5,2)",
    "nullable": true
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "maximum_weekly_hours",
    "type": "numeric(5,2)",
    "nullable": false
   },
   {
    "name": "operational_rule_profile",
    "type": "jsonb",
    "nullable": true
   }
  ],
  "primaryKey": [
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0002_schedule_health.sql",
     "line": 18
    }
   }
  ]
 },
 {
  "table": "location_coverage_windows",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 9
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "day_of_week",
    "type": "smallint",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "minimum_staff",
    "type": "integer",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "location_id",
     "day_of_week",
     "start_time",
     "end_time"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 9
    }
   }
  ]
 },
 {
  "table": "schedule_week_settings",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 23
  },
  "columns": [
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "availability_deadline",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "updated_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "week_start"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "week_start"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "updated_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 23
    }
   }
  ]
 },
 {
  "table": "weekly_availability_windows",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 30
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "day_of_week",
    "type": "smallint",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 30
    }
   }
  ]
 },
 {
  "table": "shift_callouts",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 44
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "shift_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "reason_code",
    "type": "text",
    "nullable": false
   },
   {
    "name": "reason_note",
    "type": "text",
    "nullable": true
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "reviewed_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "reviewed_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "request_revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "legacy_manual",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "assignment_episode_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "reviewed_terms_fingerprint",
    "type": "text",
    "nullable": true
   },
   {
    "name": "source_terms",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "outcome_reason",
    "type": "text",
    "nullable": true
   },
   {
    "name": "linked_coverage_request_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "escalated_at",
    "type": "timestamptz",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "shift_id"
    ],
    "target": "shifts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 44
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 44
    }
   },
   {
    "columns": [
     "reviewed_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 44
    }
   }
  ]
 },
 {
  "table": "schedule_acknowledgements",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 75
  },
  "columns": [
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "acknowledged_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "publication_revision_id",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "week_start",
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "week_start",
     "employee_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 75
    }
   },
   {
    "columns": [
     "publication_revision_id"
    ],
    "target": "schedule_publication_revisions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0004_assistance_layer.sql",
     "line": 52
    }
   }
  ]
 },
 {
  "table": "schedule_templates",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 82
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 82
    }
   }
  ]
 },
 {
  "table": "schedule_template_shifts",
  "source": {
   "path": "db/migrations/0003_schedule_assistance.sql",
   "line": 95
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "template_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "day_offset",
    "type": "smallint",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "is_designated_lead",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "notes",
    "type": "text",
    "nullable": true
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "template_id"
    ],
    "target": "schedule_templates",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 95
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 95
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0003_schedule_assistance.sql",
     "line": 95
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 55
    }
   }
  ]
 },
 {
  "table": "weekly_availability_submissions",
  "source": {
   "path": "db/migrations/0004_assistance_layer.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "submitted_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "uses_normal_availability",
    "type": "boolean",
    "nullable": false
   }
  ],
  "primaryKey": [
   "week_start",
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "week_start",
     "employee_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0004_assistance_layer.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "schedule_publication_revisions",
  "source": {
   "path": "db/migrations/0004_assistance_layer.sql",
   "line": 11
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "revision_number",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "source_type",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "affected_location_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "calendar_serial",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "calendar_modified_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "week_start",
     "revision_number"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "affected_location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0004_assistance_layer.sql",
     "line": 11
    }
   },
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0004_assistance_layer.sql",
     "line": 11
    }
   }
  ]
 },
 {
  "table": "schedule_publication_revision_shifts",
  "source": {
   "path": "db/migrations/0004_assistance_layer.sql",
   "line": 28
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "revision_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_shift_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "schedule_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "start_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "end_time",
    "type": "time",
    "nullable": false
   },
   {
    "name": "notes",
    "type": "text",
    "nullable": true
   },
   {
    "name": "is_designated_lead",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "is_callout_approved",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "position_name",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "revision_id"
    ],
    "target": "schedule_publication_revisions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0004_assistance_layer.sql",
     "line": 28
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 56
    }
   }
  ]
 },
 {
  "table": "clocker_devices",
  "source": {
   "path": "db/migrations/0005_time_clock.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "last_seen_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "credential_hash",
    "type": "text",
    "nullable": true
   },
   {
    "name": "credential_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "enrollment_hash",
    "type": "text",
    "nullable": true
   },
   {
    "name": "enrollment_expires_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "enrollment_owner_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "enrollment_session_hash",
    "type": "text",
    "nullable": true
   },
   {
    "name": "enrolled_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "revoked_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "id",
     "location_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0005_time_clock.sql",
     "line": 3
    }
   },
   {
    "columns": [
     "enrollment_owner_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0011_clocker_devices.sql",
     "line": 8
    }
   }
  ]
 },
 {
  "table": "time_entries",
  "source": {
   "path": "db/migrations/0005_time_clock.sql",
   "line": 12
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "device_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "clock_in_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "clock_out_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "schedule_context",
    "type": "jsonb",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0005_time_clock.sql",
     "line": 12
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0005_time_clock.sql",
     "line": 12
    }
   },
   {
    "columns": [
     "device_id",
     "location_id"
    ],
    "target": "clocker_devices",
    "targetColumns": [
     "id",
     "location_id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0005_time_clock.sql",
     "line": 12
    }
   }
  ]
 },
 {
  "table": "break_entries",
  "source": {
   "path": "db/migrations/0005_time_clock.sql",
   "line": 35
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "time_entry_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "break_start_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "break_end_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "break_type_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "break_type_snapshot",
    "type": "jsonb",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "time_entry_id"
    ],
    "target": "time_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0005_time_clock.sql",
     "line": 35
    }
   },
   {
    "columns": [
     "break_type_id"
    ],
    "target": "clocker_break_types",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 28
    }
   }
  ]
 },
 {
  "table": "push_subscriptions",
  "source": {
   "path": "db/migrations/0007_portal_web_push.sql",
   "line": 36
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "installation_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "environment",
    "type": "text",
    "nullable": false
   },
   {
    "name": "endpoint_fingerprint",
    "type": "text",
    "nullable": false
   },
   {
    "name": "encrypted_material",
    "type": "text",
    "nullable": true
   },
   {
    "name": "generation",
    "type": "text",
    "nullable": false
   },
   {
    "name": "session_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "consent_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "last_test_at",
    "type": "timestamptz",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "installation_hash",
     "environment"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0007_portal_web_push.sql",
     "line": 36
    }
   }
  ]
 },
 {
  "table": "push_deliveries",
  "source": {
   "path": "db/migrations/0007_portal_web_push.sql",
   "line": 61
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "notification_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "subscription_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "generation",
    "type": "text",
    "nullable": false
   },
   {
    "name": "status",
    "type": "text",
    "nullable": false
   },
   {
    "name": "attempt_count",
    "type": "smallint",
    "nullable": false
   },
   {
    "name": "next_attempt_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "lease_token",
    "type": "text",
    "nullable": true
   },
   {
    "name": "lease_expires_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "accepted_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "error_class",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "notification_id",
     "subscription_id",
     "generation"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "notification_id"
    ],
    "target": "notifications",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0007_portal_web_push.sql",
     "line": 61
    }
   },
   {
    "columns": [
     "subscription_id"
    ],
    "target": "push_subscriptions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0007_portal_web_push.sql",
     "line": 61
    }
   }
  ]
 },
 {
  "table": "workspaces",
  "source": {
   "path": "db/migrations/0008_workspace_positions.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "time_zone",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "singleton",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "shift_change_policy",
    "type": "jsonb",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "singleton"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "positions",
  "source": {
   "path": "db/migrations/0008_workspace_positions.sql",
   "line": 34
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 34
    }
   }
  ]
 },
 {
  "table": "employee_positions",
  "source": {
   "path": "db/migrations/0008_workspace_positions.sql",
   "line": 43
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": false
   }
  ],
  "primaryKey": [
   "employee_id",
   "position_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id",
     "position_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 43
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 43
    }
   }
  ]
 },
 {
  "table": "coverage_window_position_requirements",
  "source": {
   "path": "db/migrations/0008_workspace_positions.sql",
   "line": 48
  },
  "columns": [
   {
    "name": "coverage_window_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "quantity",
    "type": "integer",
    "nullable": false
   }
  ],
  "primaryKey": [
   "coverage_window_id",
   "position_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "coverage_window_id",
     "position_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "coverage_window_id"
    ],
    "target": "location_coverage_windows",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 48
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0008_workspace_positions.sql",
     "line": 48
    }
   }
  ]
 },
 {
  "table": "schedule_generation_exclusions",
  "source": {
   "path": "db/migrations/0009_schedule_generation.sql",
   "line": 36
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "week_start",
    "type": "date",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "assignment_start",
    "type": "timestamp",
    "nullable": false
   },
   {
    "name": "assignment_end",
    "type": "timestamp",
    "nullable": false
   },
   {
    "name": "position_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "claims",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "deleted_source_shift_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "cleared_by",
    "type": "text",
    "nullable": true
   },
   {
    "name": "cleared_at",
    "type": "timestamptz",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0009_schedule_generation.sql",
     "line": 36
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0009_schedule_generation.sql",
     "line": 36
    }
   },
   {
    "columns": [
     "position_id"
    ],
    "target": "positions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0009_schedule_generation.sql",
     "line": 36
    }
   },
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0009_schedule_generation.sql",
     "line": 36
    }
   },
   {
    "columns": [
     "cleared_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0009_schedule_generation.sql",
     "line": 36
    }
   }
  ]
 },
 {
  "table": "shift_change_participation",
  "source": {
   "path": "db/migrations/0010_shift_coverage_automation.sql",
   "line": 103
  },
  "columns": [
   {
    "name": "shift_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "exchange_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "callout_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "role",
    "type": "text",
    "nullable": false
   }
  ],
  "primaryKey": [
   "shift_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "shift_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "shift_id"
    ],
    "target": "shifts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0010_shift_coverage_automation.sql",
     "line": 103
    }
   },
   {
    "columns": [
     "exchange_id"
    ],
    "target": "shift_exchanges",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0010_shift_coverage_automation.sql",
     "line": 103
    }
   },
   {
    "columns": [
     "callout_id"
    ],
    "target": "shift_callouts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0010_shift_coverage_automation.sql",
     "line": 103
    }
   }
  ]
 },
 {
  "table": "shift_change_events",
  "source": {
   "path": "db/migrations/0010_shift_coverage_automation.sql",
   "line": 146
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "request_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "request_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "request_revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "event_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "source_terms",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "target_terms",
    "type": "jsonb",
    "nullable": true
   },
   {
    "name": "participants",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "callout_reason_code",
    "type": "text",
    "nullable": true
   },
   {
    "name": "callout_reason_note",
    "type": "text",
    "nullable": true
   },
   {
    "name": "outcome_reason",
    "type": "text",
    "nullable": true
   },
   {
    "name": "outcome_mode",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "request_kind",
     "request_id",
     "request_revision",
     "event_kind"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "shift_change_operations",
  "source": {
   "path": "db/migrations/0010_shift_coverage_automation.sql",
   "line": 184
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "command_fingerprint",
    "type": "text",
    "nullable": false
   },
   {
    "name": "request_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "result",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "actor_employee_id",
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "actor_employee_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "clocker_device_events",
  "source": {
   "path": "db/migrations/0011_clocker_devices.sql",
   "line": 51
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "device_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "device_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "device_id",
     "device_version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "device_id"
    ],
    "target": "clocker_devices",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0011_clocker_devices.sql",
     "line": 51
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0011_clocker_devices.sql",
     "line": 51
    }
   }
  ]
 },
 {
  "table": "clocker_device_credentials",
  "source": {
   "path": "db/migrations/0011_clocker_devices.sql",
   "line": 74
  },
  "columns": [
   {
    "name": "credential_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "device_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "credential_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "issued_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "credential_hash"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "credential_hash"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "device_id",
     "credential_version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "device_id"
    ],
    "target": "clocker_devices",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0011_clocker_devices.sql",
     "line": 74
    }
   }
  ]
 },
 {
  "table": "clocker_pin_configuration",
  "source": {
   "path": "db/migrations/0012_clocker_pins.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "key_identity",
    "type": "text",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "employee_clocker_pins",
  "source": {
   "path": "db/migrations/0012_clocker_pins.sql",
   "line": 7
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "lookup_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "pin_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "updated_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "lookup_hash"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 7
    }
   },
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 7
    }
   },
   {
    "columns": [
     "updated_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 7
    }
   }
  ]
 },
 {
  "table": "clocker_pin_events",
  "source": {
   "path": "db/migrations/0012_clocker_pins.sql",
   "line": 17
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "pin_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "employee_id",
     "pin_version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 17
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 17
    }
   }
  ]
 },
 {
  "table": "clocker_pin_limits",
  "source": {
   "path": "db/migrations/0012_clocker_pins.sql",
   "line": 28
  },
  "columns": [
   {
    "name": "scope",
    "type": "text",
    "nullable": false
   },
   {
    "name": "scope_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "failures",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "failure_window",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "attempts",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "attempt_window",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "latest_attempt",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "scope",
   "scope_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "scope",
     "scope_id"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "clocker_pin_sessions",
  "source": {
   "path": "db/migrations/0012_clocker_pins.sql",
   "line": 38
  },
  "columns": [
   {
    "name": "device_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "token_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "pin_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "credential_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "employee_updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "device_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "device_id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "token_hash"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "device_id"
    ],
    "target": "clocker_devices",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 38
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0012_clocker_pins.sql",
     "line": 38
    }
   }
  ]
 },
 {
  "table": "clocker_employee_clock_state",
  "source": {
   "path": "db/migrations/0013_clocker_punches.sql",
   "line": 5
  },
  "columns": [
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "revision",
    "type": "integer",
    "nullable": false
   }
  ],
  "primaryKey": [
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "employee_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0013_clocker_punches.sql",
     "line": 5
    }
   }
  ]
 },
 {
  "table": "clocker_command_ledger",
  "source": {
   "path": "db/migrations/0013_clocker_punches.sql",
   "line": 9
  },
  "columns": [
   {
    "name": "device_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "command_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "credential_version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "request_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "action",
    "type": "text",
    "nullable": false
   },
   {
    "name": "time_entry_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "performed_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "result",
    "type": "jsonb",
    "nullable": false
   }
  ],
  "primaryKey": [
   "device_id",
   "command_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "device_id",
     "command_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "device_id"
    ],
    "target": "clocker_devices",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0013_clocker_punches.sql",
     "line": 9
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0013_clocker_punches.sql",
     "line": 9
    }
   },
   {
    "columns": [
     "time_entry_id"
    ],
    "target": "time_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0013_clocker_punches.sql",
     "line": 9
    }
   }
  ]
 },
 {
  "table": "clocker_break_types",
  "source": {
   "path": "db/migrations/0014_clocker_breaks.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "name",
    "type": "text",
    "nullable": false
   },
   {
    "name": "category",
    "type": "text",
    "nullable": false
   },
   {
    "name": "target_minutes",
    "type": "integer",
    "nullable": true
   },
   {
    "name": "active",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "updated_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "updated_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 3
    }
   },
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 3
    }
   },
   {
    "columns": [
     "updated_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "clocker_break_type_events",
  "source": {
   "path": "db/migrations/0014_clocker_breaks.sql",
   "line": 17
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "break_type_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "settings",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "break_type_id",
     "version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "break_type_id"
    ],
    "target": "clocker_break_types",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 17
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0014_clocker_breaks.sql",
     "line": 17
    }
   }
  ]
 },
 {
  "table": "time_correction_requests",
  "source": {
   "path": "db/migrations/0016_time_corrections.sql",
   "line": 5
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "requested_by_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "time_entry_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "break_entry_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "source_snapshot",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "base_adjustment_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "proposal",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "reason",
    "type": "text",
    "nullable": false
   },
   {
    "name": "request_hash",
    "type": "char(64)",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "requested_by_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "time_entry_id"
    ],
    "target": "time_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "break_entry_id"
    ],
    "target": "break_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 5
    }
   },
   {
    "columns": [
     "base_adjustment_id"
    ],
    "target": "time_correction_adjustments",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 63
    }
   }
  ]
 },
 {
  "table": "time_correction_adjustments",
  "source": {
   "path": "db/migrations/0016_time_corrections.sql",
   "line": 37
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "request_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "time_entry_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "break_entry_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "effective_start_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "effective_end_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "source_revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "source_snapshot",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "supersedes_adjustment_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "request_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "request_id"
    ],
    "target": "time_correction_requests",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "time_entry_id"
    ],
    "target": "time_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "break_entry_id"
    ],
    "target": "break_entries",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "supersedes_adjustment_id"
    ],
    "target": "time_correction_adjustments",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   },
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 37
    }
   }
  ]
 },
 {
  "table": "time_correction_events",
  "source": {
   "path": "db/migrations/0016_time_corrections.sql",
   "line": 66
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "request_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "event_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_hash",
    "type": "char(64)",
    "nullable": false
   },
   {
    "name": "decision_note",
    "type": "text",
    "nullable": true
   },
   {
    "name": "adjustment_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "result",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "request_id",
     "revision"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "request_id"
    ],
    "target": "time_correction_requests",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 66
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 66
    }
   },
   {
    "columns": [
     "adjustment_id"
    ],
    "target": "time_correction_adjustments",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0016_time_corrections.sql",
     "line": 66
    }
   }
  ]
 },
 {
  "table": "timecard_revisions",
  "source": {
   "path": "db/migrations/0018_timecards.sql",
   "line": 4
  },
  "columns": [
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "start_date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "end_date",
    "type": "date",
    "nullable": false
   },
   {
    "name": "revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "action",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_hash",
    "type": "char(32)",
    "nullable": false
   },
   {
    "name": "snapshot",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "command_hash",
    "type": "char(64)",
    "nullable": false
   },
   {
    "name": "note",
    "type": "text",
    "nullable": true
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "operation_id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "employee_id",
     "start_date",
     "end_date",
     "revision"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0018_timecards.sql",
     "line": 4
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0018_timecards.sql",
     "line": 4
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0018_timecards.sql",
     "line": 4
    }
   }
  ]
 },
 {
  "table": "payroll_export_profile_revisions",
  "source": {
   "path": "db/migrations/0019_payroll_export_mappings.sql",
   "line": 2
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "profile_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "command_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "profile",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "profile_id",
   "revision"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "profile_id",
     "revision"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0019_payroll_export_mappings.sql",
     "line": 2
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0019_payroll_export_mappings.sql",
     "line": 2
    }
   }
  ]
 },
 {
  "table": "payroll_export_receipts",
  "source": {
   "path": "db/migrations/0019_payroll_export_mappings.sql",
   "line": 8
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "command_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "payload",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "actor_employee_id",
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "actor_employee_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0019_payroll_export_mappings.sql",
     "line": 8
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0019_payroll_export_mappings.sql",
     "line": 8
    }
   }
  ]
 },
 {
  "table": "password_recovery_proofs",
  "source": {
   "path": "db/migrations/0020_account_recovery.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "token_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "credential_updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "employee_updated_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "method",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "attestation",
    "type": "text",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "used_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "retired_at",
    "type": "timestamptz",
    "nullable": true
   }
  ],
  "primaryKey": [
   "token_hash"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "token_hash"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0020_account_recovery.sql",
     "line": 3
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0020_account_recovery.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "password_recovery_limits",
  "source": {
   "path": "db/migrations/0020_account_recovery.sql",
   "line": 21
  },
  "columns": [
   {
    "name": "scope",
    "type": "text",
    "nullable": false
   },
   {
    "name": "bucket",
    "type": "bigint",
    "nullable": false
   },
   {
    "name": "attempts",
    "type": "integer",
    "nullable": false
   }
  ],
  "primaryKey": [
   "scope",
   "bucket"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "scope",
     "bucket"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "employee_attention_receipts",
  "source": {
   "path": "db/migrations/0023_employee_attention_receipts.sql",
   "line": 3
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_version",
    "type": "text",
    "nullable": false
   },
   {
    "name": "read_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "employee_id",
     "source_kind",
     "source_id",
     "source_version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0023_employee_attention_receipts.sql",
     "line": 3
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0023_employee_attention_receipts.sql",
     "line": 3
    }
   }
  ]
 },
 {
  "table": "employee_attention_operations",
  "source": {
   "path": "db/migrations/0023_employee_attention_receipts.sql",
   "line": 13
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "command_hash",
    "type": "char(64)",
    "nullable": false
   },
   {
    "name": "result",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "employee_id",
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "employee_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0023_employee_attention_receipts.sql",
     "line": 13
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0023_employee_attention_receipts.sql",
     "line": 13
    }
   }
  ]
 },
 {
  "table": "communications",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 9
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "author_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "state",
    "type": "text",
    "nullable": false
   },
   {
    "name": "head_revision_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 9
    }
   },
   {
    "columns": [
     "author_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 9
    }
   },
   {
    "columns": [
     "workspace_id",
     "id",
     "head_revision_id"
    ],
    "target": "communication_revisions",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 57
    }
   }
  ]
 },
 {
  "table": "communication_revisions",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 24
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "communication_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "version",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "created_by",
    "type": "text",
    "nullable": false
   },
   {
    "name": "type",
    "type": "text",
    "nullable": false
   },
   {
    "name": "scope_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "business_date",
    "type": "date",
    "nullable": true
   },
   {
    "name": "source_shift_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "assignment_episode_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "terms_fingerprint",
    "type": "text",
    "nullable": true
   },
   {
    "name": "title",
    "type": "text",
    "nullable": false
   },
   {
    "name": "body",
    "type": "text",
    "nullable": false
   },
   {
    "name": "acknowledgement",
    "type": "text",
    "nullable": false
   },
   {
    "name": "expires_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "content_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "audience_fingerprint",
    "type": "text",
    "nullable": false
   },
   {
    "name": "audience_observed_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "published_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "id",
     "content_hash"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "version"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "created_by"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 24
    }
   },
   {
    "columns": [
     "workspace_id",
     "communication_id"
    ],
    "target": "communications",
    "targetColumns": [
     "workspace_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 24
    }
   },
   {
    "columns": [
     "workspace_id",
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "workspace_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 24
    }
   }
  ]
 },
 {
  "table": "communication_recipients",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 59
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "communication_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "content_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "location_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "grant_kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_shift_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "assignment_episode_id",
    "type": "text",
    "nullable": true
   },
   {
    "name": "terms_fingerprint",
    "type": "text",
    "nullable": true
   },
   {
    "name": "observed_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "provenance",
    "type": "jsonb",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "communication_id",
   "revision_id",
   "employee_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id",
     "content_hash"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 59
    }
   },
   {
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "content_hash"
    ],
    "target": "communication_revisions",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "id",
     "content_hash"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 59
    }
   },
   {
    "columns": [
     "workspace_id",
     "location_id"
    ],
    "target": "locations",
    "targetColumns": [
     "workspace_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 59
    }
   }
  ]
 },
 {
  "table": "communication_receipts",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 79
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "communication_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "content_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "acknowledged_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id",
     "id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id",
     "content_hash"
    ],
    "target": "communication_recipients",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id",
     "content_hash"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 79
    }
   }
  ]
 },
 {
  "table": "communication_operations",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 91
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "session_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "payload_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "communication_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "receipt_id",
    "type": "uuid",
    "nullable": true
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "actor_employee_id",
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "actor_employee_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 91
    }
   },
   {
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id"
    ],
    "target": "communication_revisions",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 91
    }
   },
   {
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "actor_employee_id",
     "receipt_id"
    ],
    "target": "communication_receipts",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "employee_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 91
    }
   }
  ]
 },
 {
  "table": "communication_lifecycle",
  "source": {
   "path": "db/migrations/0024_contextual_communications.sql",
   "line": 107
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "communication_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "revision_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "kind",
    "type": "text",
    "nullable": false
   },
   {
    "name": "occurred_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id",
     "kind"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 107
    }
   },
   {
    "columns": [
     "workspace_id",
     "communication_id",
     "revision_id"
    ],
    "target": "communication_revisions",
    "targetColumns": [
     "workspace_id",
     "communication_id",
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0024_contextual_communications.sql",
     "line": 107
    }
   }
  ]
 },
 {
  "table": "calendar_clock",
  "source": {
   "path": "db/migrations/0025_calendar_subscriptions.sql",
   "line": 5
  },
  "columns": [
   {
    "name": "singleton",
    "type": "boolean",
    "nullable": false
   },
   {
    "name": "serial",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "modified_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "singleton"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "singleton"
    ],
    "name": null
   }
  ],
  "references": []
 },
 {
  "table": "calendar_subscriptions",
  "source": {
   "path": "db/migrations/0025_calendar_subscriptions.sql",
   "line": 38
  },
  "columns": [
   {
    "name": "id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "digest",
    "type": "text",
    "nullable": false
   },
   {
    "name": "generation",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "allowed_location_ids",
    "type": "text[]",
    "nullable": false
   },
   {
    "name": "issued_at",
    "type": "timestamptz",
    "nullable": false
   },
   {
    "name": "revoked_at",
    "type": "timestamptz",
    "nullable": true
   },
   {
    "name": "revocation_reason",
    "type": "text",
    "nullable": true
   }
  ],
  "primaryKey": [
   "id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "id"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "digest"
    ],
    "name": null
   },
   {
    "kind": "UNIQUE",
    "columns": [
     "generation"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 38
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 38
    }
   }
  ]
 },
 {
  "table": "calendar_operations",
  "source": {
   "path": "db/migrations/0025_calendar_subscriptions.sql",
   "line": 47
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "actor_employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "operation_id",
    "type": "uuid",
    "nullable": false
   },
   {
    "name": "authority",
    "type": "text",
    "nullable": false
   },
   {
    "name": "payload_hash",
    "type": "text",
    "nullable": false
   },
   {
    "name": "result",
    "type": "jsonb",
    "nullable": false
   },
   {
    "name": "created_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "actor_employee_id",
   "operation_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "actor_employee_id",
     "operation_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 47
    }
   },
   {
    "columns": [
     "actor_employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 47
    }
   }
  ]
 },
 {
  "table": "calendar_removals",
  "source": {
   "path": "db/migrations/0025_calendar_subscriptions.sql",
   "line": 85
  },
  "columns": [
   {
    "name": "workspace_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "employee_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "source_shift_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "previous_publication_shift_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "removal_revision_id",
    "type": "text",
    "nullable": false
   },
   {
    "name": "calendar_serial",
    "type": "integer",
    "nullable": false
   },
   {
    "name": "removed_at",
    "type": "timestamptz",
    "nullable": false
   }
  ],
  "primaryKey": [
   "workspace_id",
   "employee_id",
   "source_shift_id",
   "removal_revision_id"
  ],
  "declaredKeys": [
   {
    "kind": "PRIMARY_KEY",
    "columns": [
     "workspace_id",
     "employee_id",
     "source_shift_id",
     "removal_revision_id"
    ],
    "name": null
   }
  ],
  "references": [
   {
    "columns": [
     "workspace_id"
    ],
    "target": "workspaces",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 85
    }
   },
   {
    "columns": [
     "employee_id"
    ],
    "target": "employees",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 85
    }
   },
   {
    "columns": [
     "previous_publication_shift_id"
    ],
    "target": "schedule_publication_revision_shifts",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 85
    }
   },
   {
    "columns": [
     "removal_revision_id"
    ],
    "target": "schedule_publication_revisions",
    "targetColumns": [
     "id"
    ],
    "historical": false,
    "source": {
     "path": "db/migrations/0025_calendar_subscriptions.sql",
     "line": 85
    }
   }
  ]
 }
];

/** Explicit reviewed mappings only: never default a tenant or infer employment from primary location. */
const ROOT_POLICIES: Record<string, { storage: OwnershipStorage; anchor: OwnershipAnchor }> = {
 workspaces:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'ROOT',column:'id'}},
 locations:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'DIRECT',column:'workspace_id'}},
 employees:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'CAPTURED_IMMUTABLE'}},
 positions:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'DIRECT',column:'workspace_id'}},
 schedule_week_settings:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'INSTALLATION_PROVENANCE'}},
 calendar_clock:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'INSTALLATION_PROVENANCE'}},
 clocker_pin_limits:{storage:'DIRECT_IMMUTABLE',anchor:{kind:'TYPED_SCOPE',discriminator:'scope',identifier:'scope_id'}},
 password_recovery_limits:{storage:'GLOBAL_SECURITY_CONTROL',anchor:{kind:'GLOBAL_SECURITY_CONTROL'}},
};
const PARENT_POLICIES: [string, string, string, OwnershipStorage][] = [
 ['employee_location_eligibility','employee_id','employees','DIRECT_IMMUTABLE'],
 ['employee_credentials','employee_id','employees','IMMUTABLE_PARENT'],['employee_sessions','employee_id','employees','IMMUTABLE_PARENT'],
 ['availability_windows','employee_id','employees','DIRECT_IMMUTABLE'],['availability_exceptions','employee_id','employees','DIRECT_IMMUTABLE'],
 ['time_off_requests','employee_id','employees','DIRECT_IMMUTABLE'],['schedules','location_id','locations','DIRECT_IMMUTABLE'],
 ['shifts','schedule_id','schedules','DIRECT_IMMUTABLE'],['shift_exchanges','source_shift_id','shifts','DIRECT_IMMUTABLE'],
 ['notifications','employee_id','employees','DIRECT_IMMUTABLE'],['location_staffing_settings','location_id','locations','DIRECT_IMMUTABLE'],
 ['employee_scheduling_settings','employee_id','employees','DIRECT_IMMUTABLE'],['location_coverage_windows','location_id','locations','DIRECT_IMMUTABLE'],
 ['weekly_availability_windows','employee_id','employees','DIRECT_IMMUTABLE'],['shift_callouts','shift_id','shifts','DIRECT_IMMUTABLE'],
 ['schedule_acknowledgements','employee_id','employees','DIRECT_IMMUTABLE'],['schedule_templates','created_by','employees','DIRECT_IMMUTABLE'],
 ['schedule_template_shifts','template_id','schedule_templates','DIRECT_IMMUTABLE'],
 ['weekly_availability_submissions','employee_id','employees','DIRECT_IMMUTABLE'],
 ['schedule_publication_revisions','created_by','employees','DIRECT_IMMUTABLE'],
 ['schedule_publication_revision_shifts','revision_id','schedule_publication_revisions','TYPED_HISTORICAL_SIDECAR'],
 ['clocker_devices','location_id','locations','IMMUTABLE_PARENT'],['time_entries','employee_id','employees','DIRECT_IMMUTABLE'],
 ['break_entries','time_entry_id','time_entries','DIRECT_IMMUTABLE'],['push_subscriptions','employee_id','employees','DIRECT_IMMUTABLE'],
 ['push_deliveries','notification_id','notifications','DIRECT_IMMUTABLE'],['employee_positions','employee_id','employees','DIRECT_IMMUTABLE'],
 ['coverage_window_position_requirements','coverage_window_id','location_coverage_windows','DIRECT_IMMUTABLE'],
 ['shift_change_participation','shift_id','shifts','DIRECT_IMMUTABLE'],
 ['clocker_device_events','device_id','clocker_devices','IMMUTABLE_PARENT'],['clocker_device_credentials','device_id','clocker_devices','IMMUTABLE_PARENT'],
 ['clocker_pin_events','employee_id','employees','TYPED_HISTORICAL_SIDECAR'],['clocker_pin_sessions','device_id','clocker_devices','DIRECT_IMMUTABLE'],
 ['clocker_employee_clock_state','employee_id','employees','DIRECT_IMMUTABLE'],['clocker_command_ledger','device_id','clocker_devices','IMMUTABLE_PARENT'],
 ['clocker_break_type_events','break_type_id','clocker_break_types','IMMUTABLE_PARENT'],
 ['time_correction_events','request_id','time_correction_requests','IMMUTABLE_PARENT'],
 ['password_recovery_proofs','employee_id','employees','IMMUTABLE_PARENT'],
];
const DIRECT_TABLES = [
 'schedule_generation_exclusions','shift_change_events','shift_change_operations','clocker_pin_configuration','employee_clocker_pins',
 'clocker_break_types','time_correction_requests','time_correction_adjustments','timecard_revisions','payroll_export_profile_revisions',
 'payroll_export_receipts','employee_attention_receipts','employee_attention_operations','communications','communication_revisions',
 'communication_recipients','communication_receipts','communication_operations','communication_lifecycle','calendar_subscriptions',
 'calendar_operations','calendar_removals',
];
const EXTRA_REFERENCES: Record<string, [string,string,boolean][]> = {
 schedule_publication_revision_shifts:[['source_shift_id','shifts',true],['schedule_id','schedules',true],['location_id','locations',true],['employee_id','employees',true]],
 shift_exchanges:[['prior_request_id','shift_exchanges',true],['linked_callout_id','shift_callouts',true]],
 shift_callouts:[['linked_coverage_request_id','shift_exchanges',true]],
 schedule_generation_exclusions:[['deleted_source_shift_id','shifts',true]],
 shift_change_events:[['actor_employee_id','employees',true]],shift_change_operations:[['actor_employee_id','employees',true]],
 communication_revisions:[['source_shift_id','shifts',true]],communication_recipients:[['source_shift_id','shifts',true]],
 calendar_removals:[['source_shift_id','shifts',true]],
};
const TYPED_FIELDS: Record<string,string[]> = {
 notifications:['source_id'],schedule_publication_revisions:['source_id'],shift_change_events:['request_id'],
 shift_change_operations:['request_id'],employee_attention_receipts:['source_id'],
};
const GLOBAL_FENCES: Record<string,string[]> = {
 employees:['id'],employee_sessions:['token_hash'],clocker_device_credentials:['credential_hash'],
 clocker_devices:['credential_hash','enrollment_hash','enrollment_session_hash'],clocker_pin_sessions:['token_hash'],
 password_recovery_proofs:['token_hash','consumed/retired/incarnation state'],password_recovery_limits:['scope+bucket','global/account keyed-digest budgets'],
 push_subscriptions:['installation_hash+environment','active_endpoint_fingerprint+environment','session_hash','ownership_generation'],
 shifts:['assignment_episode_id'],notifications:['legacy event_key+environment'],clocker_command_ledger:['device_id+command_id','request_hash'],
 time_correction_requests:['request_hash'],time_correction_events:['operation_hash'],timecard_revisions:['operation_id','source_hash','command_hash'],
 communication_revisions:['content_hash'],communication_operations:['session_hash','payload_hash'],
 calendar_subscriptions:['digest','generation','permanent revocation'],calendar_clock:['serial','modified_at'],
};
const HISTORY_TABLES = new Set(['schedule_publication_revision_shifts','shift_change_events','shift_change_operations','clocker_pin_events',
 'clocker_device_events','clocker_device_credentials','clocker_command_ledger','clocker_break_type_events','time_correction_requests',
 'time_correction_adjustments','time_correction_events','timecard_revisions','payroll_export_profile_revisions','payroll_export_receipts',
 'employee_attention_receipts','employee_attention_operations','communication_revisions','communication_recipients','communication_receipts',
 'communication_operations','communication_lifecycle','calendar_operations','calendar_removals']);
export function verifyOwnershipSource(sources: readonly MigrationSource[]): OwnershipDiagnostic[] {
 const problems: OwnershipDiagnostic[] = [],expected=new Map<string,string>(OWNERSHIP_SOURCE.map(s=>[s.path,s.sha256])),seen=new Set<string>();
 for(const source of sources){
  if(seen.has(source.path))problems.push({code:'DUPLICATE_SOURCE',detail:source.path});seen.add(source.path);
  const hash=expected.get(source.path);
  if(!hash)problems.push({code:'UNSUPPORTED_SOURCE',detail:source.path});
  else if(createHash('sha256').update(source.text).digest('hex')!==hash)problems.push({code:'SOURCE_DRIFT',detail:source.path});
 }
 for(const path of expected.keys())if(!seen.has(path))problems.push({code:'SOURCE_COVERAGE',detail:path});
 return problems.sort((a,b)=>canonicalOwnershipJson(a)<canonicalOwnershipJson(b)?-1:1);
}
export function getOwnershipRegistry(): OwnershipRegistry {
 const tables: TableOwnership[] = JSON.parse(JSON.stringify(OBSERVED_TABLES)).map((t:ObservedTable)=>{
  let policy=ROOT_POLICIES[t.table];
  const parent=PARENT_POLICIES.find(p=>p[0]===t.table);
  if(parent)policy={storage:parent[3],anchor:{kind:'PARENT',columns:[parent[1]],target:parent[2],targetColumns:['id']}};
  if(DIRECT_TABLES.includes(t.table))policy={storage:'DIRECT_IMMUTABLE',anchor:{kind:'DIRECT',column:'workspace_id'}};
  if(!policy)throw new Error('Unclassified source table: '+t.table);
  const references=[...t.references,...(EXTRA_REFERENCES[t.table]??[]).map(([column,target,historical])=>({columns:[column],target,targetColumns:['id'],historical,source:t.source}))];
  const payloads=t.columns.filter(c=>c.type==='jsonb'||c.type.endsWith('[]')).map(c=>({
   column:c.name,type:c.type.endsWith('[]')?'ARRAY' as const:'JSON' as const,
   contractId:t.table+'.'+c.name+':source-v1:'+ownershipDigest(OWNERSHIP_SOURCE),source:t.source,
   treatment:'COMPLETE_TYPED_LEAF_CAPTURE' as const,historical:HISTORY_TABLES.has(t.table)||['schedule_context','break_type_snapshot'].includes(c.name),
  }));
  const mirroredIdentityColumns=[...new Set([...t.primaryKey,...references.flatMap(r=>r.columns),...(TYPED_FIELDS[t.table]??[])])].sort();
  return {...t,references,...policy,sidecar:policy.storage==='TYPED_HISTORICAL_SIDECAR'?t.table+'_tenant_ownership':null,
   mirroredIdentityColumns,payloads,typedFields:[...(TYPED_FIELDS[t.table]??[])],globalFences:[...(GLOBAL_FENCES[t.table]??[])]};
 }).sort((a:TableOwnership,b:TableOwnership)=>a.table<b.table?-1:1);
 const base={version:1 as const,schemaCommit:OWNERSHIP_SCHEMA_COMMIT,schemaTree:OWNERSHIP_SCHEMA_TREE,schemaDigest:ownershipDigest(OWNERSHIP_SOURCE),tables,
  semantics:'SOURCE_BOUND_MIGRATION_CONTRACT_NOT_DEPLOYED_CATALOG' as const};
 return {...base,digest:ownershipDigest(base)};
}

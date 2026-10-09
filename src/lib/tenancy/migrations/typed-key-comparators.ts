import {types as utilTypes} from 'node:util';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue,type EvidenceLocation} from './ownership';
import {isIssuedInspectedTypedSnapshot} from './typed-snapshot';
import type {TypedOwnershipBoundary} from './typed-ownership';
import type {DatabaseCollationCapture} from './backfill';
import {validCollation} from './namespace-comparators';

export type TypedKeyOperatorCapture={operatorOid:string;operatorSchema:string;operatorName:string;functionOid:string;functionSchema:string;functionName:string;language:string;volatility:string;securityDefiner:boolean;source:string};
export type TypedKeySupportCapture={number:1|2;functionOid:string;functionSchema:string;functionName:string;language:string;volatility:string;securityDefiner:boolean;source:string;argumentTypeOids:string[];resultTypeOid:string;kind:'f'};
export type TypedKeyOpclassCapture={oid:string;schema:string;name:string;method:string;inputTypeOid:string;inputTypeName:string;familySchema:string;familyName:string;default:boolean;equality:TypedKeyOperatorCapture;ordering:TypedKeyOperatorCapture;support:TypedKeySupportCapture[]};
export type TypedKeyDatabaseCollationCapture={provider:'b'|'c'|'i';encoding:number;lcCollate:string;lcCtype:string;locale:string|null;icuRules:string|null;version:string|null;actualVersion:string|null};
export type TypedKeyCollationCapture=DatabaseCollationCapture&{icuRules:string|null};
export type TypedKeyComparatorComponent={column:string;type:string;typeOid:string;collation:TypedKeyCollationCapture|null;opclass:TypedKeyOpclassCapture};
export type TypedKeyComparatorContract=Readonly<{contractId:string;table:string;label:string;kind:'PRIMARY_KEY'|'UNIQUE'|'CANDIDATE';columns:readonly string[];source:Readonly<EvidenceLocation>;indexColumns:readonly string[];projectedPositions:readonly number[];indexName:string|null;predicate:string|null;nullsNotDistinct:false}>;
export type TypedKeyComparatorCatalog={contractId:string;table:string;label:string;kind:TypedKeyComparatorContract['kind'];columns:string[];source:EvidenceLocation;indexColumns:string[];projectedPositions:number[];indexName:string;indexDefinition:string;predicate:string|null;nullsNotDistinct:false;components:TypedKeyComparatorComponent[];checksum:string};
export type TypedKeyComparatorRow={contractId:string;key:JsonValue[];rowChecksum:string;included:boolean;comparisonClass:string|null};
export type TypedKeyComparatorCapture={format:'TYPED_KEY_COMPARATOR_CAPTURE_V1';binding:TypedOwnershipBoundary;serverVersion:string;serverEncoding:'UTF8';databaseCollation:TypedKeyDatabaseCollationCapture;catalog:JsonValue;catalogs:TypedKeyComparatorCatalog[];rows:TypedKeyComparatorRow[];captureChecksum:string};
export type TypedKeyComparatorStockDescriptor=Readonly<{type:string;typeOid:string;catalogType:string;collatable:boolean;opclass:Readonly<Omit<TypedKeyOpclassCapture,'oid'>>}>;
export type TypedKeyComparatorObservations=Readonly<{format:'TYPED_KEY_COMPARATOR_OBSERVATIONS_V1';binding:Readonly<TypedOwnershipBoundary>;serverVersion:string;serverEncoding:'UTF8';databaseCollation:Readonly<TypedKeyDatabaseCollationCapture>;catalog:JsonValue;catalogs:readonly Readonly<TypedKeyComparatorCatalog>[];rows:readonly Readonly<TypedKeyComparatorRow>[];captureChecksum:string;digest:string;verification:'PURE_NOT_DATABASE_OPERATOR_OR_TENANT_AUTHORITY';remainingGates:readonly string[]}>;
export type TypedKeyComparatorOutcome=Readonly<{status:'VALIDATED';observations:TypedKeyComparatorObservations}>|Readonly<{status:'BLOCKED';code:string}>;
const registry=getOwnershipRegistry();
function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freeze(descriptor.value);Object.freeze(value);}return value;}
const makeContract=(c:Omit<TypedKeyComparatorContract,'contractId'>):TypedKeyComparatorContract=>({...c,contractId:ownershipDigest([c.table,c.kind,c.label,c.columns,c.source])});
const originalContracts=registry.tables.flatMap(table=>table.declaredKeys.map(key=>makeContract({table:table.table,kind:key.kind as 'PRIMARY_KEY'|'UNIQUE',label:key.name??key.kind+':'+canonicalOwnershipJson(key.columns),columns:[...key.columns],source:table.source,indexColumns:[...key.columns],projectedPositions:key.columns.map((_,i)=>i),indexName:key.name,predicate:null,nullsNotDistinct:false})));
const candidateContracts:Omit<TypedKeyComparatorContract,'contractId'>[]=[
 {table:'locations',kind:'CANDIDATE',label:'clocker_key',columns:['clocker_key'],source:{path:'db/migrations/0008_workspace_positions.sql',line:25},indexColumns:['workspace_id','clocker_key'],projectedPositions:[1],indexName:'location_clocker_key_unique',predicate:null,nullsNotDistinct:false},
 {table:'schedule_week_settings',kind:'CANDIDATE',label:'week',columns:['week_start'],source:{path:'db/migrations/0003_schedule_assistance.sql',line:24},indexColumns:['week_start'],projectedPositions:[0],indexName:'schedule_week_settings_pkey',predicate:null,nullsNotDistinct:false},
 {table:'schedule_publication_revisions',kind:'CANDIDATE',label:'publication_number',columns:['week_start','revision_number'],source:{path:'db/migrations/0004_assistance_layer.sql',line:22},indexColumns:['week_start','revision_number'],projectedPositions:[0,1],indexName:'schedule_publication_revisions_week_start_revision_number_key',predicate:null,nullsNotDistinct:false},
 {table:'push_subscriptions',kind:'CANDIDATE',label:'installation_global',columns:['installation_hash','environment'],source:{path:'db/migrations/0007_portal_web_push.sql',line:54},indexColumns:['installation_hash','environment'],projectedPositions:[0,1],indexName:'push_subscriptions_installation_hash_environment_key',predicate:null,nullsNotDistinct:false},
 {table:'push_subscriptions',kind:'CANDIDATE',label:'active_endpoint_global',columns:['endpoint_fingerprint','environment'],source:{path:'db/migrations/0007_portal_web_push.sql',line:57},indexColumns:['endpoint_fingerprint','environment'],projectedPositions:[0,1],indexName:'push_active_endpoint_unique',predicate:"(status = 'active'::text)",nullsNotDistinct:false},
];
const contracts=freeze([...originalContracts,...candidateContracts.map(makeContract)].sort((a,b)=>a.contractId<b.contractId?-1:1));
/** Immutable closed source contracts; not schema deployment or DB authority. */
export function getTypedKeyComparatorContracts():readonly TypedKeyComparatorContract[]{return contracts;}
// Selected pg_type/pg_opclass/pg_amop/pg_amproc/pg_operator/pg_proc bootstrap facts are
// equal in official REL_17_STABLE and REL_18_STABLE sources. Non-hardwired
// opclass OIDs remain captured bindings to pg_index, never invented constants.
// https://github.com/postgres/postgres/tree/REL_18_STABLE/src/include/catalog
const stockDescriptors:TypedKeyComparatorStockDescriptor[]=[
 {
  "type": "boolean",
  "typeOid": "16",
  "catalogType": "boolean",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "bool_ops",
   "method": "btree",
   "inputTypeOid": "16",
   "inputTypeName": "bool",
   "familySchema": "pg_catalog",
   "familyName": "bool_ops",
   "default": true,
   "equality": {
    "functionName": "booleq",
    "functionOid": "60",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "91",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "booleq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "boollt",
    "functionOid": "56",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "58",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "boollt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "btboolcmp",
     "functionOid": "1693",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "btboolcmp",
     "volatility": "i",
     "argumentTypeOids": [
      "16",
      "16"
     ],
     "resultTypeOid": "23"
    }
   ]
  }
 },
 {
  "type": "smallint",
  "typeOid": "21",
  "catalogType": "smallint",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "int2_ops",
   "method": "btree",
   "inputTypeOid": "21",
   "inputTypeName": "int2",
   "familySchema": "pg_catalog",
   "familyName": "integer_ops",
   "default": true,
   "equality": {
    "functionName": "int2eq",
    "functionOid": "63",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "94",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int2eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "int2lt",
    "functionOid": "64",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "95",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int2lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "btint2cmp",
     "functionOid": "350",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "btint2cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "21",
      "21"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "btint2sortsupport",
     "functionOid": "3129",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "btint2sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "integer",
  "typeOid": "23",
  "catalogType": "integer",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "int4_ops",
   "method": "btree",
   "inputTypeOid": "23",
   "inputTypeName": "int4",
   "familySchema": "pg_catalog",
   "familyName": "integer_ops",
   "default": true,
   "equality": {
    "functionName": "int4eq",
    "functionOid": "65",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "96",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int4eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "int4lt",
    "functionOid": "66",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "97",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int4lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "btint4cmp",
     "functionOid": "351",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "btint4cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "23",
      "23"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "btint4sortsupport",
     "functionOid": "3130",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "btint4sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "bigint",
  "typeOid": "20",
  "catalogType": "bigint",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "int8_ops",
   "method": "btree",
   "inputTypeOid": "20",
   "inputTypeName": "int8",
   "familySchema": "pg_catalog",
   "familyName": "integer_ops",
   "default": true,
   "equality": {
    "functionName": "int8eq",
    "functionOid": "467",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "410",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int8eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "int8lt",
    "functionOid": "469",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "412",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "int8lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "btint8cmp",
     "functionOid": "842",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "btint8cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "20",
      "20"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "btint8sortsupport",
     "functionOid": "3131",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "btint8sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "text",
  "typeOid": "25",
  "catalogType": "text",
  "collatable": true,
  "opclass": {
   "schema": "pg_catalog",
   "name": "text_ops",
   "method": "btree",
   "inputTypeOid": "25",
   "inputTypeName": "text",
   "familySchema": "pg_catalog",
   "familyName": "text_ops",
   "default": true,
   "equality": {
    "functionName": "texteq",
    "functionOid": "67",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "98",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "texteq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "text_lt",
    "functionOid": "740",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "664",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "text_lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "bttextcmp",
     "functionOid": "360",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "bttextcmp",
     "volatility": "i",
     "argumentTypeOids": [
      "25",
      "25"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "bttextsortsupport",
     "functionOid": "3255",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "bttextsortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "char(64)",
  "typeOid": "1042",
  "catalogType": "character(64)",
  "collatable": true,
  "opclass": {
   "schema": "pg_catalog",
   "name": "bpchar_ops",
   "method": "btree",
   "inputTypeOid": "1042",
   "inputTypeName": "bpchar",
   "familySchema": "pg_catalog",
   "familyName": "bpchar_ops",
   "default": true,
   "equality": {
    "functionName": "bpchareq",
    "functionOid": "1048",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "1054",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "bpchareq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "bpcharlt",
    "functionOid": "1049",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "1058",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "bpcharlt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "bpcharcmp",
     "functionOid": "1078",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "bpcharcmp",
     "volatility": "i",
     "argumentTypeOids": [
      "1042",
      "1042"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "bpchar_sortsupport",
     "functionOid": "3328",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "bpchar_sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "date",
  "typeOid": "1082",
  "catalogType": "date",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "date_ops",
   "method": "btree",
   "inputTypeOid": "1082",
   "inputTypeName": "date",
   "familySchema": "pg_catalog",
   "familyName": "datetime_ops",
   "default": true,
   "equality": {
    "functionName": "date_eq",
    "functionOid": "1086",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "1093",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "date_eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "date_lt",
    "functionOid": "1087",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "1095",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "date_lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "date_cmp",
     "functionOid": "1092",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "date_cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "1082",
      "1082"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "date_sortsupport",
     "functionOid": "3136",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "date_sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 },
 {
  "type": "time",
  "typeOid": "1083",
  "catalogType": "time without time zone",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "time_ops",
   "method": "btree",
   "inputTypeOid": "1083",
   "inputTypeName": "time",
   "familySchema": "pg_catalog",
   "familyName": "time_ops",
   "default": true,
   "equality": {
    "functionName": "time_eq",
    "functionOid": "1145",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "1108",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "time_eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "time_lt",
    "functionOid": "1102",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "1110",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "time_lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "time_cmp",
     "functionOid": "1107",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "time_cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "1083",
      "1083"
     ],
     "resultTypeOid": "23"
    }
   ]
  }
 },
 {
  "type": "uuid",
  "typeOid": "2950",
  "catalogType": "uuid",
  "collatable": false,
  "opclass": {
   "schema": "pg_catalog",
   "name": "uuid_ops",
   "method": "btree",
   "inputTypeOid": "2950",
   "inputTypeName": "uuid",
   "familySchema": "pg_catalog",
   "familyName": "uuid_ops",
   "default": true,
   "equality": {
    "functionName": "uuid_eq",
    "functionOid": "2956",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "=",
    "operatorOid": "2972",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "uuid_eq",
    "volatility": "i"
   },
   "ordering": {
    "functionName": "uuid_lt",
    "functionOid": "2954",
    "functionSchema": "pg_catalog",
    "language": "internal",
    "operatorName": "<",
    "operatorOid": "2974",
    "operatorSchema": "pg_catalog",
    "securityDefiner": false,
    "source": "uuid_lt",
    "volatility": "i"
   },
   "support": [
    {
     "functionName": "uuid_cmp",
     "functionOid": "2960",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 1,
     "securityDefiner": false,
     "source": "uuid_cmp",
     "volatility": "i",
     "argumentTypeOids": [
      "2950",
      "2950"
     ],
     "resultTypeOid": "23"
    },
    {
     "functionName": "uuid_sortsupport",
     "functionOid": "3300",
     "functionSchema": "pg_catalog",
     "kind": "f",
     "language": "internal",
     "number": 2,
     "securityDefiner": false,
     "source": "uuid_sortsupport",
     "volatility": "i",
     "argumentTypeOids": [
      "2281"
     ],
     "resultTypeOid": "2278"
    }
   ]
  }
 }
];
freeze(stockDescriptors);
/** Collector convenience/source closure only, not observed catalog authority. */
export function getTypedKeyComparatorStockDescriptors():readonly TypedKeyComparatorStockDescriptor[]{return stockDescriptors;}
const issued=new WeakSet<object>();
const SHA=/^[a-f0-9]{64}$/;
const OID=/^[1-9][0-9]*$/;
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
class ComparatorFailure extends Error{constructor(readonly code:string){super(code);}}
function fail(code:string):never{throw new ComparatorFailure(code);}
function exact(value:unknown,names:readonly string[]):value is Record<string,JsonValue>{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...names].sort());
}
/** Detach ordinary data without coercion, accessors or proxy meta traps. No
 * serialized data gains snapshot or observation issuance from this operation. */
function detach(input:unknown,ancestors=new Set<object>()):JsonValue{
 if(input===null||typeof input==='boolean')return input;
 if(typeof input==='string'){
  for(let i=0;i<input.length;i++){
   const c=input.charCodeAt(i);
   if(c>=0xd800&&c<=0xdbff){const n=input.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');}
   else if(c>=0xdc00&&c<=0xdfff)fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
  }
  return input;
 }
 if(typeof input==='number'&&Number.isSafeInteger(input)&&!Object.is(input,-0))return input;
 if(typeof input!=='object'||!input||utilTypes.isProxy(input)||ancestors.has(input))fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
 const array=Array.isArray(input);
 if(Object.getPrototypeOf(input)!==(array?Array.prototype:Object.prototype))fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
 const keys=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
 if(keys.some(k=>typeof k!=='string'))fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
 ancestors.add(input);
 try{
  if(array){
   const d=descriptors.length;
   if(!d||!('value'in d)||!Number.isSafeInteger(d.value)||d.value<0||keys.length!==d.value+1)fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
   const output:JsonValue[]=[];
   for(let i=0;i<d.value;i++){
    const item=descriptors[String(i)];if(!item||!('value'in item)||!item.enumerable)fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
    output.push(detach(item.value,ancestors));
   }
   return output;
  }
  const output:Record<string,JsonValue>={};
  for(const key of keys as string[]){
   const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
   Object.defineProperty(output,key,{value:detach(d.value,ancestors),enumerable:true,configurable:true,writable:true});
  }
  return output;
 }finally{ancestors.delete(input);}
}
const catalogFields={
 relations:['schema','name','kind','rls','force_rls','replica_identity','acl'],
 columns:['schema','table_name','name','ordinal','type','not_null','default_value','identity','generated','collation_oid','acl'],
 constraints:['schema','table_name','name','type','definition','validated','deferrable','deferred','enforced'],
 not_null:['schema','table_name','name','validated','enforced','deferrable','deferred'],
 indexes:['schema','table_name','name','definition','unique','valid','ready','live','immediate','nulls_not_distinct','collations','opclasses'],
 triggers:['schema','table_name','name','enabled','internal','definition'],
 functions:['schema','name','arguments','definition','security_definer','configuration','acl'],
 views:['schema','name','definition'],schemas:['name','acl'],
} as const;
type FullCatalog={ [K in keyof typeof catalogFields]:Record<string,JsonValue>[] };
function inspectCatalog(value:JsonValue):FullCatalog{
 if(!exact(value,Object.keys(catalogFields)))fail('KEY_COMPARATOR_CATALOG_COVERAGE');
 for(const section of Object.keys(catalogFields) as (keyof typeof catalogFields)[]){
  const rows=value[section];if(!Array.isArray(rows))fail('KEY_COMPARATOR_CATALOG_COVERAGE');
  const seen=new Set<string>();
  for(const row of rows){
   if(!exact(row,catalogFields[section]))fail('KEY_COMPARATOR_CATALOG_COVERAGE');
   for(const [field,v]of Object.entries(row)){
    if(['rls','force_rls','not_null','validated','deferrable','deferred','enforced','unique','valid','ready','live','immediate','nulls_not_distinct','internal','security_definer'].includes(field)){
     if(typeof v!=='boolean')fail('KEY_COMPARATOR_CATALOG_COVERAGE');
    }else if(field==='ordinal'){
     if(typeof v!=='number'||!Number.isSafeInteger(v)||v<=0)fail('KEY_COMPARATOR_CATALOG_COVERAGE');
    }else if(['acl','default_value','configuration'].includes(field)){
     if(v!==null&&typeof v!=='string')fail('KEY_COMPARATOR_CATALOG_COVERAGE');
    }else if(typeof v!=='string')fail('KEY_COMPARATOR_CATALOG_COVERAGE');
   }
   const id=canonicalOwnershipJson([row.schema??null,row.table_name??null,row.name,section==='functions'?row.arguments:null]);
   if(seen.has(id))fail('KEY_COMPARATOR_CATALOG_COVERAGE');seen.add(id);
  }
 }
 return value as unknown as FullCatalog;
}
function databaseCollation(value:unknown):value is TypedKeyDatabaseCollationCapture{
 if(!exact(value,['provider','encoding','lcCollate','lcCtype','locale','icuRules','version','actualVersion']))return false;
 if(!['b','c','i'].includes(value.provider as string)||value.encoding!==6||typeof value.lcCollate!=='string'||!value.lcCollate||typeof value.lcCtype!=='string'||!value.lcCtype)return false;
 if(!['locale','icuRules','version','actualVersion'].every(k=>value[k]===null||typeof value[k]==='string')||value.version!==value.actualVersion)return false;
 if(value.provider==='c')return value.locale===null&&value.icuRules===null;
 if(typeof value.locale!=='string'||!value.locale)return false;
 return value.provider==='i'||value.icuRules===null;
}
function collationValid(value:unknown):value is TypedKeyCollationCapture{
 if(!exact(value,['oid','schema','name','provider','deterministic','encoding','lcCollate','lcCtype','locale','icuRules','version','actualVersion']))return false;
 const {icuRules,...legacy}=value;
 if(!validCollation(legacy)||!OID.test(legacy.oid)||!['b','c','i','d'].includes(legacy.provider)||![6,-1].includes(legacy.encoding)||!(icuRules===null||typeof icuRules==='string')||legacy.version!==legacy.actualVersion)return false;
 if(legacy.provider==='d')return legacy.oid==='100'&&legacy.schema==='pg_catalog'&&legacy.name==='default'&&legacy.deterministic===true&&legacy.encoding===-1&&legacy.lcCollate===null&&legacy.lcCtype===null&&legacy.locale===null&&legacy.version===null&&legacy.actualVersion===null&&icuRules===null;
 if(legacy.provider==='c')return typeof legacy.lcCollate==='string'&&!!legacy.lcCollate&&typeof legacy.lcCtype==='string'&&!!legacy.lcCtype&&legacy.locale===null&&icuRules===null;
 return typeof legacy.locale==='string'&&!!legacy.locale&&(legacy.provider==='i'||icuRules===null);
}
function quoteIdentifier(name:string):string{return /^[a-z_][a-z_0-9]*$/.test(name)?name:'"'+name.replace(/"/g,'""')+'"';}
function indexDefinition(c:TypedKeyComparatorContract,name:string):string{
 return 'CREATE UNIQUE INDEX '+quoteIdentifier(name)+' ON public.'+quoteIdentifier(c.table)+' USING btree ('+c.indexColumns.map(quoteIdentifier).join(', ')+')'+(c.predicate===null?'':' WHERE '+c.predicate);
}
function sourceConstraint(c:TypedKeyComparatorContract,full:FullCatalog):Record<string,JsonValue>|undefined{
 if(c.kind==='CANDIDATE')return undefined;
 const definition=(c.kind==='PRIMARY_KEY'?'PRIMARY KEY':'UNIQUE')+' ('+c.columns.map(quoteIdentifier).join(', ')+')';
 const matches=full.constraints.filter(k=>k.schema==='public'&&k.table_name===c.table&&k.type===(c.kind==='PRIMARY_KEY'?'p':'u')&&k.definition===definition);
 if(matches.length!==1||(c.indexName!==null&&matches[0].name!==c.indexName))fail('KEY_COMPARATOR_BACKING_INDEX_DRIFT');
 const found=matches[0];
 if(found.validated!==true||found.enforced!==true||found.deferrable!==false||found.deferred!==false)fail('KEY_COMPARATOR_CONSTRAINT_GUARD_DRIFT');
 return found;
}
function verifyComponent(value:TypedKeyComparatorComponent,contract:TypedKeyComparatorContract,position:number,index:Record<string,JsonValue>,full:FullCatalog):void{
 if(!exact(value,['column','type','typeOid','collation','opclass']))fail('KEY_COMPARATOR_COMPONENT_DRIFT');
 const name=contract.columns[position],table=registry.tables.find(t=>t.table===contract.table)!,source=table.columns.find(c=>c.name===name)!;
 const relations=full.relations.filter(r=>r.schema==='public'&&r.name===contract.table);
 if(relations.length!==1||relations[0].kind!=='r')fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
 const stock=stockDescriptors.find(s=>s.type===source.type);
 if(!stock)fail('UNSUPPORTED_KEY_OPCLASS');
 if(value.column!==name||value.type!==source.type||value.typeOid!==stock.typeOid)fail('KEY_COMPARATOR_COMPONENT_DRIFT');
 const columns=full.columns.filter(c=>c.schema==='public'&&c.table_name===contract.table&&c.name===name);
 if(columns.length!==1||columns[0].type!==stock.catalogType||columns[0].not_null!==!source.nullable)fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
 if(!source.nullable){
  const controls=full.not_null.filter(c=>c.schema==='public'&&c.table_name===contract.table&&c.name===name);
  if(controls.length!==1||controls[0].validated!==true||controls[0].enforced!==true||controls[0].deferrable!==false||controls[0].deferred!==false)fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
 }
 const opclasses=(index.opclasses as string).split(' '),collations=(index.collations as string).split(' ');
 if(opclasses.length!==contract.indexColumns.length||collations.length!==contract.indexColumns.length||opclasses.some(x=>!OID.test(x))||collations.some(x=>!(/^(0|[1-9][0-9]*)$/).test(x)))fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
 if(!exact(value.opclass,['oid','schema','name','method','inputTypeOid','inputTypeName','familySchema','familyName','default','equality','ordering','support']))fail('UNSUPPORTED_KEY_OPCLASS');
 const {oid,...opclass}=value.opclass;
 if(!OID.test(oid)||oid!==opclasses[contract.projectedPositions[position]])fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
 // Full equality includes closed operator/procedure and selected support1/2
 // signatures. Names alone, arbitrary user functions and custom families fail.
 if(!same(opclass,stock.opclass))fail('UNSUPPORTED_KEY_OPCLASS');
 const indexCollation=collations[contract.projectedPositions[position]];
 if(stock.collatable){
  if(!exact(value.collation,['oid','schema','name','provider','deterministic','encoding','lcCollate','lcCtype','locale','icuRules','version','actualVersion'])||value.collation.version!==value.collation.actualVersion)fail('UNSUPPORTED_KEY_COLLATION');
  if(value.collation.oid!==indexCollation||value.collation.oid!==columns[0].collation_oid)fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
  if(!collationValid(value.collation))fail('UNSUPPORTED_KEY_COLLATION');
 }else if(value.collation!==null||indexCollation!=='0'||columns[0].collation_oid!=='0')fail('KEY_COMPARATOR_COMPONENT_CATALOG_DRIFT');
}
/** Complete pure supplied SQL-key observations, not executable migration,
 * uniqueness, least privilege, live SQL/index certification or operator/tenant
 * authority. Only a genuine locally issued complete snapshot is read. All
 * original PK/UNIQUE keys and five closed candidate projections are observed,
 * including empty tables and excluded rows. Positive SQL equality classes are
 * retained opaquely: no JS casing, scalar coercion or inequality substitutes.
 *
 * Default index collation raw attributes remain unchanged; the separately
 * captured effective database locale/rules/version is checksum-bound. The
 * collector must observe the real catalog and classes in the same transaction.
 * Stock closure covers same-type btree equality/order operators and support1/2
 * only. Other support routines, live effects and stock-catalog tamper resistance
 * remain actual gates; hashes/issuance cannot authenticate supplied metadata.
 */
export function validateTypedKeyComparators(snapshot:unknown,input:unknown,independentlyRetainedChecksum:unknown):TypedKeyComparatorOutcome{
 if(!isIssuedInspectedTypedSnapshot(snapshot))return Object.freeze({status:'BLOCKED',code:'UNISSUED_TYPED_SNAPSHOT'});
 try{
  const data=detach(input);
  if(!exact(data,['format','binding','serverVersion','serverEncoding','databaseCollation','catalog','catalogs','rows','captureChecksum'])||data.format!=='TYPED_KEY_COMPARATOR_CAPTURE_V1')fail('UNSUPPORTED_KEY_COMPARATOR_INPUT');
  const capture=data as unknown as TypedKeyComparatorCapture;
  if(typeof independentlyRetainedChecksum!=='string'||!SHA.test(independentlyRetainedChecksum)||independentlyRetainedChecksum!==capture.captureChecksum)fail('RETAINED_CAPTURE_CHECKSUM_REQUIRED');
  const {captureChecksum,...body}=capture;
  if(typeof captureChecksum!=='string'||!SHA.test(captureChecksum)||ownershipDigest(body)!==captureChecksum)fail('KEY_COMPARATOR_CAPTURE_CHECKSUM_DRIFT');
  const binding={registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,fenceGeneration:snapshot.fenceGeneration,factsDigest:snapshot.factsDigest};
  if(!same(capture.binding,binding)||binding.registryDigest!==registry.digest)fail('KEY_COMPARATOR_BOUNDARY_DRIFT');
  if(typeof capture.serverVersion!=='string'||!/^(17|18)\.[0-9]+(?:\.[0-9]+)?(?: [^\r\n]+)?$/.test(capture.serverVersion)||capture.serverEncoding!=='UTF8')fail('UNSUPPORTED_KEY_COMPARATOR_ENGINE');
  if(!databaseCollation(capture.databaseCollation))fail('UNSUPPORTED_DATABASE_COLLATION');
  if(ownershipDigest(capture.catalog)!==snapshot.currentSchemaDigest)fail('KEY_COMPARATOR_CATALOG_DIGEST_DRIFT');
  const full=inspectCatalog(capture.catalog);
  if(!Array.isArray(capture.catalogs)||capture.catalogs.length!==contracts.length||capture.catalogs.some((c,i)=>!exact(c,['contractId','table','label','kind','columns','source','indexColumns','projectedPositions','indexName','indexDefinition','predicate','nullsNotDistinct','components','checksum'])||c.contractId!==contracts[i].contractId))fail('KEY_COMPARATOR_CATALOG_COVERAGE');
  for(let i=0;i<contracts.length;i++){
   const c=contracts[i],observed=capture.catalogs[i],{checksum,...recordBody}=observed;
   if(typeof checksum!=='string'||!SHA.test(checksum)||ownershipDigest(recordBody)!==checksum)fail('KEY_COMPARATOR_RECORD_CHECKSUM_DRIFT');
   const {contractId,table,label,kind,columns,source,indexColumns,projectedPositions,predicate,nullsNotDistinct}=observed;
   if(!same({contractId,table,label,kind,columns,source,indexColumns,projectedPositions,predicate,nullsNotDistinct},{contractId:c.contractId,table:c.table,label:c.label,kind:c.kind,columns:c.columns,source:c.source,indexColumns:c.indexColumns,projectedPositions:c.projectedPositions,predicate:c.predicate,nullsNotDistinct:c.nullsNotDistinct}))fail('KEY_COMPARATOR_CONTRACT_DRIFT');
   const constraint=sourceConstraint(c,full),name=c.indexName??constraint?.name;
   if(typeof name!=='string'||observed.indexName!==name)fail('KEY_COMPARATOR_BACKING_INDEX_DRIFT');
   const indexes=full.indexes.filter(k=>k.schema==='public'&&k.table_name===c.table&&k.name===name);
   if(indexes.length!==1)fail('KEY_COMPARATOR_BACKING_INDEX_DRIFT');
   const index=indexes[0];
   if(index.unique!==true||index.valid!==true||index.ready!==true||index.live!==true||index.immediate!==true||index.nulls_not_distinct!==false)fail('KEY_COMPARATOR_INDEX_GUARD_DRIFT');
   if(observed.indexDefinition!==index.definition||observed.indexDefinition!==indexDefinition(c,name))fail('KEY_COMPARATOR_INDEX_DEFINITION_DRIFT');
   if(!Array.isArray(observed.components)||observed.components.length!==c.columns.length)fail('KEY_COMPARATOR_COMPONENT_DRIFT');
   observed.components.forEach((component,p)=>verifyComponent(component,c,p,index,full));
  }
  const expectedRows=contracts.flatMap(c=>snapshot.tables.find(t=>t.table===c.table)!.rows.map(row=>({contract:c,row,id:canonicalOwnershipJson([c.contractId,row.key])}))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(!Array.isArray(capture.rows)||capture.rows.length!==expectedRows.length)fail('KEY_COMPARATOR_ROW_COVERAGE');
  const identicalClasses=new Map<string,string>();
  for(let i=0;i<expectedRows.length;i++){
   const observed=capture.rows[i],{contract,row,id}=expectedRows[i];
   if(!exact(observed,['contractId','key','rowChecksum','included','comparisonClass'])||canonicalOwnershipJson([observed.contractId,observed.key])!==id)fail('KEY_COMPARATOR_ROW_COVERAGE');
   const selected=contract.columns.map(n=>row.columns.find(c=>c.name===n)!);
   const included=selected.every(c=>c.lineage.source.kind!=='SQL_NULL')&&(contract.label!=='active_endpoint_global'||row.columns.find(c=>c.name==='status')!.wire==='active');
   if(observed.rowChecksum!==row.originalChecksum||observed.included!==included||(included?(typeof observed.comparisonClass!=='string'||!OID.test(observed.comparisonClass)):observed.comparisonClass!==null))fail('KEY_COMPARATOR_ROW_DRIFT');
   if(included){
    const tuple=canonicalOwnershipJson([contract.contractId,selected.map(c=>({type:c.type,wire:c.wire}))]);
    const existing=identicalClasses.get(tuple);if(existing!==undefined&&existing!==observed.comparisonClass)fail('KEY_COMPARATOR_IDENTICAL_TUPLE_CLASS_DRIFT');
    identicalClasses.set(tuple,observed.comparisonClass as string);
   }
  }
  const {format:capturedFormat,...capturedBody}=body;void capturedFormat;
  const observedBody={format:'TYPED_KEY_COMPARATOR_OBSERVATIONS_V1' as const,...capturedBody,captureChecksum,verification:'PURE_NOT_DATABASE_OPERATOR_OR_TENANT_AUTHORITY' as const,remainingGates:['ACTUAL_SAME_TRANSACTION_COLLECTION_AND_OPERATOR_AUTHORITY','LIVE_SQL_KEY_UNIQUENESS_AND_INDEX_EFFECTS','OTHER_BTREE_SUPPORT_AND_RUNTIME_CATALOG_TAMPER_RESISTANCE','TYPED_CONSTRAINT_AND_OWNERSHIP_INTEGRATION','ACTUAL_PG17_AND_NEON_TARGET_VERIFICATION']};
  const observations=freeze({...observedBody,digest:ownershipDigest(observedBody)});
  issued.add(observations);return Object.freeze({status:'VALIDATED',observations});
 }catch(error){return Object.freeze({status:'BLOCKED',code:error instanceof ComparatorFailure?error.code:'UNSUPPORTED_KEY_COMPARATOR_INPUT'});}
}
/** Trap-free pure local validation provenance only. Clones/proxies never issue. */
export function isIssuedTypedKeyComparatorObservations(input:unknown):input is TypedKeyComparatorObservations{
 return typeof input==='object'&&input!==null&&issued.has(input);
}

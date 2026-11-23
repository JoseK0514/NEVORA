'use client';
import type {ShiftHistoryView} from '../lib/data/shift-change-views';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {shiftCopy} from './shift-copy';
export function ShiftChangeHistory({events}:{events:ShiftHistoryView[]|null}){const t=shiftCopy(usePortalLang()).history;return events===null?<p className="shift-change-unavailable" role="status">{t.unavailable}</p>:events.length?<details className="shift-change-history"><summary>{t.title}</summary><ol>{events.map((e,i)=><li key={`${e.revision}-${i}`}><strong>{e.event} · {t.revision(e.revision)}</strong><span>{e.at}{e.mode?` · ${e.mode}`:''}</span>{e.source?<span>{t.source}{e.source}</span>:null}{e.target?<span>{t.target}{e.target}</span>:null}</li>)}</ol></details>:null;}

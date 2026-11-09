"use client";
import type {RefObject} from 'react';
import {PASSKEY_COPY} from '@/lib/passkeys/copy';
import type {Passkey} from '@/lib/passkeys/client';
import {SigPendingLabel} from '@/components/signature/sig-button';
const t=PASSKEY_COPY.en;
const dateLabel=(iso:string)=>new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
type Props={load:'loading'|'ready'|'failed';passkeys:Passkey[];busy:'add'|'remove'|null;notice:{tone:'done'|'error';text:string}|null;confirm:Passkey|null;supported:boolean;phone:boolean;disabled?:boolean;dialog:RefObject<HTMLDialogElement|null>;addButton:RefObject<HTMLButtonElement|null>;onRefresh:()=>void;onAdd:()=>void;onReview:(key:Passkey,button:HTMLButtonElement)=>void;onRemove:(key:Passkey)=>void;onKeep:()=>void};
/** Shared incumbent desktop/management markup, without a data or ceremony owner. */
export function PasskeyDesktopView({load,passkeys,busy,notice,confirm,supported,phone,disabled=false,dialog,addButton,onRefresh,onAdd,onReview,onRemove,onKeep}:Props){
  return (
    <section className="nv-card pk-section" aria-labelledby="passkeys-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="passkeys-title">{t.sectionTitle}</h2></div>
      <div className="nv-card__body pk-body">
        {load === "loading" ? <p className="pk-muted" role="status">{t.loading}</p> : null}
        {load === "failed" ? <p className="pk-notice" data-tone="error" role="alert">{t.loadFailed} <button type="button" className="nv-link" onClick={onRefresh}>{t.tryAgain}</button></p> : null}
        {load === "ready" && passkeys.length === 0 ? <p className="pk-muted">{t.empty}</p> : null}
        {passkeys.length ? <ul className="pk-list">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="pk-item">
              <span className="pk-item__text">
                <span className="pk-item__name">{passkey.name}</span>
                <span className="pk-item__meta">{t.added(dateLabel(passkey.createdAt))} · {passkey.lastUsedAt ? t.lastUsed(dateLabel(passkey.lastUsedAt)) : t.neverUsed}</span>
              </span>
              <button type="button" className="nv-link pk-remove" aria-label={t.removeLabel(passkey.name)} disabled={disabled || busy !== null}
                onClick={event => onReview(passkey,event.currentTarget)}>{t.remove}</button>
            </li>
          ))}
        </ul> : null}
        {notice ? <p className="pk-notice" data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
        {supported ? <button ref={addButton} type="button" className="nv-btn pk-add" data-kind="secondary" onClick={onAdd} disabled={disabled || busy === "remove"} aria-disabled={busy === "add" || undefined} aria-busy={busy === "add"}>
          <SigPendingLabel pending={busy === "add"} pendingText={t.settingUp}>{phone ? t.setUpPhone : t.setUpDesktop}</SigPendingLabel>
        </button> : <p className="pk-muted">{t.notSupported}</p>}
      </div>
      <dialog ref={dialog} className="pk-dialog" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body"
        onClose={() => { if (confirm) onKeep(); }}>
        {confirm ? <form method="dialog" className="pk-dialog__form" onSubmit={event => event.preventDefault()}>
          <h2 id="passkey-remove-title" className="pk-dialog__title">{t.confirmTitle(confirm.name)}</h2>
          <p id="passkey-remove-body" className="pk-muted">{t.confirmBody}</p>
          <div className="pk-dialog__actions">
            <button type="button" className="nv-btn" data-kind="danger" onClick={() => onRemove(confirm)} aria-disabled={busy === "remove" || undefined} aria-busy={busy === "remove"}><SigPendingLabel pending={busy === "remove"} pendingText={t.removing}>{t.remove}</SigPendingLabel></button>
            <button type="button" className="nv-btn" data-kind="secondary" data-autofocus="" onClick={onKeep} disabled={disabled || busy === "remove"}>{t.keep}</button>
          </div>
        </form> : null}
      </dialog>
    </section>
  );
}

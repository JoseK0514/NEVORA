'use client';

import type {ReactNode} from 'react';
import {Button} from './controls';
import {StatusLabel, type Tone} from './feedback';
import {Avatar} from './surfaces';
import {ClockerIcon} from '../clocker-icon';
import {DoneTick} from '../owner-b/b-glyphs';

export function ApprovalRow({
  name,
  request,
  detail,
  label,
  tone,
  actions,
}: {
  name: string;
  request: string;
  detail: string;
  label: string;
  tone: Tone;
  actions?: ReactNode;
}) {
  return (
    <article className="np-approval">
      <div className="np-record">
        <Avatar name={name} />
        <span className="np-row-copy">
          <strong>{name}</strong>
          <small>{request}</small>
        </span>
        <StatusLabel tone={tone}>{label}</StatusLabel>
      </div>
      <p>{detail}</p>
      {actions && <div className="np-actions">{actions}</div>}
    </article>
  );
}

export function PunchReceipt({
  confirmed,
  title,
  detail,
  reference,
  action,
  onAction,
}: {
  confirmed: boolean;
  title: string;
  detail: string;
  reference?: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="np-result" data-tone={confirmed ? 'success' : 'warning'}>
      <span className="np-disc">
        {confirmed ? (
          <DoneTick size={26} />
        ) : (
          <ClockerIcon name="unknown" weight="bold" size={26} />
        )}
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {reference && <code className="np-reference">{reference}</code>}
      <Button variant={confirmed ? 'secondary' : 'primary'} onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

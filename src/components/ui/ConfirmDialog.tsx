import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  loading = false,
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Add a short note for the audit log…',
  children
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const disabled = requireReason && reason.trim().length < 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
      <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          disabled={disabled}
          onClick={() => onConfirm(reason.trim())}>
          
            {confirmLabel}
          </Button>
        </>
      }>
      
      {children}
      {requireReason &&
      <label className="mt-1 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{reasonLabel}</span>
          <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={reasonPlaceholder}
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/15" />
        
          <span className="mt-1 block text-[11.5px] text-ink-3">Recorded in the audit log with your name and timestamp.</span>
        </label>
      }
    </Modal>);

}
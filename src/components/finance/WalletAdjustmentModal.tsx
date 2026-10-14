import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UsersIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useRequestAdjustment } from '../../hooks/mutations';
import { describeMutationError } from '../../api/errors';
import { formatFils, parseAedToFils } from '../../utils/money';

const MAX_FILS = 1_000_000_000; // the backend's own ceiling per adjustment

const schema = z.object({
  bucket: z.enum(['AVAILABLE', 'PENDING']),
  direction: z.enum(['credit', 'debit']),
  amount: z.
  string().
  min(1, 'Enter an amount').
  refine((v) => parseAedToFils(v) !== null, 'Use a number with up to 2 decimals').
  refine((v) => (parseAedToFils(v) ?? 0) > 0, 'Amount must be greater than zero').
  refine((v) => (parseAedToFils(v) ?? 0) <= MAX_FILS, 'Amount is above the maximum allowed'),
  reason: z.string().trim().min(5, 'Describe the reason in at least 5 characters').max(500)
});

type FormValues = z.infer<typeof schema>;

interface WalletAdjustmentModalProps {
  nurse: {id: string;name: string;availableMinor: number;} | null;
  onClose: () => void;
}

/**
 * Maker side of maker-checker. The amount typed here is only a request: the backend decides whether it is
 * applied immediately (small amounts) or parked as PENDING until a different finance approver approves it.
 * The wallet balance is never touched by the browser.
 */
export function WalletAdjustmentModal({ nurse, onClose }: WalletAdjustmentModalProps) {
  const request = useRequestAdjustment();
  const { register, handleSubmit, watch, reset, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bucket: 'AVAILABLE', direction: 'credit', amount: '', reason: '' }
  });

  // One Idempotency-Key per distinct attempt: retrying the *same* request after a network error reuses it
  // (so the server can never apply it twice); editing any field starts a new attempt with a new key.
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (nurse) {
      reset({ bucket: 'AVAILABLE', direction: 'credit', amount: '', reason: '' });
      attempt.current = null;
    }
  }, [nurse, reset]);

  const direction = watch('direction');
  const bucket = watch('bucket');
  const parsed = parseAedToFils(watch('amount') ?? '');

  const onSubmit = (values: FormValues) => {
    if (!nurse || request.isPending) return;
    const fils = parseAedToFils(values.amount);
    if (fils === null) return;
    const amountMinor = values.direction === 'credit' ? fils : -fils;
    const body = { bucket: values.bucket, amountMinor, reason: values.reason.trim() };
    const fingerprint = JSON.stringify([nurse.id, body]);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };

    request.mutate(
      { nurseId: nurse.id, body, idempotencyKey: attempt.current.key },
      {
        onSuccess: (result) => {
          toast.success(result.applied ? 'Adjustment applied' : 'Adjustment submitted for approval', {
            description: result.applied ?
            'The amount was within the immediate limit, so the server applied it to the ledger.' :
            'No balance has changed. A different finance approver must approve it first.'
          });
          onClose();
        },
        onError: (e) => toast.error(describeMutationError(e, "Couldn't submit the request. Nothing was changed."))
      }
    );
  };

  return (
    <Modal
      open={Boolean(nurse)}
      onClose={onClose}
      title="Request wallet adjustment"
      description={nurse && `${nurse.name} · available ${formatFils(nurse.availableMinor)}`}
      footer={
      <>
          <Button variant="ghost" onClick={onClose} disabled={request.isPending}>Cancel</Button>
          <Button variant="primary" loading={request.isPending} onClick={handleSubmit(onSubmit)}>
            Submit request
          </Button>
        </>
      }>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Balance</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Balance to adjust">
            {([['AVAILABLE', 'Available'], ['PENDING', 'On hold']] as const).map(([value, text]) =>
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={bucket === value}
              onClick={() => setValue('bucket', value)}
              className={`h-9 rounded-md border text-[13px] font-medium transition-colors ${bucket === value ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-subtle'}`}>

                {text}
              </button>
            )}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Direction</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Direction">
            {(['credit', 'debit'] as const).map((d) =>
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => setValue('direction', d)}
              className={`h-9 rounded-md border text-[13px] font-medium capitalize transition-colors ${direction === d ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-subtle'}`}>

                {d}
              </button>
            )}
          </div>
        </div>
        <TextField
          label="Amount"
          prefix="AED"
          inputMode="decimal"
          placeholder="0.00"
          {...register('amount')}
          error={formState.errors.amount?.message}
          hint={parsed !== null && parsed > 0 ? `${direction === 'credit' ? '+' : '−'}${parsed.toLocaleString('en-US')} fils will be requested` : 'Up to 2 decimal places'} />

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Reason</span>
          <textarea
            rows={3}
            {...register('reason')}
            placeholder="e.g. Compensation for a platform-cancelled shift"
            className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15" />

          {formState.errors.reason && <span className="mt-1 block text-[11.5px] text-danger">{formState.errors.reason.message}</span>}
        </label>
        <div className="flex items-start gap-2 rounded-md bg-subtle/70 px-3 py-2.5 text-[12px] text-ink-2">
          <UsersIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          Maker–checker: amounts above the server's immediate limit are held until a different finance approver approves them. A debit can never take a balance below zero.
        </div>
      </form>
    </Modal>);

}

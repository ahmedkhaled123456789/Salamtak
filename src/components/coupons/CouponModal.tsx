import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { useCreateCoupon } from '../../hooks/mutations';
import { describeMutationError } from '../../api/errors';
import { parseAedToFils, parsePercentToBps } from '../../utils/money';
import type { CouponCreate } from '../../api/types';

const optionalInt = (max: number) =>
z.string().refine((v) => v === '' || /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= max, `Whole number from 1 to ${max.toLocaleString('en-US')}`);
const optionalAed = z.string().refine((v) => v === '' || parseAedToFils(v) !== null && (parseAedToFils(v) ?? 0) > 0, 'Enter a valid AED amount');

const schema = z.
object({
  code: z.string().trim().min(3, 'At least 3 characters').max(40).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  description: z.string().trim().max(300),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.string().min(1, 'Enter a value'),
  maxDiscount: optionalAed,
  minBooking: z.string().refine((v) => v === '' || parseAedToFils(v) !== null, 'Enter a valid AED amount'),
  usageLimit: optionalInt(10_000_000),
  perUserLimit: optionalInt(1000),
  startDate: z.string().min(1, 'Choose a start date'),
  endDate: z.string().min(1, 'Choose an end date')
}).
superRefine((v, ctx) => {
  if (v.type === 'PERCENTAGE') {
    if (parsePercentToBps(v.value) === null) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage from 0.01 to 100' });
  } else if (parseAedToFils(v.value) === null || (parseAedToFils(v.value) ?? 0) <= 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a valid AED amount' });
  }
  if (v.startDate && v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End must not be before the start' });
});

type FormValues = z.infer<typeof schema>;

const today = () => format(new Date(), 'yyyy-MM-dd');
const defaults = (): FormValues => ({
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  maxDiscount: '',
  minBooking: '',
  usageLimit: '',
  perUserLimit: '',
  startDate: today(),
  endDate: format(addDays(new Date(), 30), 'yyyy-MM-dd')
});

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
}

export function CouponModal({ open, onClose }: CouponModalProps) {
  const create = useCreateCoupon();
  const { register, handleSubmit, watch, setValue, reset, setError, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });

  useEffect(() => {
    if (open) reset(defaults());
  }, [open, reset]);

  const type = watch('type');

  const onSubmit = (v: FormValues) => {
    if (create.isPending) return;
    const body: CouponCreate = {
      code: v.code.trim(),
      description: v.description.trim() || undefined,
      type: v.type,
      valueBps: v.type === 'PERCENTAGE' ? parsePercentToBps(v.value) ?? undefined : undefined,
      valueMinor: v.type === 'FIXED' ? parseAedToFils(v.value) ?? undefined : undefined,
      maxDiscountMinor: v.type === 'PERCENTAGE' && v.maxDiscount ? parseAedToFils(v.maxDiscount) ?? undefined : undefined,
      minBookingAmountMinor: v.minBooking ? parseAedToFils(v.minBooking) ?? undefined : undefined,
      usageLimit: v.usageLimit ? Number(v.usageLimit) : undefined,
      perUserLimit: v.perUserLimit ? Number(v.perUserLimit) : undefined,
      startAt: new Date(`${v.startDate}T00:00:00`).toISOString(),
      endAt: new Date(`${v.endDate}T23:59:59`).toISOString()
    };
    create.mutate(body, {
      onSuccess: (coupon) => {
        toast.success(`Coupon ${coupon.code} created`, { description: 'It is active and can be used within its dates.' });
        onClose();
      },
      onError: (e) => {
        // Surface the backend's own validation message on the offending field when it names one.
        const detail = (e as {details?: {field?: string;message: string;}[];}).details?.[0];
        if (detail?.field === 'code') setError('code', { message: detail.message });
        toast.error(describeMutationError(e));
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create coupon"
      description="Takes effect immediately. Discount amounts are always calculated by the server at booking time."
      widthClassName="sm:max-w-[560px]"
      footer={
      <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={handleSubmit(onSubmit)}>Create coupon</Button>
        </>
      }>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Code" placeholder="WELCOME15" autoCapitalize="characters" {...register('code')} error={formState.errors.code?.message} hint="Unique, not case-sensitive" />
          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Discount type</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Discount type">
              {([['PERCENTAGE', 'Percentage'], ['FIXED', 'Fixed amount']] as const).map(([value, text]) =>
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={type === value}
                onClick={() => setValue('type', value)}
                className={`h-9 rounded-md border text-[13px] font-medium transition-colors ${type === value ? 'border-brand/40 bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-subtle'}`}>

                  {text}
                </button>
              )}
            </div>
          </div>
        </div>
        <TextField label="Description (optional)" {...register('description')} error={formState.errors.description?.message} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label={type === 'PERCENTAGE' ? 'Percentage off' : 'Amount off'}
            prefix={type === 'FIXED' ? 'AED' : undefined}
            suffix={type === 'PERCENTAGE' ? '%' : undefined}
            inputMode="decimal"
            {...register('value')}
            error={formState.errors.value?.message} />

          {type === 'PERCENTAGE' ?
          <TextField label="Maximum discount (optional)" prefix="AED" inputMode="decimal" {...register('maxDiscount')} error={formState.errors.maxDiscount?.message} /> :
          <TextField label="Minimum booking (optional)" prefix="AED" inputMode="decimal" {...register('minBooking')} error={formState.errors.minBooking?.message} />
          }
        </div>
        {type === 'PERCENTAGE' && <TextField label="Minimum booking (optional)" prefix="AED" inputMode="decimal" {...register('minBooking')} error={formState.errors.minBooking?.message} />}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Total uses (optional)" inputMode="numeric" {...register('usageLimit')} error={formState.errors.usageLimit?.message} />
          <TextField label="Uses per patient (optional)" inputMode="numeric" {...register('perUserLimit')} error={formState.errors.perUserLimit?.message} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Valid from" type="date" {...register('startDate')} error={formState.errors.startDate?.message} />
          <TextField label="Valid until" type="date" {...register('endDate')} error={formState.errors.endDate?.message} />
        </div>
      </form>
    </Modal>);

}

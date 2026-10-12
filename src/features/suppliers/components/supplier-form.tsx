import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormSection } from '@/components/form/form-field';
import { supplierSchema } from '../schemas';
import type { SupplierInput } from '../schemas';

const SESSIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
] as const;

export function SupplierForm({
  defaultValues,
  onSubmit,
  submitting,
}: {
  defaultValues?: Partial<SupplierInput>;
  onSubmit: (values: SupplierInput) => void | Promise<void>;
  submitting?: boolean;
}) {
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema) as unknown as Resolver<SupplierInput>,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      location: '',
      pincode: '',
      joiningDate: '',
      collectionSessions: ['morning', 'evening'],
      defaultMorningQty: undefined,
      defaultEveningQty: undefined,
      defaultRatePerLiter: undefined,
      isActive: true,
      notes: '',
      ...defaultValues,
      bankDetails: {
        holderName: defaultValues?.bankDetails?.holderName ?? '',
        accountNo: defaultValues?.bankDetails?.accountNo ?? '',
        ifscCode: defaultValues?.bankDetails?.ifscCode ?? '',
        bankName: defaultValues?.bankDetails?.bankName ?? '',
      },
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormSection title="Basic details">
        <FormField label="Name" required error={errors.name?.message}>
          <Input placeholder="Supplier name" {...register('name')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Phone" required error={errors.phone?.message}>
            <Input placeholder="10-digit mobile" inputMode="numeric" maxLength={10} {...register('phone')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="Email (optional)" {...register('email')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Location" error={errors.location?.message}>
            <Input placeholder="Village / area" {...register('location')} />
          </FormField>
          <FormField label="Pincode" error={errors.pincode?.message}>
            <Input placeholder="Pincode" {...register('pincode')} />
          </FormField>
          <FormField label="Joining date" error={errors.joiningDate?.message}>
            <Input type="date" {...register('joiningDate')} />
          </FormField>
        </div>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
              <Checkbox checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />
              Active supplier
            </label>
          )}
        />
      </FormSection>

      <FormSection title="Collection defaults" description="Expected quantity and rate per session">
        <FormField label="Collection sessions" error={errors.collectionSessions?.message}>
          <Controller
            control={control}
            name="collectionSessions"
            render={({ field }) => (
              <div className="flex gap-4">
                {SESSIONS.map((s) => (
                  <label key={s.value} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={(field.value ?? []).includes(s.value)}
                      onChange={(e) => {
                        const current = field.value ?? [];
                        field.onChange(
                          e.target.checked ? [...current, s.value] : current.filter((v) => v !== s.value),
                        );
                      }}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            )}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Morning qty (L)" error={errors.defaultMorningQty?.message}>
            <Input type="number" min={0} {...register('defaultMorningQty', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Evening qty (L)" error={errors.defaultEveningQty?.message}>
            <Input type="number" min={0} {...register('defaultEveningQty', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Rate / litre (₹)" error={errors.defaultRatePerLiter?.message}>
            <Input type="number" min={0} {...register('defaultRatePerLiter', { valueAsNumber: true })} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Bank details" description="Used for payouts">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Account holder">
            <Input placeholder="Holder name" {...register('bankDetails.holderName')} />
          </FormField>
          <FormField label="Account number">
            <Input placeholder="Account no." {...register('bankDetails.accountNo')} />
          </FormField>
          <FormField label="IFSC">
            <Input placeholder="IFSC code" {...register('bankDetails.ifscCode')} />
          </FormField>
          <FormField label="Bank name">
            <Input placeholder="Bank name" {...register('bankDetails.bankName')} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea placeholder="Any additional notes…" {...register('notes')} />
        </FormField>
      </FormSection>

      <Button type="submit" loading={submitting} className="min-h-11 w-full sm:w-auto">
        Save supplier
      </Button>
    </form>
  );
}

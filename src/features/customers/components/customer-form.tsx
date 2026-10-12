import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField, FormSection } from '@/components/form/form-field';
import { createCustomerSchema, updateCustomerSchema } from '../schemas';
import type { CreateCustomerInput, UpdateCustomerInput } from '../schemas';

export interface AreaOption {
  id: string;
  name: string;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  submitting,
  mode,
  areas,
}: {
  defaultValues?: Partial<UpdateCustomerInput>;
  onSubmit: (values: CreateCustomerInput | UpdateCustomerInput) => void | Promise<void>;
  submitting?: boolean;
  mode: 'create' | 'edit';
  areas: AreaOption[];
}) {
  const schema = mode === 'create' ? createCustomerSchema : updateCustomerSchema;
  const form = useForm<UpdateCustomerInput>({
    resolver: zodResolver(schema as typeof updateCustomerSchema) as unknown as Resolver<UpdateCustomerInput>,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'customer',
      isActive: true,
      password: '',
      ...defaultValues,
      address: {
        street: defaultValues?.address?.street ?? '',
        city: defaultValues?.address?.city ?? '',
        pincode: defaultValues?.address?.pincode ?? '',
      },
      deliveryConfig: {
        assignedArea: defaultValues?.deliveryConfig?.assignedArea ?? '',
        deliverySequence: defaultValues?.deliveryConfig?.deliverySequence,
      },
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(mode === 'create' ? ({ ...values } as unknown as CreateCustomerInput) : values as unknown as UpdateCustomerInput))}
      className="flex flex-col gap-4"
    >
      <FormSection title="Basic details">
        <FormField label="Name" required error={errors.name?.message}>
          <Input placeholder="Full name" {...register('name')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Phone" required error={errors.phone?.message}>
            <Input placeholder="10-digit mobile" inputMode="numeric" maxLength={10} {...register('phone')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="Email (optional)" {...register('email')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Role" error={errors.role?.message}>
            <Select {...register('role')}>
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label={mode === 'create' ? 'Password' : 'New password'} required={mode === 'create'} error={errors.password?.message}>
            <Input
              type="password"
              placeholder={mode === 'create' ? 'Min 6 characters' : 'Leave blank to keep existing'}
              {...register('password')}
            />
          </FormField>
        </div>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
              <Checkbox checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />
              Active customer
            </label>
          )}
        />
      </FormSection>

      <FormSection title="Address" description="Used for deliveries and billing">
        <FormField label="Street" error={errors.address?.street?.message}>
          <Input placeholder="Street / landmark" {...register('address.street')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="City" error={errors.address?.city?.message}>
            <Input placeholder="City" {...register('address.city')} />
          </FormField>
          <FormField label="Pincode" error={errors.address?.pincode?.message}>
            <Input placeholder="6-digit pincode" inputMode="numeric" maxLength={6} {...register('address.pincode')} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Delivery config" description="Route planning for the delivery agent">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Assigned area" error={errors.deliveryConfig?.assignedArea?.message}>
            <Select {...register('deliveryConfig.assignedArea')}>
              <option value="">Unassigned</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Delivery sequence" error={errors.deliveryConfig?.deliverySequence?.message}>
            <Input
              type="number"
              min={0}
              placeholder="Route order"
              {...register('deliveryConfig.deliverySequence', { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </FormSection>

      <Button type="submit" loading={submitting} className="min-h-11 w-full sm:w-auto">
        {mode === 'create' ? 'Create customer' : 'Save changes'}
      </Button>
    </form>
  );
}

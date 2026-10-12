import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField, FormSection } from '@/components/form/form-field';
import { agentSchema, createAgentSchema } from '../schemas';
import type { CreateAgentInput, UpdateAgentInput } from '../schemas';

export interface AreaOption {
  id: string;
  name: string;
}

export function AgentForm({
  defaultValues,
  onSubmit,
  submitting,
  mode,
  areas,
}: {
  defaultValues?: Partial<UpdateAgentInput>;
  onSubmit: (values: CreateAgentInput | UpdateAgentInput) => void | Promise<void>;
  submitting?: boolean;
  mode: 'create' | 'edit';
  areas: AreaOption[];
}) {
  const schema = mode === 'create' ? createAgentSchema : agentSchema;
  const form = useForm<UpdateAgentInput>({
    resolver: zodResolver(schema as typeof agentSchema) as unknown as Resolver<UpdateAgentInput>,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      isActive: true,
      ...defaultValues,
      agentInfo: {
        joiningDate: defaultValues?.agentInfo?.joiningDate ?? '',
        vehicleType: defaultValues?.agentInfo?.vehicleType ?? '',
        maxCapacity: defaultValues?.agentInfo?.maxCapacity,
        assignedArea:
          typeof defaultValues?.agentInfo?.assignedArea === 'string'
            ? defaultValues.agentInfo.assignedArea
            : '',
      },
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = form;

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(mode === 'create' ? ({ ...values } as unknown as CreateAgentInput) : values as unknown as UpdateAgentInput))}
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
        <FormField label={mode === 'create' ? 'Password' : 'New password'} required={mode === 'create'} error={errors.password?.message}>
          <Input
            type="password"
            placeholder={mode === 'create' ? 'Min 6 characters' : 'Leave blank to keep existing'}
            {...register('password')}
          />
        </FormField>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
              <Checkbox checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />
              Active agent
            </label>
          )}
        />
      </FormSection>

      <FormSection title="Work details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Joining date" error={errors.agentInfo?.joiningDate?.message}>
            <Input type="date" {...register('agentInfo.joiningDate')} />
          </FormField>
          <FormField label="Vehicle type" error={errors.agentInfo?.vehicleType?.message}>
            <Input placeholder="Bike / Van / …" {...register('agentInfo.vehicleType')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Max capacity" error={errors.agentInfo?.maxCapacity?.message}>
            <Input type="number" min={0} placeholder="Orders per day" {...register('agentInfo.maxCapacity', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Assigned area" error={errors.agentInfo?.assignedArea?.message}>
            <Select {...register('agentInfo.assignedArea')}>
              <option value="">Unassigned</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </FormSection>

      <Button type="submit" loading={submitting} className="min-h-11 w-full sm:w-auto">
        {mode === 'create' ? 'Create agent' : 'Save changes'}
      </Button>
    </form>
  );
}

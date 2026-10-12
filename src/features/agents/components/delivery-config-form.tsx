import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import type { AreaOption } from './agent-form';

const deliveryConfigSchema = z.object({
  assignedArea: z.string().optional(),
  deliverySequence: z.coerce.number().min(0).optional(),
  slot: z.enum(['morning', 'evening', 'both']).optional(),
});

export type DeliveryConfigValues = z.infer<typeof deliveryConfigSchema>;

export function DeliveryConfigForm({
  defaultValues,
  onSubmit,
  submitting,
  areas,
}: {
  defaultValues?: Partial<DeliveryConfigValues>;
  onSubmit: (values: DeliveryConfigValues) => void | Promise<void>;
  submitting?: boolean;
  areas: AreaOption[];
}) {
  const form = useForm<DeliveryConfigValues>({
    resolver: zodResolver(deliveryConfigSchema) as unknown as Resolver<DeliveryConfigValues>,
    defaultValues: { assignedArea: '', deliverySequence: undefined, slot: 'morning', ...defaultValues },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Assigned area" error={errors.assignedArea?.message}>
          <Select {...register('assignedArea')}>
            <option value="">Unassigned</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Delivery sequence" error={errors.deliverySequence?.message}>
          <Input type="number" min={0} placeholder="Route order" {...register('deliverySequence', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Slot" error={errors.slot?.message}>
          <Select {...register('slot')}>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="both">Both</option>
          </Select>
        </FormField>
      </div>
      <Button type="submit" loading={submitting} className="min-h-11 w-full sm:w-auto">
        Save delivery config
      </Button>
    </form>
  );
}

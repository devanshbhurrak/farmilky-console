import * as React from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import { areaSchema, type AreaInput } from '../schemas';

interface AreaFormProps {
  defaultValues?: Partial<AreaInput>;
  agents: { id: string; name: string }[];
  onSubmit: (data: AreaInput) => void | Promise<void>;
  submitting?: boolean;
}

function toCsv(values: string[] | undefined): string {
  return (values ?? []).join(', ');
}

function fromCsv(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

export function AreaForm({ defaultValues, agents, onSubmit, submitting }: AreaFormProps) {
  const [pincodesText, setPincodesText] = React.useState(() => toCsv(defaultValues?.pincodes));
  const [localitiesText, setLocalitiesText] = React.useState(() => toCsv(defaultValues?.localities));

  const form = useForm<AreaInput>({
    resolver: zodResolver(areaSchema) as unknown as Resolver<AreaInput>,
    defaultValues: {
      name: defaultValues?.name ?? '',
      pincodes: defaultValues?.pincodes ?? [],
      localities: defaultValues?.localities ?? [],
      assignedAgent: defaultValues?.assignedAgent ?? '',
      sequence: defaultValues?.sequence ?? 0,
    },
  });

  const handleSubmit = (values: AreaInput) => {
    onSubmit({
      ...values,
      pincodes: fromCsv(pincodesText),
      localities: fromCsv(localitiesText),
      assignedAgent: values.assignedAgent?.trim() ? values.assignedAgent.trim() : undefined,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4" noValidate>
      <FormField label="Name" required error={form.formState.errors.name?.message}>
        <Input placeholder="e.g. Sector 12" {...form.register('name')} />
      </FormField>
      <FormField
        label="Pincodes"
        hint="Comma-separated, e.g. 110001, 110002"
        error={form.formState.errors.pincodes?.message}
      >
        <Input
          value={pincodesText}
          onChange={(e) => setPincodesText(e.target.value)}
          placeholder="110001, 110002"
          inputMode="numeric"
        />
      </FormField>
      <FormField
        label="Localities"
        hint="Comma-separated, e.g. Green Park, Hauz Khas"
        error={form.formState.errors.localities?.message}
      >
        <Input
          value={localitiesText}
          onChange={(e) => setLocalitiesText(e.target.value)}
          placeholder="Green Park, Hauz Khas"
        />
      </FormField>
      <FormField label="Assigned agent" error={form.formState.errors.assignedAgent?.message}>
        <Select {...form.register('assignedAgent')}>
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Sequence" error={form.formState.errors.sequence?.message}>
        <Input type="number" min={0} step={1} {...form.register('sequence')} />
      </FormField>
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Save area
      </Button>
    </form>
  );
}

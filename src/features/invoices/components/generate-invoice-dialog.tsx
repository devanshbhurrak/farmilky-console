import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import { useDebounce } from '@/hooks/use-debounce';
import { getErrorMessage, getId, getName, normalizeList, todayLocal } from '@/lib/utils';
import { invoicesApi } from '../api';
import { generateSchema, type GenerateInvoiceInput } from '../schemas';
import { useGenerateInvoice } from '../hooks';

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (invoiceId: string) => void;
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GenerateInvoiceInput>({
    resolver: zodResolver(generateSchema),
    defaultValues: { userId: '', from: todayLocal(), to: todayLocal() },
  });

  const selectedUserId = watch('userId');

  const customersQuery = useQuery({
    queryKey: ['invoices', 'customers-lite', debouncedCustomerSearch],
    queryFn: async () => {
      const res = await invoicesApi.customersLite(debouncedCustomerSearch || undefined);
      return normalizeList<{ id?: string; _id?: string; name: string }>(res, ['customers', 'users']).items;
    },
    enabled: open,
  });

  const generateInvoice = useGenerateInvoice();

  const onSubmit = (values: GenerateInvoiceInput) => {
    generateInvoice.mutate(
      { userId: values.userId, input: { from: values.from, to: values.to } },
      {
        onSuccess: (res) => {
          const data = (res as { data?: { id?: string; _id?: string } }).data;
          const id = data && typeof data === 'object' ? String(data.id ?? data._id ?? '') : '';
          onOpenChange(false);
          onSuccess?.(id);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Generate invoice</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" id="generate-invoice-form">
          <FormField label="Search customer" hint="Type to filter the customer list">
            <Input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="min-h-11"
            />
          </FormField>
          <FormField label="Customer" required error={errors.userId?.message}>
            <Select
              value={selectedUserId}
              onChange={(e) => setValue('userId', e.target.value, { shouldValidate: true })}
              className="min-h-11"
            >
              <option value="">Select customer</option>
              {(customersQuery.data ?? []).map((c) => (
                <option key={getId(c)} value={getId(c)}>
                  {getName(c)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="From" required error={errors.from?.message}>
              <Input type="date" {...register('from')} className="min-h-11" />
            </FormField>
            <FormField label="To" required error={errors.to?.message}>
              <Input type="date" {...register('to')} className="min-h-11" />
            </FormField>
          </div>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-11">
          Cancel
        </Button>
        <Button
          type="submit"
          form="generate-invoice-form"
          loading={isSubmitting || generateInvoice.isPending}
          className="min-h-11"
        >
          Generate
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

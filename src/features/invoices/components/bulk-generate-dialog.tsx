import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import { getErrorMessage } from '@/lib/utils';
import { bulkGenerateSchema, type BulkGenerateInput } from '../schemas';
import { useGenerateBulk } from '../hooks';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function BulkGenerateDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const now = new Date();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BulkGenerateInput>({
    resolver: zodResolver(bulkGenerateSchema) as unknown as Resolver<BulkGenerateInput>,
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  const generateBulk = useGenerateBulk();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const onSubmit = (values: BulkGenerateInput) => {
    generateBulk.mutate(
      { month: Number(values.month), year: Number(values.year) },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Bulk generate invoices</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" id="bulk-generate-form">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Month" required error={errors.month?.message}>
              <Select {...register('month')} className="min-h-11">
                {MONTHS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Year" required error={errors.year?.message}>
              <Select {...register('year')} className="min-h-11">
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <p className="text-xs text-slate-500">
            Generates invoices for all eligible customers for the selected billing month. Already-generated
            invoices are skipped (idempotent).
          </p>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-11">
          Cancel
        </Button>
        <Button
          type="submit"
          form="bulk-generate-form"
          loading={isSubmitting || generateBulk.isPending}
          className="min-h-11"
        >
          Generate all
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

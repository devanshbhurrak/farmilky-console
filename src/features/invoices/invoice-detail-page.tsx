import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { StatusBadge } from '@/components/data/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/form/form-field';
import { formatCurrency, formatDate, getErrorMessage, getId } from '@/lib/utils';
import { invoicesApi } from './api';
import { voidSchema, type VoidInvoiceInput } from './schemas';
import { useInvoice, useRegenerateInvoice, useSendWhatsapp, useUpdateInvoiceStatus } from './hooks';
import { InvoiceLineItems } from './components/invoice-line-items';
import { UpiQrSection } from './components/upi-qr-section';
import { customerLabel, periodLabel } from './components/invoice-table';

export default function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const invoiceQuery = useInvoice(id);
  const invoice = invoiceQuery.data;

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const updateStatus = useUpdateInvoiceStatus();
  const sendWhatsapp = useSendWhatsapp();
  const regenerate = useRegenerateInvoice();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VoidInvoiceInput>({
    resolver: zodResolver(voidSchema),
    defaultValues: { voidReason: '' },
  });

  const handleSendWhatsapp = () => {
    if (!invoice) return;
    const invoiceId = getId(invoice);
    if (String(invoice.status) === 'draft') {
      updateStatus.mutate(
        { id: invoiceId, status: 'sent' },
        {
          onSuccess: () => sendWhatsapp.mutate(invoiceId),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      sendWhatsapp.mutate(invoiceId);
    }
  };

  const handleVoid = (values: VoidInvoiceInput) => {
    if (!invoice) return;
    updateStatus.mutate(
      { id: getId(invoice), status: 'void', extra: { voidReason: values.voidReason } },
      {
        onSuccess: () => setVoidOpen(false),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const handleRegenerate = () => {
    if (!invoice) return;
    regenerate.mutate(getId(invoice), {
      onSuccess: (res) => {
        setRegenerateOpen(false);
        const data = (res as { data?: { id?: string; _id?: string } }).data;
        const nextId = data && typeof data === 'object' ? String(data.id ?? data._id ?? '') : '';
        if (nextId) navigate(`/invoices/${nextId}`);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  if (invoiceQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Invoice" breadcrumbs={[{ label: 'Invoices', path: '/invoices' }, { label: '…' }]} />
        <p className="text-sm text-slate-500">Loading invoice…</p>
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Invoice" breadcrumbs={[{ label: 'Invoices', path: '/invoices' }, { label: 'Not found' }]} />
        <p className="text-sm text-red-600">{getErrorMessage(invoiceQuery.error, 'Invoice not found')}</p>
        <Button variant="outline" onClick={() => navigate('/invoices')} className="min-h-11 w-fit">
          Back to invoices
        </Button>
      </div>
    );
  }

  const status = String(invoice.status);
  const netDue = Number(invoice.netAmountDue ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        breadcrumbs={[{ label: 'Invoices', path: '/invoices' }, { label: invoice.invoiceNumber }]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.open(invoicesApi.pdfUrl(getId(invoice)), '_blank', 'noopener')} className="min-h-11">
              View PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(invoicesApi.pdfUrl(getId(invoice), true), '_blank', 'noopener')}
              className="min-h-11"
            >
              Download detailed
            </Button>
            <Button onClick={handleSendWhatsapp} loading={sendWhatsapp.isPending} className="min-h-11">
              Send via WhatsApp
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Bill details</CardTitle>
            <StatusBadge status={status} />
            {invoice.replacedByInvoice ? <Badge variant="secondary">Replaced by {invoice.replacedByInvoice}</Badge> : null}
            {invoice.isEarlyBilling ? <Badge variant="warning">Early billing</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900">{customerLabel(invoice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Bill No</dt>
              <dd className="font-medium text-slate-900">{invoice.invoiceNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Period</dt>
              <dd className="font-medium text-slate-900">{periodLabel(invoice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Bill date</dt>
              <dd className="font-medium text-slate-900">{formatDate(invoice.billDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Sent date</dt>
              <dd className="font-medium text-slate-900">{formatDate(invoice.sentDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Paid date</dt>
              <dd className="font-medium text-slate-900">{formatDate(invoice.paidDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Net due</dt>
              <dd className="font-semibold text-slate-900">{formatCurrency(netDue)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <InvoiceLineItems invoice={invoice} />

      {netDue > 0 ? (
        <UpiQrSection invoiceId={getId(invoice)} amount={netDue} />
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-sm text-emerald-700">
            Thank you — this invoice is fully paid.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setMarkPaidOpen(true)}
            disabled={status === 'paid'}
            className="min-h-11"
          >
            Mark paid
          </Button>
          <Button
            variant="outline"
            onClick={() => setVoidOpen(true)}
            disabled={status === 'void'}
            className="min-h-11"
          >
            Void invoice
          </Button>
          <Button variant="ghost" onClick={() => setRegenerateOpen(true)} className="min-h-11">
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark invoice as paid?"
        description={`This will mark ${invoice.invoiceNumber} (${formatCurrency(netDue)}) as paid.`}
        confirmLabel="Mark paid"
        danger={false}
        loading={updateStatus.isPending}
        onConfirm={() =>
          updateStatus.mutate(
            { id: getId(invoice), status: 'paid' },
            {
              onSuccess: () => setMarkPaidOpen(false),
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          )
        }
      />

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogHeader>
          <DialogTitle>Void invoice</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit(handleVoid)} className="flex flex-col gap-4" id="void-invoice-form">
            <FormField label="Reason" required error={errors.voidReason?.message}>
              <Textarea placeholder="Why is this invoice being voided?" {...register('voidReason')} />
            </FormField>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setVoidOpen(false)} className="min-h-11">
            Cancel
          </Button>
          <Button
            type="submit"
            form="void-invoice-form"
            variant="destructive"
            loading={isSubmitting || updateStatus.isPending}
            className="min-h-11"
          >
            Void invoice
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        title="Regenerate invoice?"
        description="This will regenerate the invoice from current ledger data. You will be taken to the new invoice."
        confirmLabel="Regenerate"
        danger={false}
        loading={regenerate.isPending}
        onConfirm={handleRegenerate}
      />
    </div>
  );
}

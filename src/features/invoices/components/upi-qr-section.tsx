import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { upiPaymentUrl } from '../api';

export function UpiQrSection({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const paymentUrl = upiPaymentUrl(invoiceId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay via UPI</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <p className="text-lg font-semibold text-slate-900">{formatCurrency(amount)}</p>
        <QRCodeSVG value={paymentUrl} size={200} aria-label="UPI payment QR code" />
        <p className="text-center text-xs text-slate-500">Scan to open payment page</p>
      </CardContent>
    </Card>
  );
}

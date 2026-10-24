import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/form/form-field';
import { formatCurrency } from '@/lib/utils';
import { useCustomer, useCustomerLedger } from '../hooks';
import { Wallet, Pencil } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CustomerBalanceTab({
  userId,
  month: monthProp,
  year: yearProp,
  onMonthChange,
  onYearChange,
  onCollect,
  onAdjust,
}: {
  userId: string;
  month?: number;
  year?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
  onCollect?: () => void;
  onAdjust?: () => void;
}) {
  const now = new Date();
  const [innerMonth, setInnerMonth] = React.useState(now.getMonth() + 1);
  const [innerYear, setInnerYear] = React.useState(now.getFullYear());
  const month = monthProp ?? innerMonth;
  const year = yearProp ?? innerYear;
  const handleMonthChange = onMonthChange ?? setInnerMonth;
  const handleYearChange = onYearChange ?? setInnerYear;
  const { data: customer } = useCustomer(userId);
  const { data: ledger } = useCustomerLedger(userId, { month, year });

  const debits = ledger?.summary.debit ?? 0;
  const credits = ledger?.summary.credit ?? 0;
  const net = ledger?.summary.net ?? debits - credits;
  const balance = Number(customer?.accountBalance ?? customer?.pendingAmount ?? net);

  const yearOptions: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 3; y <= currentYear + 1; y++) yearOptions.push(y);

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-primary-600 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Outstanding balance</CardTitle>
          <div className="flex gap-2">
            {onCollect && (
              <Button size="sm" variant="secondary" onClick={onCollect} className="text-slate-900">
                <Wallet className="size-4" /> Collect
              </Button>
            )}
            {onAdjust && (
              <Button size="sm" variant="outline" onClick={onAdjust} className="border-white text-white hover:bg-white/10">
                <Pencil className="size-4" /> Adjust
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
          <p className="mt-1 text-sm text-white/80">
            {MONTHS[month - 1]} {year} · net {formatCurrency(net)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Month">
          <Select value={String(month)} onChange={(e) => handleMonthChange(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Year">
          <Select value={String(year)} onChange={(e) => handleYearChange(Number(e.target.value))}>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total debits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-amber-700">{formatCurrency(debits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total credits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-emerald-700">{formatCurrency(credits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net for month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-slate-900">{formatCurrency(net)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

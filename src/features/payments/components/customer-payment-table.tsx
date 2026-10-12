import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, getId } from '@/lib/utils';
import type { BalanceSummary } from '@/types/transaction';

function balanceOf(row: BalanceSummary): number {
  const raw = row.accountBalance ?? row.balance ?? 0;
  return typeof raw === 'number' ? raw : Number(raw ?? 0);
}

export function CustomerBalanceCard({
  row,
  onCollect,
  onAdjust,
  onHistory,
}: {
  row: BalanceSummary;
  onCollect: () => void;
  onAdjust: () => void;
  onHistory: () => void;
}) {
  const balance = balanceOf(row);
  const name = typeof row.name === 'string' ? row.name : 'Customer';
  const phone = typeof row.phone === 'string' ? row.phone : '';
  const totalSpent = typeof row.totalSpent === 'number' ? row.totalSpent : Number(row.totalSpent ?? 0);

  return (
    <Card key={getId(row)}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            {phone ? <p className="text-xs text-slate-500">{phone}</p> : null}
          </div>
          <div className="text-right">
            <p className={`text-base font-semibold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {formatCurrency(balance)}
            </p>
            <p className="text-[11px] text-slate-500">{balance > 0 ? 'Due' : balance < 0 ? 'Advance' : 'Settled'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Total spent</span>
          <span className="font-medium text-slate-700">{formatCurrency(Number.isNaN(totalSpent) ? 0 : totalSpent)}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="min-h-11 flex-1" onClick={onCollect}>
            Collect
          </Button>
          <Button size="sm" variant="outline" className="min-h-11 flex-1" onClick={onAdjust}>
            Adjust
          </Button>
          <Button size="sm" variant="ghost" className="min-h-11 flex-1" onClick={onHistory}>
            History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

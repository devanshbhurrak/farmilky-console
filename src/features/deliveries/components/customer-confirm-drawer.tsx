import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function CustomerConfirmDrawer({
  group,
  open,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  group: { customerName: string; pendingCount: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetBody>
        <SheetHeader>
          <SheetTitle>Confirm all deliveries</SheetTitle>
        </SheetHeader>
        <p className="mt-4 text-sm text-slate-600">
          Mark {group?.pendingCount ?? 0} pending {group?.pendingCount === 1 ? 'delivery' : 'deliveries'} as
          delivered for <span className="font-semibold text-slate-900">{group?.customerName ?? ''}</span>?
        </p>
      </SheetBody>
      <SheetFooter>
        <Button onClick={onConfirm} loading={confirming} className="min-h-11 w-full">
          Confirm all delivered
        </Button>
      </SheetFooter>
    </Sheet>
  );
}

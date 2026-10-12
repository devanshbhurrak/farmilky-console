import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-danger-bg px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-red-500">
        <AlertTriangle className="size-6" />
      </span>
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-600">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

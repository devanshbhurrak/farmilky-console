import { Spinner } from '@/components/ui/spinner';

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-inset">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white">
        F
      </span>
      <Spinner label={message} />
    </div>
  );
}

import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/features/auth/auth-provider';
import { ErrorBoundary } from '@/components/feedback/error-boundary';
import { HeaderActionProvider } from '@/components/layout/header-action-context';
import { AppRoutes } from './routes';

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <HeaderActionProvider>
              <AppRoutes />
            </HeaderActionProvider>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontSize: 14 } }} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

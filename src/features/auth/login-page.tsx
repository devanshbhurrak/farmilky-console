import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Milk } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/form/form-field';
import { useAuth } from './auth-provider';
import { loginSchema, type LoginInput } from './schemas';
import { getErrorMessage } from '@/lib/utils';

export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      tenantSlug: import.meta.env.VITE_TENANT_SLUG ?? 'farmilky',
    },
  });

  React.useEffect(() => {
    if (!isLoading && user) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (user.role === 'admin' ? '/' : '/agent'), { replace: true });
    }
  }, [user, isLoading, navigate, location.state]);

  const onSubmit = async (values: LoginInput) => {
    try {
      const loggedIn = await login(values);
      toast.success(`Welcome back, ${loggedIn.name}`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (loggedIn.role === 'admin' ? '/' : '/agent'), { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-inset p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Milk className="size-6" />
          </span>
          <CardTitle className="text-xl">Farmilky Management</CardTitle>
          <CardDescription>Sign in to the admin portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField label="Email or phone" required error={form.formState.errors.identifier?.message}>
              <Input
                placeholder="admin@farmilky.com"
                autoComplete="username"
                inputMode="email"
                {...form.register('identifier')}
              />
            </FormField>
            <FormField label="Password" required error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-11"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </FormField>
            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-500">
            Authorized staff only. Contact your administrator for access.{' '}
            <Link to="/" className="text-primary-700 hover:underline">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;

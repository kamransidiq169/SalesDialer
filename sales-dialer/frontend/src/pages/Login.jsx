import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Mail, Lock, AlertCircle, Zap, ArrowRight, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Sparkles, text: 'Smart contact management' },
    { icon: Phone, text: 'Real-time call analytics' },
    { icon: CheckCircle2, text: 'AI-powered insights' },
    { icon: Shield, text: 'Seamless CRM integration' },
  ];

  return (
    <div className="min-h-screen flex bg-white dark:bg-surface-950">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-violet-600 to-brand-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.4),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.3),transparent_60%)]" />

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Blur circles */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-32 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.08]">
            <div className="absolute inset-0 grid-pattern" />
          </div>

          {/* Floating dots */}
          <div className="absolute top-32 right-20 w-2 h-2 rounded-full bg-white/60" />
          <div className="absolute top-48 right-32 w-1.5 h-1.5 rounded-full bg-cyan-300/80" />
          <div className="absolute bottom-40 left-20 w-2 h-2 rounded-full bg-violet-300/80" />
          <div className="absolute bottom-28 left-40 w-1.5 h-1.5 rounded-full bg-white/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <Zap className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-white/20 blur-xl -z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">SalesDialer</h1>
              <p className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.14em] mt-0.5">
                Sales Platform v1.0
              </p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="max-w-md my-auto py-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
              <span className="live-pulse !bg-emerald-400" />
              <span className="text-xs font-semibold tracking-wide">Live & Ready</span>
            </div>
            <h2 className="text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">
              Empower Your<br />
              <span className="bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
                Sales Team
              </span>
            </h2>
            <p className="text-lg text-white/70 leading-relaxed max-w-md">
              The modern calling solution that helps you connect with leads and close deals faster than ever.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map(({ icon: FeatureIcon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 group"
                style={{ animation: `slide-up 0.5s ease-out ${i * 0.1}s both` }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/15 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-200">
                  <FeatureIcon className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="text-white/90 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface-50 dark:bg-surface-950 relative overflow-hidden">
        {/* Subtle background pattern on right side */}
        <div className="absolute inset-0 grid-pattern opacity-[0.4] dark:opacity-[0.15] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-primary rounded-full opacity-[0.04] dark:opacity-[0.06] blur-3xl pointer-events-none" />

        <div className="w-full max-w-[440px] relative z-10 animate-slide-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-[0_8px_24px_rgba(99,102,241,0.4)]">
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-gradient-primary blur-lg opacity-50 -z-10" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gradient-vivid">
              SalesDialer
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[32px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
              Welcome back
            </h2>
            <p className="text-surface-500 dark:text-surface-400 mt-2 text-[15px]">
              Sign in to your account to continue
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/60 flex items-start gap-3 animate-slide-up">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2.5} />
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium pt-1.5">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              prefixIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              prefixIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-surface-600 dark:text-surface-400 group-hover:text-surface-900 dark:group-hover:text-surface-200 transition-colors">
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="xl"
              loading={isLoading}
            >
              Sign In
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-7 p-5 rounded-2xl bg-surface-100/60 dark:bg-surface-800/40 backdrop-blur-sm border border-surface-200/60 dark:border-surface-700/60">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm">
                <Phone className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-surface-800 dark:text-surface-100">
                Demo Credentials
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-500 dark:text-surface-400 text-[13px]">Email</span>
                <code className="px-2.5 py-1 rounded-md bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 font-mono text-[12px] font-semibold border border-surface-200/60 dark:border-surface-700/60">
                  demo@dialer.com
                </code>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-surface-500 dark:text-surface-400 text-[13px]">Password</span>
                <code className="px-2.5 py-1 rounded-md bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 font-mono text-[12px] font-semibold border border-surface-200/60 dark:border-surface-700/60">
                  password123
                </code>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-surface-500 dark:text-surface-400">
            Don't have an account?{' '}
            <span className="text-brand-600 dark:text-brand-400 font-semibold cursor-pointer hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
              Contact support
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

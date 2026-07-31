import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Phone,
  Heart,
  XCircle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PhoneOutgoing,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { formatDateTime, formatDuration } from '../utils/formatters';

const StatCard = ({ icon: Icon, label, value, trend, color, gradient, accentBar }) => (
  <div className="stat-card group">
    {/* Subtle gradient background */}
    <div className={`absolute inset-0 opacity-[0.04] dark:opacity-[0.08] bg-gradient-to-br ${gradient} transition-opacity duration-500 group-hover:opacity-[0.08] dark:group-hover:opacity-[0.12]`} />
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-surface-800/30 dark:to-transparent" />

    {/* Top accent line */}
    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accentBar} opacity-60 group-hover:opacity-100 transition-opacity`} />

    <div className="relative flex items-start justify-between">
      <div className="flex items-center gap-4">
        {/* Icon container with gradient */}
        <div className="relative">
          <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div className={`absolute inset-0 w-14 h-14 rounded-2xl ${color} blur-xl opacity-40 -z-10 group-hover:opacity-60 transition-opacity`} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
            {label}
          </p>
          <p className="text-[36px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 mt-1 leading-none">
            {value}
          </p>
        </div>
      </div>

      {/* Trend indicator */}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
          trend >= 0
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
            : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60 dark:border-red-800/40'
        }`}>
          {trend >= 0 ? (
            <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
          ) : (
            <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />
          )}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <Spinner size="lg" />
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-30 animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50/80 dark:bg-red-950/40 backdrop-blur-sm p-6 rounded-2xl border border-red-200/60 dark:border-red-900/60 flex items-center gap-4 animate-slide-up">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shadow-sm">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" strokeWidth={2.25} />
          </div>
          <div>
            <p className="font-bold text-red-700 dark:text-red-300">Failed to load dashboard</p>
            <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-0.5">Please try again</p>
          </div>
        </div>
      </Layout>
    );
  }

  const statusBreakdown = data?.statusBreakdown || {};
  const totalContacts = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 mb-3">
            <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">
              Overview
            </span>
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
            Dashboard
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1.5 text-[15px]">
            Welcome back! Here's your sales overview.
          </p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
          <span className="live-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
            Live
          </span>
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={Users}
          label="Total Contacts"
          value={data?.totalContacts || 0}
          color="bg-gradient-to-br from-brand-500 to-violet-600"
          gradient="from-brand-500/30 to-violet-500/30"
          accentBar="from-brand-500 to-violet-500"
        />
        <StatCard
          icon={Phone}
          label="Calls Today"
          value={data?.callsToday || 0}
          trend={12}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
          gradient="from-violet-500/30 to-purple-500/30"
          accentBar="from-violet-500 to-purple-500"
        />
        <StatCard
          icon={Heart}
          label="Interested Leads"
          value={data?.contactBreakdown?.interested || 0}
          trend={8}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
          gradient="from-emerald-500/30 to-teal-500/30"
          accentBar="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={XCircle}
          label="Not Interested"
          value={data?.contactBreakdown?.notInterested || 0}
          color="bg-gradient-to-br from-red-500 to-rose-600"
          gradient="from-red-500/30 to-rose-500/30"
          accentBar="from-red-500 to-rose-500"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Calls Card */}
        <div className="card-flat p-6 group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_4px_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]">
                <Clock className="w-5 h-5 text-white" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                  Recent Calls
                </h2>
                <p className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 mt-0.5">
                  Latest activity
                </p>
              </div>
            </div>
            <Link
              to="/call-logs"
              className="group/link inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-[11px] font-bold uppercase tracking-[0.06em]
                text-brand-600 dark:text-brand-400
                hover:bg-brand-50 dark:hover:bg-brand-950/40
                border border-transparent hover:border-brand-200/60 dark:hover:border-brand-800/40
                transition-all duration-200"
            >
              View all
              <ArrowUpRight className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" strokeWidth={2.5} />
            </Link>
          </div>

          {data?.recentCalls?.length > 0 ? (
            <div className="space-y-2">
              {data.recentCalls.map((call, index) => (
                <div
                  key={call.id}
                  className="group/row flex items-center gap-4 p-3.5 rounded-xl
                    border-l-2 border-transparent hover:border-brand-500
                    bg-surface-50/40 dark:bg-surface-800/30
                    hover:bg-white dark:hover:bg-surface-800/60
                    hover:shadow-sm
                    border border-surface-200/40 dark:border-surface-700/40 hover:border-surface-200 dark:hover:border-surface-700
                    transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="avatar-gradient">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center">
                      <span className="text-sm font-extrabold text-gradient-vivid">
                        {(call.contact?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-surface-900 dark:text-surface-100 truncate">
                      {call.contact?.name || 'Unknown'}
                    </p>
                    <p className="text-[12px] text-surface-500 dark:text-surface-400 truncate">
                      {call.contact?.company || 'No company'}
                    </p>
                  </div>
                  <Badge status={call.status} />
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-surface-700 dark:text-surface-200 font-mono">
                      {formatDuration(call.duration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center mb-4">
                <PhoneOutgoing className="w-7 h-7 text-brand-500" strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">No recent calls</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Start dialing to see activity</p>
            </div>
          )}
        </div>

        {/* Status Breakdown Card */}
        <div className="card-flat p-6 group">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_4px_14px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                  Contact Status
                </h2>
                <p className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 mt-0.5">
                  Pipeline breakdown
                </p>
              </div>
            </div>
          </div>

          {totalContacts > 0 ? (
            <div className="space-y-5">
              {[
                { key: 'new', label: 'New', color: 'from-slate-400 to-slate-500', dot: 'bg-slate-400' },
                { key: 'contacted', label: 'Contacted', color: 'from-blue-500 to-blue-600', dot: 'bg-blue-500' },
                { key: 'interested', label: 'Interested', color: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-500' },
                { key: 'not_interested', label: 'Not Interested', color: 'from-red-500 to-red-600', dot: 'bg-red-500' },
              ].map(({ key, label, color, dot }, idx) => {
                const count = statusBreakdown[key] || 0;
                const percentage = totalContacts > 0 ? (count / totalContacts) * 100 : 0;

                return (
                  <div key={key} className="group/bar" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${dot} ring-4 ring-white/40 dark:ring-surface-900/40`} />
                        <span className="text-[13px] font-semibold text-surface-700 dark:text-surface-300">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-surface-900 dark:text-surface-100">
                          {count}
                        </span>
                        <span className="text-[11px] font-semibold text-surface-400">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out relative progress-shine`}
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-violet-500" strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">No contact data available</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Add contacts to see stats</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

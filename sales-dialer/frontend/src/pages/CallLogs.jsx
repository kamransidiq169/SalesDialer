import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneOutgoing,
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Calendar,
  Filter,
  ArrowUpRight,
  Hash,
  PhoneOff,
} from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import { formatDateTime, formatDuration } from '../utils/formatters';

const CallLogs = () => {
  const [page, setPage] = useState(1);
  const [contactFilter, setContactFilter] = useState('');
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedCall, setExpandedCall] = useState(null);

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const response = await api.get('/contacts', { params: { limit: 100 } });
      return response.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['calls', page, contactFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = { page, limit: 10, sortBy, order: sortOrder };
      if (contactFilter) params.contactId = contactFilter;
      const response = await api.get('/calls', { params });
      return response.data;
    },
  });

  const { data: expandedNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['call-notes', expandedCall],
    queryFn: async () => {
      const response = await api.get(`/calls/${expandedCall}/notes`);
      return response.data.data;
    },
    enabled: !!expandedCall,
  });

  const toggleExpand = (callId) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  const calls = data?.data || data?.calls || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total || 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 mb-3">
            <PhoneOutgoing className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">
              {total} Total
            </span>
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
            Call Logs
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1.5 text-[15px]">
            Review your call history and notes
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-flat p-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Contact Filter */}
          <div className="relative group flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
              <Filter className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <select
              value={contactFilter}
              onChange={(e) => {
                setContactFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-10 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                text-[14px] text-surface-700 dark:text-surface-300
                appearance-none cursor-pointer
                shadow-sm focus:shadow-md
                transition-all duration-200"
            >
              <option value="">All Contacts</option>
              {(Array.isArray(contactsData) ? contactsData : (contactsData?.data || [])).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Sort */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
                setPage(1);
              }}
              className="w-full sm:w-64 pl-11 pr-10 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                text-[14px] text-surface-700 dark:text-surface-300
                appearance-none cursor-pointer
                shadow-sm focus:shadow-md
                transition-all duration-200"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="duration-desc">Longest First</option>
              <option value="duration-asc">Shortest First</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <Spinner size="lg" />
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur-xl opacity-30 animate-pulse" />
          </div>
        </div>
      ) : calls.length === 0 ? (
        <div className="card-flat p-16 text-center group">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
            <PhoneOutgoing className="w-10 h-10 text-brand-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-xl font-extrabold text-surface-900 dark:text-surface-50 mb-2">
            No calls found
          </h3>
          <p className="text-[15px] text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
            {contactFilter
              ? 'Try adjusting your filters to see results'
              : 'Start making calls to see your call history here'}
          </p>
        </div>
      ) : (
        <>
          {/* Timeline Container */}
          <div className="space-y-3">
            {calls.map((call, index) => (
              <div
                key={call.id}
                className="card-flat overflow-hidden group transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
                style={{ animation: `slide-up 0.4s ease-out ${index * 40}ms both` }}
              >
                {/* Main Row */}
                <div
                  className="p-5 cursor-pointer
                    hover:bg-gradient-to-r hover:from-brand-50/30 hover:to-transparent
                    dark:hover:from-brand-950/20 dark:hover:to-transparent
                    transition-all duration-200"
                  onClick={() => toggleExpand(call.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Timeline indicator */}
                    <div className="relative flex flex-col items-center flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center
                        shadow-[0_4px_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.2)]
                        group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
                        <PhoneOutgoing className="w-5 h-5 text-white" strokeWidth={2.25} />
                      </div>
                      {/* Connection line */}
                      {index < calls.length - 1 && (
                        <div className="w-0.5 h-6 bg-gradient-to-b from-brand-500/40 to-surface-200/0 dark:to-surface-800/0 mt-2" />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="avatar-gradient flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center">
                          <span className="text-sm font-extrabold text-gradient-vivid">
                            {(call.contact?.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] text-surface-900 dark:text-surface-50 truncate">
                          {call.contact?.name || 'Unknown'}
                        </p>
                        <p className="text-[12px] text-surface-500 dark:text-surface-400 truncate">
                          {call.contact?.company || 'No company'}
                        </p>
                      </div>
                    </div>

                    {/* Call Details */}
                    <div className="hidden lg:flex items-center gap-5">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
                          <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span className="text-[12px] font-medium">{formatDateTime(call.startTime)}</span>
                        </div>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <div className="flex items-center justify-end gap-1.5 text-surface-700 dark:text-surface-200">
                          <Clock className="w-3.5 h-3.5 text-surface-500" strokeWidth={2.5} />
                          <span className="text-[13px] font-bold font-mono tabular-nums">
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                      </div>
                      <Badge status={call.status} />
                    </div>

                    {/* Expand Button */}
                    <button
                      className={`p-2 rounded-xl flex-shrink-0
                        text-surface-500 dark:text-surface-400
                        hover:text-surface-900 dark:hover:text-surface-100
                        hover:bg-surface-100 dark:hover:bg-surface-800
                        active:scale-90 transition-all duration-200
                        ${expandedCall === call.id ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(call.id);
                      }}
                      aria-label={expandedCall === call.id ? 'Collapse' : 'Expand'}
                    >
                      {expandedCall === call.id ? (
                        <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                      ) : (
                        <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>

                  {/* Mobile/Tablet View */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-surface-100/60 dark:border-surface-800/60 lg:hidden">
                    <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
                      <Calendar className="w-3 h-3" strokeWidth={2.5} />
                      <span className="text-[11px] font-medium">{formatDateTime(call.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-surface-700 dark:text-surface-200">
                      <Clock className="w-3 h-3" strokeWidth={2.5} />
                      <span className="text-[12px] font-bold font-mono">
                        {formatDuration(call.duration)}
                      </span>
                    </div>
                    <Badge status={call.status} />
                  </div>
                </div>

                {/* Expanded Notes Section */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    expandedCall === call.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-2 border-t border-surface-100/60 dark:border-surface-800/60 bg-gradient-to-b from-surface-50/30 to-transparent dark:from-surface-800/20">
                    {/* Notes Header */}
                    <div className="flex items-center gap-2.5 mb-4 mt-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
                        <MessageSquare className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                      <span className="text-[13px] font-bold text-surface-800 dark:text-surface-100">
                        Call Notes
                      </span>
                    </div>

                    {/* Loading State */}
                    {notesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="relative">
                          <Spinner size="sm" />
                          <div className="absolute inset-0 bg-gradient-primary rounded-full blur-md opacity-30 animate-pulse" />
                        </div>
                      </div>
                    ) : expandedNotes && expandedNotes.length > 0 ? (
                      <div className="space-y-3">
                        {expandedNotes.map((note) => (
                          <div
                            key={note.id}
                            className="p-5 rounded-2xl
                              bg-white dark:bg-surface-800/40
                              border border-surface-200/60 dark:border-surface-700/60
                              hover:border-brand-500/40 dark:hover:border-brand-500/30
                              hover:shadow-sm
                              transition-all duration-200"
                          >
                            {/* AI Badge */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500/10 to-violet-500/10 border border-brand-200/40 dark:border-brand-800/40">
                                <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gradient-vivid">
                                  AI Summary
                                </span>
                              </div>
                            </div>

                            {/* AI Summary */}
                            {note.aiSummary && (
                              <div className="p-4 rounded-xl
                                bg-gradient-to-br from-brand-50/60 to-violet-50/40
                                dark:from-brand-950/30 dark:to-violet-950/20
                                border border-brand-500/10 dark:border-brand-500/20
                                mb-3">
                                <p className="text-[14px] font-medium text-surface-800 dark:text-surface-100 leading-relaxed">
                                  {note.aiSummary}
                                </p>
                              </div>
                            )}

                            {/* Manual Note */}
                            {note.content && (
                              <div className={note.aiSummary ? "border-t border-surface-200/60 dark:border-surface-700/60 pt-3" : ""}>
                                <p className="text-[13px] text-surface-600 dark:text-surface-300 leading-relaxed">
                                  {note.content}
                                </p>
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-surface-500 dark:text-surface-400">
                              <Clock className="w-3 h-3" strokeWidth={2.5} />
                              <span className="font-medium">{formatDateTime(note.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-3 border border-surface-200/60 dark:border-surface-700/60">
                          <MessageSquare className="w-6 h-6 text-surface-400" strokeWidth={2} />
                        </div>
                        <p className="text-[13px] font-semibold text-surface-600 dark:text-surface-300">
                          No notes for this call
                        </p>
                        <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-1">
                          Add a note to keep track of this conversation
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </Layout>
  );
};

export default CallLogs;

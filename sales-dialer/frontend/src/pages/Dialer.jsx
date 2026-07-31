import { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  Building,
  Clock,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Search,
  Mic,
} from 'lucide-react';
import api from '../api/axios';
import Layout from '../components/Layout';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { formatTime } from '../utils/formatters';

const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  CONNECTED: 'connected',
  ENDED: 'ended',
};

const Dialer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const contactIdFromUrl = searchParams.get('contactId');
  const [selectedContactId, setSelectedContactId] = useState(contactIdFromUrl || '');
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [currentCall, setCurrentCall] = useState(null);
  const [connectedTime, setConnectedTime] = useState(0);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [noteSubmitted, setNoteSubmitted] = useState(false);
  const connectedTimeRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  const { register, handleSubmit, reset, watch } = useForm();

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => {
      const response = await api.get('/contacts', { params: { limit: 100 } });
      return response.data.data;
    },
  });

  const { data: selectedContact } = useQuery({
    queryKey: ['contact', selectedContactId],
    queryFn: async () => {
      const response = await api.get(`/contacts/${selectedContactId}`);
      return response.data.data;
    },
    enabled: !!selectedContactId,
  });

  const startCallMutation = useMutation({
    mutationFn: async (contactId) => {
      const response = await api.post('/calls/start', { contactId });
      return response.data.data;
    },
    onSuccess: (call) => {
      setCurrentCall(call);
      setCallState(CALL_STATES.CALLING);

      setTimeout(() => {
        setCallState(CALL_STATES.CONNECTED);
        setConnectedTime(0);
        connectedTimeRef.current = setInterval(() => {
          setConnectedTime((prev) => prev + 1);
        }, 1000);
      }, 3000);
    },
  });

  const endCallMutation = useMutation({
    mutationFn: async (callId) => {
      const response = await api.post('/calls/end', { callId });
      return response.data.data;
    },
    onSuccess: () => {
      if (connectedTimeRef.current) {
        clearInterval(connectedTimeRef.current);
        connectedTimeRef.current = null;
      }
      setCallState(CALL_STATES.ENDED);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ callId, content }) => {
      const response = await api.post(`/calls/${callId}/notes`, { content });
      return response.data.data;
    },
    onSuccess: () => {
      setNoteSubmitted(true);
      reset();
    },
  });

  const filteredContacts = (Array.isArray(contactsData) ? contactsData : (contactsData?.data || [])).filter(
    (c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch) ||
      (c.company && c.company.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  useEffect(() => {
    if (contactIdFromUrl) {
      setSelectedContactId(contactIdFromUrl);
    }
  }, [contactIdFromUrl]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        (!event.target.closest || !event.target.closest('[data-contact-dropdown="true"]'))
      ) {
        setShowContactDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showContactDropdown) return;
    updateDropdownPosition();
    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [showContactDropdown, updateDropdownPosition]);

  useEffect(() => {
    return () => {
      if (connectedTimeRef.current) {
        clearInterval(connectedTimeRef.current);
      }
    };
  }, []);

  const handleStartCall = () => {
    if (selectedContactId) {
      setNoteSubmitted(false);
      startCallMutation.mutate(selectedContactId);
    }
  };

  const handleEndCall = () => {
    if (currentCall) {
      endCallMutation.mutate(currentCall.id);
    }
  };

  const handleAddNote = ({ content }) => {
    if (currentCall) {
      addNoteMutation.mutate({ callId: currentCall.id, content });
    }
  };

  const handleCallAnother = () => {
    setCurrentCall(null);
    setCallState(CALL_STATES.IDLE);
    setConnectedTime(0);
    setNoteSubmitted(false);
    reset();
    navigate('/contacts');
  };

  const selectContact = (contact) => {
    setSelectedContactId(contact.id);
    setContactSearch('');
    setShowContactDropdown(false);
    navigate(`/dialer?contactId=${contact.id}`, { replace: true });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 mb-3">
            <Phone className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">
              Power Dialer
            </span>
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
            Sales Dialer
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1.5 text-[15px]">
            Make calls and track your conversations
          </p>
        </div>

        {/* Contact Selection */}
        {!selectedContactId && callState === CALL_STATES.IDLE && (
          <div className="card-flat p-6 mb-6 overflow-visible">
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-surface-600 dark:text-surface-300 mb-3.5">
              Select a Contact
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400">
                <Search className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={contactSearch}
                onChange={(e) => {
                  setContactSearch(e.target.value);
                  setShowContactDropdown(true);
                  updateDropdownPosition();
                }}
                onFocus={() => {
                  setShowContactDropdown(true);
                  updateDropdownPosition();
                }}
                placeholder="Search by name, phone, or company..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl
                  bg-surface-50 dark:bg-surface-900
                  border-2 border-surface-200/60 dark:border-surface-700/60
                  focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                  text-[14px] text-surface-800 dark:text-surface-100
                  placeholder:text-surface-400
                  shadow-sm focus:shadow-md
                  transition-all duration-200"
              />
              {isMounted && showContactDropdown && filteredContacts.length > 0 &&
                ReactDOM.createPortal(
                  <div
                    data-contact-dropdown="true"
                    style={{
                      position: 'absolute',
                      top: dropdownPos.top,
                      left: dropdownPos.left,
                      width: dropdownPos.width,
                      zIndex: 9999,
                    }}
                    className="mt-2 bg-white/95 dark:bg-surface-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-surface-200/60 dark:border-surface-700/60 max-h-72 overflow-y-auto animate-scale-in"
                  >
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => selectContact(contact)}
                        className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-brand-50 hover:to-violet-50/50 dark:hover:from-brand-950/30 dark:hover:to-violet-950/20 flex items-center justify-between transition-colors border-b border-surface-100/60 dark:border-surface-800/60 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="avatar-gradient">
                            <div className="w-9 h-9 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center">
                              <span className="text-xs font-extrabold text-gradient-vivid">
                                {contact.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-[14px] text-surface-900 dark:text-surface-50">
                              {contact.name}
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400">
                              {contact.phone}
                              {contact.company && ` • ${contact.company}`}
                            </p>
                          </div>
                        </div>
                        <Badge status={contact.status} />
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
            </div>
          </div>
        )}

        {/* Selected Contact Card */}
        {selectedContact && (
          <div className="card-flat p-6 mb-6 relative overflow-hidden group">
            {/* Gradient top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-cyan-500" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-primary rounded-full opacity-[0.06] blur-3xl group-hover:opacity-[0.1] transition-opacity" />

            <div className="relative flex items-start gap-5">
              {/* Avatar with gradient ring */}
              <div className="relative">
                <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-primary p-0.5">
                  <div className="w-full h-full rounded-[14px] bg-white dark:bg-surface-900 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-gradient-vivid">
                      {selectedContact.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 w-[72px] h-[72px] rounded-2xl bg-gradient-primary blur-xl opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                  {selectedContact.name}
                </h2>
                <div className="mt-3 space-y-2">
                  <p className="text-[14px] text-surface-600 dark:text-surface-300 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-100/80 dark:bg-surface-800/80 flex items-center justify-center border border-surface-200/60 dark:border-surface-700/60">
                      <Phone className="w-3.5 h-3.5 text-brand-500" strokeWidth={2.5} />
                    </span>
                    <span className="font-mono font-medium">{selectedContact.phone}</span>
                  </p>
                  {selectedContact.company && (
                    <p className="text-[14px] text-surface-600 dark:text-surface-300 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-surface-100/80 dark:bg-surface-800/80 flex items-center justify-center border border-surface-200/60 dark:border-surface-700/60">
                        <Building className="w-3.5 h-3.5 text-brand-500" strokeWidth={2.5} />
                      </span>
                      <span className="font-medium">{selectedContact.company}</span>
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <Badge status={selectedContact.status} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Interface Card */}
        <div className="card-flat p-10 relative overflow-hidden">
          {/* Background glow for connected state */}
          {callState === CALL_STATES.CONNECTED && (
            <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          )}

          <div className="text-center relative">
            {/* Call State Display */}
            <div className="mb-10">
              {callState === CALL_STATES.IDLE && (
                <div className="animate-fade-in">
                  {/* Idle State - Phone icon in circle */}
                  <div className="relative inline-block">
                    <div className="w-32 h-32 mx-auto rounded-full
                      bg-gradient-to-br from-surface-100 to-surface-50
                      dark:from-surface-800 dark:to-surface-900
                      flex items-center justify-center
                      border border-surface-200/60 dark:border-surface-700/60
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]
                      transition-all duration-300">
                      <Phone className="w-14 h-14 text-surface-400 dark:text-surface-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 mt-7 mb-2">
                    Ready to Call
                  </h3>
                  <p className="text-[15px] text-surface-500 dark:text-surface-400">
                    {selectedContactId
                      ? 'Click the button below to start the call'
                      : 'Select a contact to begin'}
                  </p>
                </div>
              )}

              {callState === CALL_STATES.CALLING && (
                <div className="animate-fade-in">
                  {/* Calling State - Pulsing rings */}
                  <div className="relative inline-block w-32 h-32">
                    <div className="absolute inset-0 rounded-full border-2 border-amber-500/40 animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite_0.7s]" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 opacity-30 blur-xl" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <PhoneCall className="w-14 h-14 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-7 mb-2">
                    Calling...
                  </h3>
                  <p className="text-[15px] text-surface-500 dark:text-surface-400 animate-pulse">
                    Connecting to {selectedContact?.name}...
                  </p>
                </div>
              )}

              {callState === CALL_STATES.CONNECTED && (
                <div className="animate-fade-in">
                  {/* Connected State - Green glow with rings */}
                  <div className="relative inline-block w-32 h-32">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-[ring-expand_1.8s_ease-out_infinite]" />
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-[ring-expand_1.8s_ease-out_infinite_0.6s]" />
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-[ring-expand_1.8s_ease-out_infinite_1.2s]" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-40 blur-xl" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_30px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <PhoneCall className="w-14 h-14 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-7 mb-4">
                    Connected
                  </h3>
                  <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl
                    bg-emerald-50/80 dark:bg-emerald-950/40
                    border border-emerald-200/60 dark:border-emerald-800/60
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    <span className="text-3xl font-mono font-extrabold text-surface-900 dark:text-surface-50 tabular-nums tracking-tight">
                      {formatTime(connectedTime)}
                    </span>
                  </div>
                </div>
              )}

              {callState === CALL_STATES.ENDED && (
                <div className="animate-fade-in">
                  {/* Ended State */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 blur-2xl" />
                    <div className="relative w-32 h-32 mx-auto rounded-full
                      bg-gradient-to-br from-violet-100 to-violet-50
                      dark:from-violet-950/60 dark:to-violet-900/40
                      flex items-center justify-center
                      border border-violet-200/60 dark:border-violet-800/60
                      shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <CheckCircle2 className="w-14 h-14 text-violet-600 dark:text-violet-400" strokeWidth={2} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-violet-700 dark:text-violet-300 mt-7 mb-2">
                    Call Ended
                  </h3>
                  <div className="inline-flex items-center gap-2 text-[14px] text-surface-600 dark:text-surface-300 mt-1">
                    <Clock className="w-4 h-4" strokeWidth={2.5} />
                    <span className="font-mono font-bold">Duration: {formatTime(connectedTime)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4">
              {callState === CALL_STATES.IDLE && (
                <Button
                  size="xl"
                  onClick={handleStartCall}
                  loading={startCallMutation.isPending}
                  disabled={!selectedContactId}
                  className="px-14"
                >
                  <PhoneCall className="w-5 h-5" strokeWidth={2.25} />
                  Start Call
                </Button>
              )}

              {(callState === CALL_STATES.CALLING || callState === CALL_STATES.CONNECTED) && (
                <Button
                  size="xl"
                  variant="danger"
                  onClick={handleEndCall}
                  loading={endCallMutation.isPending}
                  className="px-14"
                >
                  <PhoneOff className="w-5 h-5" strokeWidth={2.25} />
                  End Call
                </Button>
              )}

              {callState === CALL_STATES.ENDED && !noteSubmitted && (
                <div className="w-full max-w-md animate-slide-up">
                  <form onSubmit={handleSubmit(handleAddNote)} className="space-y-4 text-left">
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-500/10 to-violet-500/10 border border-brand-200/40 dark:border-brand-800/40">
                          <Sparkles className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-300">
                            AI Enhanced
                          </span>
                        </span>
                        <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-surface-600 dark:text-surface-300">
                          Add a note
                        </label>
                      </div>
                      <textarea
                        {...register('content')}
                        rows={4}
                        placeholder="What was discussed? Any follow-up actions needed?"
                        className="w-full px-4 py-3.5 rounded-xl
                          bg-surface-50 dark:bg-surface-900
                          border-2 border-surface-200/60 dark:border-surface-700/60
                          focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                          text-[14px] text-surface-800 dark:text-surface-100
                          placeholder:text-surface-400
                          transition-all duration-200 resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      loading={addNoteMutation.isPending}
                      className="w-full"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Save Note
                    </Button>
                  </form>
                </div>
              )}

              {noteSubmitted && (
                <div className="text-center space-y-5 animate-slide-up">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 inline-flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_4px_14px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <Sparkles className="w-5 h-5 text-white" strokeWidth={2.25} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 text-[15px]">AI Summary Generated</p>
                      <p className="text-[12px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                        Note saved successfully
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={handleCallAnother} size="lg">
                    Call Another Contact
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dialer;

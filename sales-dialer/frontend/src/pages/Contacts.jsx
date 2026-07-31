import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Upload,
  Users,
  X,
  Filter,
  Mail,
  Building,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone is required').regex(/^[\d\s\-+()]+$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  company: z.string().optional(),
  status: z.enum(['new', 'contacted', 'interested', 'not_interested']),
  notes: z.string().optional(),
});

const Contacts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/contacts', { params });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/contacts', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const response = await api.put(`/contacts/${id}`, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsModalOpen(false);
      setSelectedContact(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult(data.data);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Import failed. Please try again.';
      setImportResult({ imported: 0, skipped: 0, errors: [message] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      company: '',
      status: 'new',
      notes: '',
    },
  });

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    reset({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
      status: contact.status,
      notes: contact.notes || '',
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedContact(null);
    reset({
      name: '',
      phone: '',
      email: '',
      company: '',
      status: 'new',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      importMutation.mutate(formData);
    }
    if (e.target) e.target.value = '';
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleCall = (contactId) => {
    navigate(`/dialer?contactId=${contactId}`);
  };

  const onSubmit = (formData) => {
    if (selectedContact) {
      updateMutation.mutate({ id: selectedContact.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const contacts = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total || 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/40 mb-3">
            <Users className="w-3 h-3 text-brand-600 dark:text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">
              {total} Total
            </span>
          </div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-surface-900 dark:text-surface-50 leading-tight">
            Contacts
          </h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1.5 text-[15px]">
            Manage your contact database
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="md" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="card-flat p-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Premium Search Input */}
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors">
              <Search className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts by name, phone, or company..."
              className="w-full pl-11 pr-4 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                text-[14px] text-surface-800 dark:text-surface-100
                placeholder:text-surface-400
                transition-all duration-200
                shadow-sm focus:shadow-md"
            />
          </div>

          {/* Status Filter */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
              <Filter className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-52 pl-11 pr-10 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                text-[14px] text-surface-700 dark:text-surface-300
                appearance-none cursor-pointer
                shadow-sm focus:shadow-md
                transition-all duration-200"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
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
      ) : contacts.length === 0 ? (
        <div className="card-flat p-16 text-center group">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 rounded-3xl blur-2xl transition-opacity" />
            <Users className="w-10 h-10 text-brand-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-xl font-extrabold text-surface-900 dark:text-surface-50 mb-2">
            No contacts found
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-sm mx-auto text-[15px]">
            {search || statusFilter
              ? 'Try adjusting your search or filters to see results'
              : 'Get started by adding your first contact to your CRM'}
          </p>
          {!search && !statusFilter && (
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Premium Table */}
          <div className="card-flat overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200/60 dark:border-surface-800/60 bg-surface-50/40 dark:bg-surface-800/20">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400 hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400 hidden lg:table-cell">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-surface-500 dark:text-surface-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact, index) => (
                    <tr
                      key={contact.id}
                      className="group/row border-b border-surface-100/60 dark:border-surface-800/40 last:border-0
                        hover:bg-gradient-to-r hover:from-brand-50/40 hover:to-transparent
                        dark:hover:from-brand-950/20 dark:hover:to-transparent
                        transition-all duration-200"
                      style={{ animation: `fade-in 0.4s ease-out ${index * 30}ms both` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="avatar-gradient group-hover/row:scale-110 transition-transform duration-200">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-900 flex items-center justify-center">
                              <span className="text-sm font-extrabold text-gradient-vivid">
                                {contact.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-[14px] text-surface-900 dark:text-surface-50 block">
                              {contact.name}
                            </span>
                            <span className="text-[11px] text-surface-500 dark:text-surface-400 md:hidden block">
                              {contact.email || contact.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-surface-600 dark:text-surface-300 font-mono">
                        {contact.phone}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-surface-600 dark:text-surface-300 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          {contact.email || <span className="text-surface-400">—</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-surface-600 dark:text-surface-300 hidden lg:table-cell">
                        {contact.company || <span className="text-surface-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={contact.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCall(contact.id)}
                            className="group/action relative p-2.5 rounded-xl
                              text-emerald-600 dark:text-emerald-400
                              hover:bg-emerald-50 dark:hover:bg-emerald-950/50
                              hover:scale-110 active:scale-95
                              transition-all duration-200"
                            title="Call"
                            aria-label="Call contact"
                          >
                            <Phone className="w-4 h-4" strokeWidth={2.25} />
                            <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-surface-900 dark:bg-surface-100 text-xs text-white dark:text-surface-900 font-semibold opacity-0 group-hover/action:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                              Call
                            </span>
                          </button>
                          <button
                            onClick={() => openEditModal(contact)}
                            className="group/action relative p-2.5 rounded-xl
                              text-blue-600 dark:text-blue-400
                              hover:bg-blue-50 dark:hover:bg-blue-950/50
                              hover:scale-110 active:scale-95
                              transition-all duration-200"
                            title="Edit"
                            aria-label="Edit contact"
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={2.25} />
                            <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-surface-900 dark:bg-surface-100 text-xs text-white dark:text-surface-900 font-semibold opacity-0 group-hover/action:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                              Edit
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setContactToDelete(contact);
                              setIsDeleteModalOpen(true);
                            }}
                            className="group/action relative p-2.5 rounded-xl
                              text-red-500 dark:text-red-400
                              hover:bg-red-50 dark:hover:bg-red-950/50
                              hover:scale-110 active:scale-95
                              transition-all duration-200"
                            title="Delete"
                            aria-label="Delete contact"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                            <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-surface-900 dark:bg-surface-100 text-xs text-white dark:text-surface-900 font-semibold opacity-0 group-hover/action:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                              Delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContact(null);
          reset();
        }}
        title={selectedContact ? 'Edit Contact' : 'Add Contact'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {selectedContact ? 'Update Contact' : 'Create Contact'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="Name"
            placeholder="John Smith"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="+1-555-0100"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Input
            label="Company"
            placeholder="Acme Inc"
            error={errors.company?.message}
            {...register('company')}
          />
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-surface-600 dark:text-surface-300 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                text-[14px] text-surface-800 dark:text-surface-100
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-surface-600 dark:text-surface-300 mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-3 rounded-xl
                bg-surface-50 dark:bg-surface-900
                border-2 border-surface-200/60 dark:border-surface-700/60
                text-[14px] text-surface-800 dark:text-surface-100
                focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                transition-all duration-200 resize-none
                placeholder:text-surface-400"
              placeholder="Additional notes..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setContactToDelete(null);
        }}
        title="Delete Contact"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(contactToDelete.id)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0 border border-red-200/60 dark:border-red-900/40">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-[15px] text-surface-700 dark:text-surface-200">
              Are you sure you want to delete <strong className="text-surface-900 dark:text-surface-50 font-bold">{contactToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1.5">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResult(null);
          importMutation.reset();
        }}
        title="Import Contacts from CSV"
        size="md"
      >
        {importResult ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
              </div>
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-300">Import Complete</p>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  {importResult.imported} contacts imported successfully
                  {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                </p>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 max-h-40 overflow-y-auto">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">
                  Errors
                </p>
                <ul className="text-sm text-amber-600/80 dark:text-amber-400/80 space-y-1">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-[14px] text-surface-600 dark:text-surface-300">
              Upload a CSV file with the following columns: <code className="text-brand-600 dark:text-brand-400 font-mono font-semibold">name, phone, email, company, status</code>
            </p>
            <div className="group border-2 border-dashed border-surface-200/80 dark:border-surface-700/60
              hover:border-brand-500/60 dark:hover:border-brand-400/60
              rounded-2xl p-10 text-center transition-colors duration-200
              bg-surface-50/50 dark:bg-surface-900/40">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-7 h-7 text-brand-500" strokeWidth={2} />
              </div>
              <p className="text-[14px] font-semibold text-surface-700 dark:text-surface-200 mb-1">
                Drop your CSV file here
              </p>
              <p className="text-[12px] text-surface-500 dark:text-surface-400 mb-4">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={triggerFilePicker}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing…' : 'Select File'}
              </Button>
            </div>
            <div className="text-[13px] text-surface-600 dark:text-surface-300 p-4 rounded-xl bg-surface-100/50 dark:bg-surface-800/40 border border-surface-200/40 dark:border-surface-700/40">
              <p className="font-bold text-[11px] uppercase tracking-[0.08em] text-surface-700 dark:text-surface-200 mb-2.5">
                Example CSV format
              </p>
              <code className="block bg-white dark:bg-surface-900 p-3 rounded-lg text-[11px] font-mono overflow-x-auto border border-surface-200/40 dark:border-surface-700/40 text-surface-700 dark:text-surface-300">
                name,phone,email,company,status<br />
                John Smith,+1-555-0101,john@example.com,Acme Inc,new
              </code>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Contacts;

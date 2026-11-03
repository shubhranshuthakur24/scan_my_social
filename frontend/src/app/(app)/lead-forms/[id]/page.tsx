'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SubmissionsDataTable from './components/SubmissionsDataTable';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  getLeadForm,
  updateLeadForm,
  togglePublishForm,
  deleteLeadForm,
  getFormSubmissions,
  downloadSubmissionsCsv,
  uploadFormCover,
  removeFormCover,
  LeadForm,
  LeadFormField,
  LeadFormFieldType,
  LeadFormSettings,
  LeadFormSubmission,
  Pagination,
} from '@/lib/api/leadFormsService';
import {
  ArrowLeft,
  FormInput,
  Save,
  Globe2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  GripVertical,
  Sliders,
  Users,
  Download,
  UploadCloud,
  FileText,
  Mail,
  Phone,
  Hash,
  Link2,
  MapPin,
  Calendar,
  List,
  CheckSquare,
  CircleDot,
  Star,
  FileUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const FIELD_TYPE_CONFIG: Record<
  LeadFormFieldType,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  text: { label: 'Short Text', icon: FileText, description: 'Single-line text input' },
  number: { label: 'Number', icon: Hash, description: 'Numeric values or quantities' },
  email: { label: 'Email', icon: Mail, description: 'Validated email address' },
  url: { label: 'Website URL', icon: Link2, description: 'Web or profile link' },
  phone: { label: 'Phone Number', icon: Phone, description: 'Mobile or WhatsApp number' },
  location: { label: 'Location / City', icon: MapPin, description: 'City or state address' },
  country: { label: 'Country', icon: Globe2, description: 'Country of residence' },
  date: { label: 'Date', icon: Calendar, description: 'Date picker input' },
  dropdown: { label: 'Dropdown Menu', icon: List, description: 'Select one from list' },
  checkbox: { label: 'Checkboxes', icon: CheckSquare, description: 'Multi-select options' },
  radio: { label: 'Radio Choices', icon: CircleDot, description: 'Choose single option' },
  rating: { label: 'Rating Scale', icon: Star, description: 'Interactive star rating' },
  upload: { label: 'File Upload', icon: FileUp, description: 'PDF, PNG, JPG (max 4MB)' },
};

export default function LeadFormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const formId = resolvedParams.id;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'summary' | 'editor' | 'submissions' | 'settings'>('editor');
  const [form, setForm] = useState<LeadForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Dirty State
  const [fields, setFields] = useState<LeadFormField[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState<LeadFormSettings>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Actions
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState<LeadFormSubmission[]>([]);
  const [submissionsPagination, setSubmissionsPagination] = useState<Pagination | null>(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPerPage, setSubmissionsPerPage] = useState(15);
  const [isExporting, setIsExporting] = useState(false);

  // Cover Image State
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getLeadForm(formId);
        if (!ignore) {
          setForm(data);
          setTitle(data.title);
          setDescription(data.description || '');
          setFields(data.fields || []);
          setSettings(data.settings || {});
          setIsDirty(false);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load form');
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [formId]);

  useEffect(() => {
    let ignore = false;
    if (activeTab === 'submissions') {
      async function loadSubmissions() {
        try {
          const res = await getFormSubmissions(formId, { page: submissionsPage, per_page: submissionsPerPage });
          if (!ignore) {
            setSubmissions(res.submissions);
            setSubmissionsPagination(res.pagination);
            setIsLoadingSubmissions(false);
          }
        } catch (err) {
          if (!ignore) {
            console.error('Failed to load submissions:', err);
            setIsLoadingSubmissions(false);
          }
        }
      }
      loadSubmissions();
    }
    return () => {
      ignore = true;
    };
  }, [activeTab, formId, submissionsPage, submissionsPerPage]);

  // Drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
    setIsDirty(true);
  };

  // Add field from toolbox
  const handleAddField = (type: LeadFormFieldType) => {
    const nextNum = fields.length + 1;
    const defaultLabel = `${FIELD_TYPE_CONFIG[type].label}`;
    const generatedKey = `field_${type}_${nextNum}`;

    const newField: LeadFormField = {
      id: `field_${type}_${nextNum}`,
      key: generatedKey,
      type,
      label: defaultLabel,
      placeholder: type === 'rating' || type === 'upload' ? '' : `Enter your ${defaultLabel.toLowerCase()}...`,
      required: false,
      options: ['dropdown', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : [],
      max_rating: type === 'rating' ? 5 : undefined,
    };

    setFields([...fields, newField]);
    setIsDirty(true);
  };

  const handleUpdateField = (index: number, updates: Partial<LeadFormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
    setIsDirty(true);
  };

  const handleRemoveField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!form) return;
    try {
      setIsSaving(true);
      const updatedForm = await updateLeadForm(form.id, {
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: form.cover_image_url,
        status: form.status,
        fields,
        settings,
      });
      setForm(updatedForm);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!form) return;
    try {
      setIsPublishing(true);
      const res = await togglePublishForm(form.id);
      setForm((prev) => (prev ? { ...prev, status: res.status, published_at: res.published_at } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to toggle publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (!form) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/f/${form.public_id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    if (!form) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const iframeCode = `<iframe src="${origin}/f/${form.public_id}" width="100%" height="650" frameborder="0" style="border:none; border-radius:16px;"></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setIsUploadingCover(true);
      const res = await uploadFormCover(form.id, file);
      setForm((prev) => (prev ? { ...prev, cover_image_url: res.cover_image_url } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to upload cover banner');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!form || !form.cover_image_url) return;
    try {
      setIsUploadingCover(true);
      await removeFormCover(form.id);
      setForm((prev) => (prev ? { ...prev, cover_image_url: null } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove cover banner');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleExportCsv = async () => {
    if (!form) return;
    try {
      setIsExporting(true);
      await downloadSubmissionsCsv(form.id, `lead-form-${form.public_id}-submissions.csv`);
    } catch {
      alert('Failed to export submissions');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!form) return;
    if (!confirm(`Are you sure you want to delete "${form.title}"? This cannot be undone.`)) return;
    try {
      await deleteLeadForm(form.id);
      router.push('/lead-forms');
    } catch {
      alert('Failed to delete form');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading form builder console...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Form Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {error || 'The requested form could not be found or you do not have permission to access it.'}
        </p>
        <Link
          href="/lead-forms"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lead Forms</span>
        </Link>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/f/${form.public_id}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navbar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/lead-forms"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Back to Forms"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black text-slate-900 tracking-tight">{title}</h1>
              {form.status === 'published' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  Draft
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Slug: /f/{form.public_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {form.status === 'published' && (
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isPublishing}
            onClick={handleTogglePublish}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{form.status === 'published' ? 'Switch to Draft' : 'Publish Live'}</span>
          </button>

          {isDirty && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          )}

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-2xl w-fit">
        {(
          [
            { key: 'editor', label: 'Form Editor', icon: Sliders },
            { key: 'submissions', label: `Submissions (${form.submissions_count || 0})`, icon: Users },
            { key: 'summary', label: 'Summary & Embed', icon: FormInput },
            { key: 'settings', label: 'Settings', icon: Sliders },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive ? 'bg-primary-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Editor (Drag and Drop Form Canvas + Toolbox) */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Canvas (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Form Canvas</h2>
                  <p className="text-xs text-slate-500">Drag to reorder questions. Click to edit labels and properties.</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {fields.length} Fields Configured
                </span>
              </div>

              {fields.length === 0 ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Sliders className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Your Form Has No Questions</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                    Add fields from the Toolbox on the right to start building your form.
                  </p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="lead-form-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {fields.map((field, index) => {
                          const config = FIELD_TYPE_CONFIG[field.type] || FIELD_TYPE_CONFIG.text;
                          const FieldIcon = config.icon;

                          return (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`rounded-xl border transition-all p-4 bg-white ${snapshot.isDragging
                                    ? 'border-primary-500 shadow-lg ring-2 ring-primary-500/20'
                                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing mt-1"
                                      title="Drag to reorder"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 space-y-3">
                                      {/* Header with Type & Actions */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                                            <FieldIcon className="w-3 h-3 text-slate-500" />
                                            {config.label}
                                          </span>
                                          <span className="text-[10px] font-mono text-slate-400">
                                            key: {field.key}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={field.required}
                                              onChange={(e) =>
                                                handleUpdateField(index, { required: e.target.checked })
                                              }
                                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/20 w-3.5 h-3.5"
                                            />
                                            <span>Required</span>
                                          </label>

                                          <button
                                            type="button"
                                            onClick={() => handleRemoveField(index)}
                                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                            title="Delete Field"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Label & Placeholder Inputs */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Question Label
                                          </label>
                                          <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) =>
                                              handleUpdateField(index, { label: e.target.value })
                                            }
                                            className="w-full text-xs font-bold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-primary-500"
                                          />
                                        </div>

                                        {!['rating', 'upload'].includes(field.type) && (
                                          <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                              Placeholder Hint
                                            </label>
                                            <input
                                              type="text"
                                              value={field.placeholder || ''}
                                              onChange={(e) =>
                                                handleUpdateField(index, { placeholder: e.target.value })
                                              }
                                              className="w-full text-xs font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-primary-500"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Options Editor for Choice Fields */}
                                      {['dropdown', 'radio', 'checkbox'].includes(field.type) && (
                                        <div className="pt-2 border-t border-slate-100">
                                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Choices (Comma separated)
                                          </label>
                                          <input
                                            type="text"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => {
                                              const opts = e.target.value
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
                                              handleUpdateField(index, { options: opts });
                                            }}
                                            placeholder="Option A, Option B, Option C"
                                            className="w-full text-xs font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-primary-500"
                                          />
                                        </div>
                                      )}

                                      {/* Rating Scale Configuration */}
                                      {field.type === 'rating' && (
                                        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                                          <label className="text-[11px] font-bold text-slate-600">
                                            Max Stars: {field.max_rating || 5}
                                          </label>
                                          <input
                                            type="range"
                                            min={3}
                                            max={10}
                                            value={field.max_rating || 5}
                                            onChange={(e) =>
                                              handleUpdateField(index, { max_rating: Number(e.target.value) })
                                            }
                                            className="accent-primary-600 w-32 cursor-pointer"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>

          {/* Side Toolbox (1 col) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 sticky top-6">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Field Toolbox</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any field type to add it to the canvas</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {(Object.keys(FIELD_TYPE_CONFIG) as LeadFormFieldType[]).map((type) => {
                const config = FIELD_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddField(type)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 hover:border-primary-500/50 hover:bg-primary-50/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                        {config.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{config.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Submissions */}
      {activeTab === 'submissions' && (
        <SubmissionsDataTable
          submissions={submissions}
          fields={fields}
          pagination={submissionsPagination}
          isLoading={isLoadingSubmissions}
          isExporting={isExporting}
          onExportCsv={handleExportCsv}
          onPageChange={(p) => setSubmissionsPage(p)}
          onPerPageChange={(size) => {
            setSubmissionsPerPage(size);
            setSubmissionsPage(1);
          }}
          perPageOptions={[10, 15, 25, 50]}
        />
      )}

      {/* Tab 3: Summary & Embed */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Share & Embed Form</h3>
            <p className="text-xs text-slate-500">
              Share the direct landing page or embed the form into your website or Notion docs.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Public Landing Page Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full text-xs font-mono text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPublicLink}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors shrink-0"
                    title="Preview Live Page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  HTML Iframe Embed Code
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    readOnly
                    value={`<iframe src="${publicUrl}" width="100%" height="650" frameborder="0" style="border:none; border-radius:16px;"></iframe>`}
                    className="w-full text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className="absolute right-3 bottom-3 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {copiedEmbed ? 'Copied' : 'Copy Embed Snippet'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Form Specifications</h3>
            <div className="space-y-3 pt-1">
              <div className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-400">Total Submissions:</span>
                <span className="font-bold text-slate-900">{form.submissions_count || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-400">Form Status:</span>
                <span className="font-bold capitalize text-slate-900">{form.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-400">Published Timestamp:</span>
                <span className="font-bold text-slate-900">
                  {form.published_at ? new Date(form.published_at).toLocaleString() : 'Not published'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-400">AutoDM Integration:</span>
                <span className="font-bold text-primary-600">Available as trigger CTA link</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-6">
          {/* General Information */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">General Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Form Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-medium text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-medium text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Cover Banner Image */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Cover Banner Image</h3>
            {form.cover_image_url ? (
              <div className="space-y-3">
                <img
                  src={form.cover_image_url}
                  alt="Cover Banner"
                  className="w-full h-40 object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  disabled={isUploadingCover}
                  onClick={handleRemoveCover}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Remove Cover Image
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-primary-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-700">Click to upload header banner</span>
                <span className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WebP (max 5MB)</span>
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Completion & Redirection Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Completion & Redirection</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Submit Button Label</label>
                <input
                  type="text"
                  value={settings.submit_button_label || 'Submit'}
                  onChange={(e) => {
                    setSettings({ ...settings, submit_button_label: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-medium text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Success Message</label>
                <input
                  type="text"
                  value={settings.success_message || 'Thanks, your response has been recorded.'}
                  onChange={(e) => {
                    setSettings({ ...settings, success_message: e.target.value });
                    setIsDirty(true);
                  }}
                  className="w-full text-xs font-medium text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.redirect_enabled || false}
                    onChange={(e) => {
                      setSettings({ ...settings, redirect_enabled: e.target.checked });
                      setIsDirty(true);
                    }}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/20 w-4 h-4"
                  />
                  <span>Redirect respondent after submission</span>
                </label>

                {settings.redirect_enabled && (
                  <div className="mt-2">
                    <input
                      type="url"
                      placeholder="https://example.com/thank-you"
                      value={settings.redirect_url || ''}
                      onChange={(e) => {
                        setSettings({ ...settings, redirect_url: e.target.value });
                        setIsDirty(true);
                      }}
                      className="w-full text-xs font-medium text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-rose-600 uppercase tracking-wider">Danger Zone</h3>
            <p className="text-xs text-slate-500">
              Permanently delete this form and all recorded submissions. This action cannot be reversed.
            </p>
            <button
              type="button"
              onClick={handleDeleteForm}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Delete Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState, use } from 'react';
import {
  getPublicForm,
  submitPublicForm,
  LeadFormField,
  LeadFormSettings,
} from '@/lib/api/leadFormsService';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  Upload,
  ShieldCheck,
} from 'lucide-react';

export default function PublicRespondentFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const resolvedParams = use(params);
  const publicId = resolvedParams.publicId;

  const [form, setForm] = useState<{
    id: number;
    public_id: string;
    title: string;
    description?: string | null;
    cover_image_url?: string | null;
    fields: LeadFormField[];
    settings: LeadFormSettings;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fileUploads, setFileUploads] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      try {
        setIsLoading(true);
        setNotFound(false);
        const res = await getPublicForm(publicId);
        setForm(res.form);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [publicId]);

  const handleInputChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (key: string, option: string, checked: boolean) => {
    const current = Array.isArray(formData[key]) ? (formData[key] as string[]) : [];
    const updated = checked ? [...current, option] : current.filter((o) => o !== option);
    setFormData((prev) => ({ ...prev, [key]: updated }));
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileUploads((prev) => ({ ...prev, [key]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await submitPublicForm(form.public_id, formData, fileUploads);
      setIsSubmitted(true);
      setSuccessMessage(result.message || form.settings.success_message || 'Thank you! Your response has been recorded.');

      if (result.redirect_url) {
        setRedirectNotice(result.redirect_url);
        setTimeout(() => {
          window.location.href = result.redirect_url!;
        }, 2200);
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please check your answers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Form Not Found</h1>
            <p className="text-xs text-slate-500 mt-1">
              This form is either unpublished, expired, or does not exist. Please contact the link creator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Submission Received</h1>
            <p className="text-sm font-medium text-slate-600 mt-2">{successMessage}</p>
          </div>

          {redirectNotice && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
              <span>Redirecting you shortly...</span>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Powered by Scan My Social</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-10 px-4 sm:px-6">
      <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Cover Banner */}
        {form.cover_image_url && (
          <div className="w-full h-44 sm:h-52 overflow-hidden relative">
            <img
              src={form.cover_image_url}
              alt="Form Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title and Intro */}
        <div className="p-6 sm:p-8 border-b border-slate-100 space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{form.title}</h1>
          {form.description && (
            <p className="text-xs sm:text-sm text-slate-500 whitespace-pre-line leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-5">
            {form.fields.map((field) => {
              const value = (formData[field.key] as string) || '';

              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>

                  {/* Text, Number, Email, URL, Phone, Location, Country */}
                  {['text', 'number', 'email', 'url', 'phone', 'location', 'country'].includes(field.type) && (
                    <input
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'email'
                          ? 'email'
                          : field.type === 'url'
                          ? 'url'
                          : field.type === 'phone'
                          ? 'tel'
                          : 'text'
                      }
                      required={field.required}
                      placeholder={field.placeholder || ''}
                      value={value}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium text-slate-900 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400 bg-slate-50/40 focus:bg-white"
                    />
                  )}

                  {/* Date Input */}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      required={field.required}
                      value={value}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium text-slate-900 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50/40 focus:bg-white"
                    />
                  )}

                  {/* Dropdown Menu */}
                  {field.type === 'dropdown' && (
                    <select
                      required={field.required}
                      value={value}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium text-slate-900 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50/40 focus:bg-white"
                    >
                      <option value="">Select an option...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Radio Choices */}
                  {field.type === 'radio' && (
                    <div className="space-y-2 pt-1">
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          <input
                            type="radio"
                            name={field.key}
                            value={opt}
                            required={field.required && !value}
                            checked={value === opt}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="text-primary-600 focus:ring-primary-500/20 w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-slate-800">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox Options */}
                  {field.type === 'checkbox' && (
                    <div className="space-y-2 pt-1">
                      {(field.options || []).map((opt) => {
                        const checked =
                          Array.isArray(formData[field.key]) &&
                          (formData[field.key] as string[]).includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                handleCheckboxChange(field.key, opt, e.target.checked)
                              }
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/20 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-slate-800">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Rating Scale */}
                  {field.type === 'rating' && (
                    <div className="flex items-center gap-2 pt-1">
                      {Array.from({ length: field.max_rating || 5 }, (_, i) => i + 1).map((num) => {
                        const isSelected = Number(formData[field.key] || 0) >= num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleInputChange(field.key, num)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-2xs'
                                : 'border-slate-200 text-slate-300 hover:text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <Star className={`w-5 h-5 ${isSelected ? 'fill-amber-400' : ''}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* File Upload */}
                  {field.type === 'upload' && (
                    <label className="border-2 border-dashed border-slate-200 hover:border-primary-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/30">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">
                        {fileUploads[field.key] ? fileUploads[field.key].name : 'Click to choose file'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PDF, JPG, PNG or WebP (max 4MB)
                      </span>
                      <input
                        type="file"
                        required={field.required && !fileUploads[field.key]}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleFileChange(field.key, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-primary-700 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{form.settings.submit_button_label || 'Submit'}</span>
            </button>
          </div>
        </form>

        {/* Footer Brand */}
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure Form Powered by Scan My Social</span>
          </div>
        </div>
      </div>
    </div>
  );
}

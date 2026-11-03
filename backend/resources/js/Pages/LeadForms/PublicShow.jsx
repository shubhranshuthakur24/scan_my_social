import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PublicShow({ form }) {
    const { flash, csrf_token: csrfToken } = usePage().props;
    const { data, setData, post, processing, errors, setError, clearErrors, transform } = useForm({
        data: {},
    });
    const submitUrl = form.submit_url ?? `/f/${form.public_id}/submit`;

    const updateValue = (key, value) => {
        setData('data', {
            ...data.data,
            [key]: value,
        });
    };

    const toggleCheckboxValue = (key, option, checked) => {
        const current = Array.isArray(data.data[key]) ? data.data[key] : [];
        const next = checked
            ? [...new Set([...current, option])]
            : current.filter((item) => item !== option);

        updateValue(key, next);
    };

    const submit = (event) => {
        event.preventDefault();
        clearErrors();

        const submittedData = readSubmissionData(event.currentTarget, form.fields || []);
        setData('data', submittedData);

        const newErrors = {};
        let hasFrontendErrors = false;

        (form.fields || []).forEach((field) => {
            if (field.required) {
                const value = submittedData[field.key];

                if (isEmptySubmissionValue(value)) {
                    newErrors[`data.${field.key}`] = `${field.label} is required`;
                    hasFrontendErrors = true;
                }
            }
        });

        if (hasFrontendErrors) {
            setError(newErrors);
            return;
        }

        transform(() => ({
            _token: csrfToken,
            data: submittedData,
        }));

        post(submitUrl, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const fieldError = (key) => {
        // Check for specific data.key, data.key.0, or just key
        return errors[`data.${key}`] || errors[`data.${key}.0`] || errors[key] || errors[`${key}.0`];
    };

    const hasErrors = Object.keys(errors).length > 0;

    const [countdown, setCountdown] = useState(null);

    useEffect(() => {
        if (flash?.redirect_url && flash?.success) {
            setCountdown(5);
            
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        window.location.href = flash.redirect_url;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [flash?.redirect_url, flash?.success]);

    return (
        <>
            <Head title={form.title || 'Lead Form'} />

            <main className="min-h-screen bg-slate-50 px-4 py-10 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {flash?.success ? (
                        <motion.div
                            key="success-card"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50"
                        >
                            <div className="bg-emerald-500 py-12 flex justify-center relative overflow-hidden">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                                    className="relative z-10"
                                >
                                    <CheckCircle2 className="h-20 w-20 text-white" />
                                </motion.div>
                                <div className="absolute inset-0 opacity-10">
                                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                                    </svg>
                                </div>
                            </div>

                            <div className="p-8 text-center">
                                <h2 className="text-2xl font-black text-slate-900 mb-2">Thank You!</h2>
                                <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                                    {flash.success}
                                </p>

                                {countdown !== null ? (
                                    <div className="space-y-4">
                                        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <motion.div 
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 5, ease: "linear" }}
                                                className="absolute inset-y-0 left-0 bg-emerald-500"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center justify-center gap-2 text-sm font-bold text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                                <span>Redirecting to <span className="text-slate-900 break-all">{flash.redirect_url}</span> in {countdown}s...</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href = flash.redirect_url}
                                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                                        >
                                            Click here if not redirected <ArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-4">
                                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50"
                        >
                            {form.cover_image_url && (
                                <img
                                    src={form.cover_image_url}
                                    alt={form.title}
                                    className="mb-5 h-44 w-full rounded-xl object-cover shadow-sm"
                                />
                            )}

                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{form.title}</h1>
                            {form.description && (
                                <p className="mt-2 text-sm text-slate-600 font-medium">{form.description}</p>
                            )}

                            {hasErrors && !flash?.success && !Object.values(form.fields || []).some(f => fieldError(f.key)) && (
                                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                                    Please correct the errors in the form and try again.
                                </div>
                            )}

                            <form
                                action={submitUrl}
                                method="post"
                                encType="multipart/form-data"
                                onSubmit={submit}
                                className="mt-8 space-y-5"
                            >
                                <input type="hidden" name="_token" value={csrfToken || ''} />

                                {(form.fields || []).map((field) => {
                                    const key = field.key;
                                    const type = field.type || 'text';
                                    const value = data.data[key] ?? (type === 'checkbox' ? [] : '');
                                    const inputName = submissionInputName(key);
                                    const options = Array.isArray(field.options)
                                        ? field.options
                                        : (typeof field.options === 'string'
                                            ? field.options
                                                .split(',')
                                                .map((option) => option.trim())
                                                .filter(Boolean)
                                            : []);
                                    const error = fieldError(key);

                                    if (!key) {
                                        return null;
                                    }

                                    return (
                                        <div key={field.id || key} className="space-y-1.5">
                                            <label className="block text-sm font-bold text-slate-700 ml-1">
                                                {field.label}
                                                {field.required && <span className="text-red-500"> *</span>}
                                            </label>

                                            {type === 'dropdown' && (
                                                <select
                                                    name={inputName}
                                                    required={Boolean(field.required)}
                                                    value={value || ''}
                                                    onChange={(event) => updateValue(key, event.target.value)}
                                                    className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 placeholder:text-slate-400"
                                                >
                                                    <option value="">Select an option</option>
                                                    {options.map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {type === 'checkbox' && (
                                                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                                                    {options.map((option) => (
                                                        <label key={option} className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition-colors group">
                                                            <input
                                                                type="checkbox"
                                                                name={submissionInputName(key, true)}
                                                                value={option}
                                                                checked={Array.isArray(value) && value.includes(option)}
                                                                onChange={(event) => toggleCheckboxValue(key, option, event.target.checked)}
                                                                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 transition-all"
                                                            />
                                                            {option}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {type === 'radio' && (
                                                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                                                    {options.map((option) => (
                                                        <label key={option} className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer transition-colors group">
                                                            <input
                                                                type="radio"
                                                                name={inputName}
                                                                value={option}
                                                                required={Boolean(field.required)}
                                                                checked={value === option}
                                                                onChange={(event) => updateValue(key, event.target.value)}
                                                                className="h-4 w-4 border-slate-300 text-primary-600 focus:ring-primary-500 transition-all"
                                                            />
                                                            {option}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {type === 'rating' && (
                                                <input
                                                    type="number"
                                                    name={inputName}
                                                    min={1}
                                                    max={field.max_rating || 5}
                                                    required={Boolean(field.required)}
                                                    value={value || ''}
                                                    onChange={(event) => updateValue(key, event.target.value)}
                                                    className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"
                                                />
                                            )}

                                            {type === 'upload' && (
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        name={inputName}
                                                        required={Boolean(field.required)}
                                                        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                                        onChange={(event) => updateValue(key, event.target.files?.[0] || null)}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 transition-all"
                                                    />
                                                </div>
                                            )}

                                            {!['dropdown', 'checkbox', 'radio', 'rating', 'upload'].includes(type) && (
                                                <input
                                                    type={inputTypeForField(type)}
                                                    name={inputName}
                                                    required={Boolean(field.required)}
                                                    autoComplete={autoCompleteForField(field)}
                                                    value={value || ''}
                                                    onChange={(event) => updateValue(key, event.target.value)}
                                                    placeholder={field.placeholder || ''}
                                                    className="w-full rounded-xl border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 placeholder:text-slate-400"
                                                />
                                            )}

                                            {error && (
                                                <p className="mt-1 text-xs font-bold text-red-500 ml-1">
                                                    {error}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                                {hasErrors && !flash?.success && !Object.values(form.fields || []).some(f => fieldError(f.key)) && (
                                    <div className="pt-4 border-t border-red-100 mt-4">
                                        <div className="rounded-xl bg-red-50 p-4">
                                            <p className="text-xs font-bold text-red-700">
                                                Please fill out the form correctly to continue.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                                            {processing
                                                ? 'Processing...'
                                                : (form.settings?.submit_button_label || 'Submit Form')}
                                        </div>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </>
    );
}

function submissionInputName(key, multiple = false) {
    return `data[${key}]${multiple ? '[]' : ''}`;
}

function readSubmissionData(formElement, fields) {
    const formData = new FormData(formElement);

    return fields.reduce((payload, field) => {
        const key = field.key;

        if (!key) {
            return payload;
        }

        const type = field.type || 'text';

        if (type === 'checkbox') {
            const values = formData
                .getAll(submissionInputName(key, true))
                .map((value) => String(value));

            if (values.length > 0 || field.required) {
                payload[key] = values;
            }

            return payload;
        }

        const value = formData.get(submissionInputName(key));

        if (type === 'upload') {
            if (isFilledFile(value)) {
                payload[key] = value;
            }

            return payload;
        }

        if (value !== null) {
            payload[key] = String(value);
        }

        return payload;
    }, {});
}

function isEmptySubmissionValue(value) {
    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (isFile(value)) {
        return !value.name;
    }

    return value === undefined || value === null || value === '';
}

function isFilledFile(value) {
    return isFile(value) && value.name !== '';
}

function isFile(value) {
    return typeof File !== 'undefined' && value instanceof File;
}

function inputTypeForField(type) {
    if (type === 'phone') {
        return 'tel';
    }

    if (['email', 'url', 'number', 'date'].includes(type)) {
        return type;
    }

    return 'text';
}

function autoCompleteForField(field) {
    const type = field.type || 'text';
    const descriptor = `${field.key || ''} ${field.label || ''}`.toLowerCase();

    if (type === 'email' || descriptor.includes('email')) {
        return 'email';
    }

    if (type === 'phone' || descriptor.includes('phone') || descriptor.includes('mobile') || descriptor.includes('whatsapp')) {
        return 'tel';
    }

    if (descriptor.includes('name')) {
        return 'name';
    }

    if (type === 'country' || descriptor.includes('country')) {
        return 'country-name';
    }

    return undefined;
}

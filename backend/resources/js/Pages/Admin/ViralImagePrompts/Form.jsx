import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';

const MAX_TITLE_LENGTH = 255;
const MAX_CATEGORY_LENGTH = 100;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export default function Form({ prompt = null }) {
    const isEditing = !!prompt;
    const hasExistingImage = Boolean(prompt?.image_path);
    const isImageRequired = !isEditing || !hasExistingImage;
    const [imagePreview, setImagePreview] = useState(prompt?.image_path || null);
    const [clientErrors, setClientErrors] = useState({});
    const objectUrlRef = useRef(null);
    const fileInput = useRef();

    const { data, setData, post, processing, errors, transform } = useForm({
        title: prompt?.title || '',
        category: prompt?.category || '',
        prompt: prompt?.prompt || '',
        image_file: null,
    });

    const mergedErrors = {
        ...errors,
        ...clientErrors,
    };

    const clearClientError = (field) => {
        setClientErrors((currentErrors) => {
            if (!currentErrors[field]) {
                return currentErrors;
            }

            const nextErrors = { ...currentErrors };
            delete nextErrors[field];

            return nextErrors;
        });
    };

    const validateImageFile = (file) => {
        if (!file) {
            return null;
        }

        if (!file.type.startsWith('image/')) {
            return 'Please upload a valid image file.';
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            return 'Image must be 5MB or smaller.';
        }

        return null;
    };

    const triggerFileInput = () => {
        fileInput.current?.click();
    };

    const handleTextChange = (field) => (e) => {
        setData(field, e.target.value);
        clearClientError(field);
    };

    const handleTextBlur = (field) => (e) => {
        const trimmedValue = e.target.value.trim();
        if (trimmedValue !== e.target.value) {
            setData(field, trimmedValue);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};
        const trimmedTitle = data.title.trim();
        const trimmedCategory = data.category.trim();
        const trimmedPrompt = data.prompt.trim();

        if (!trimmedTitle) {
            nextErrors.title = 'Title is required.';
        } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
            nextErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less.`;
        }

        if (!trimmedCategory) {
            nextErrors.category = 'Category is required.';
        } else if (trimmedCategory.length > MAX_CATEGORY_LENGTH) {
            nextErrors.category = `Category must be ${MAX_CATEGORY_LENGTH} characters or less.`;
        }

        if (!trimmedPrompt) {
            nextErrors.prompt = 'Prompt is required.';
        }

        const imageError = validateImageFile(data.image_file);
        if (imageError) {
            nextErrors.image_file = imageError;
        }

        if (isImageRequired && !data.image_file) {
            nextErrors.image_file = 'Cover image is required.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setClientErrors(nextErrors);
            return;
        }

        setClientErrors({});
        setData('title', trimmedTitle);
        setData('category', trimmedCategory);
        setData('prompt', trimmedPrompt);

        transform((formData) => ({
            ...formData,
            title: trimmedTitle,
            category: trimmedCategory,
            prompt: trimmedPrompt,
        }));

        if (isEditing) {
            post(route('viral-image-prompts.update', prompt.id), {
                forceFormData: true,
                onFinish: () => transform((formData) => formData),
            });
        } else {
            post(route('viral-image-prompts.store'), {
                forceFormData: true,
                onFinish: () => transform((formData) => formData),
            });
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const imageError = validateImageFile(file);
        if (imageError) {
            setData('image_file', null);
            setClientErrors((currentErrors) => ({
                ...currentErrors,
                image_file: imageError,
            }));
            e.target.value = '';
            return;
        }

        clearClientError('image_file');
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(file);
        objectUrlRef.current = objectUrl;

        setData('image_file', file);
        setImagePreview(objectUrl);
    };

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    return (
        <AuthenticatedLayout>
            <Head title={isEditing ? 'Edit Prompt' : 'Create Prompt'} />

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={route('viral-image-prompts.manage')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <Icon name="arrowLeft" size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {isEditing ? 'Edit Prompt' : 'Create New Prompt'}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {isEditing ? 'Update the details of your viral image prompt.' : 'Add a new viral angle to the prompt library.'}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Left Column: Details */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={MAX_TITLE_LENGTH}
                                        value={data.title}
                                        onChange={handleTextChange('title')}
                                        onBlur={handleTextBlur('title')}
                                        placeholder="e.g. Asymmetrical Arc Neon"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium outline-none"
                                    />
                                    {mergedErrors.title && <p className="mt-2 text-xs font-bold text-rose-500 ml-1">{mergedErrors.title}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Category</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={MAX_CATEGORY_LENGTH}
                                        value={data.category}
                                        onChange={handleTextChange('category')}
                                        onBlur={handleTextBlur('category')}
                                        placeholder="e.g. Abstract, Minimalist, 3D"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium outline-none"
                                    />
                                    {mergedErrors.category && <p className="mt-2 text-xs font-bold text-rose-500 ml-1">{mergedErrors.category}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">The AI Prompt</label>
                                    <textarea
                                        rows="6"
                                        required
                                        value={data.prompt}
                                        onChange={handleTextChange('prompt')}
                                        onBlur={handleTextBlur('prompt')}
                                        placeholder="Enter the detailed image prompt here..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium outline-none resize-none"
                                    />
                                    {mergedErrors.prompt && <p className="mt-2 text-xs font-bold text-rose-500 ml-1">{mergedErrors.prompt}</p>}
                                </div>
                            </div>

                            {/* Right Column: Image */}
                            <div className="space-y-6">
                                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Cover Image</label>

                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={triggerFileInput}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            triggerFileInput();
                                        }
                                    }}
                                    className="relative w-full h-[340px] sm:h-[360px] md:h-[392px] rounded-[1.6rem] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-primary-400 transition-all overflow-hidden group"
                                >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <div className="bg-white/90 rounded-xl px-4 py-2 text-xs font-black text-slate-900 shadow-xl flex items-center gap-2">
                                                    <Icon name="image" size={16} /> Change Image
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100">
                                                <Icon name="image" size={32} />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black uppercase tracking-widest">Click to upload</p>
                                                <p className="text-[10px] font-bold mt-1">Recommended: 4:5 Aspect Ratio</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                {mergedErrors.image_file && <p className="mt-2 text-xs font-bold text-rose-500 ml-1">{mergedErrors.image_file}</p>}


                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                            <Link
                                href={route('viral-image-prompts.manage')}
                                className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {processing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        {isEditing ? 'Save Changes' : 'Create Prompt'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

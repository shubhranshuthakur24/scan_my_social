import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
    CircleHelp,
    GripVertical,
    Image,
    LayoutTemplate,
    Link as LinkIcon,
    Mail,
    MousePointerClick,
    Plus,
    Quote,
    Trash2,
    Type,
    Video,
} from 'lucide-react';

export const webPageBlockTypes = [
    { type: 'hero', label: 'Hero', icon: LayoutTemplate },
    { type: 'text', label: 'Text', icon: Type },
    { type: 'image', label: 'Image', icon: Image },
    { type: 'video', label: 'Video', icon: Video },
    { type: 'cta', label: 'CTA', icon: MousePointerClick },
    { type: 'link_list', label: 'Links', icon: LinkIcon },
    { type: 'faq', label: 'FAQ', icon: CircleHelp },
    { type: 'testimonials', label: 'Quotes', icon: Quote },
    { type: 'contact_form', label: 'Form', icon: Mail },
];

function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : ((random & 0x3) | 0x8);

        return value.toString(16);
    });
}

export function createWebPageSection(type) {
    const defaults = {
        hero: { eyebrow: 'New page', heading: 'A clear, memorable headline', body: 'Describe the promise in a few direct sentences.', image_url: '/images/web-page-templates/creator.jpg', primary_label: 'Get started', primary_url: '#contact' },
        text: { heading: 'Section heading', body: 'Add a clear explanation for this part of the page.' },
        image: { heading: 'Image story', body: 'Add context for the image.', image_url: '/images/web-page-templates/portfolio.jpg' },
        video: { heading: 'Featured video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        cta: { heading: 'Ready to continue?', body: 'Give visitors one clear next step.', primary_label: 'Continue', primary_url: '#contact' },
        link_list: { heading: 'Helpful links', links: [{ label: 'Example link', url: 'https://example.com' }] },
        faq: { heading: 'Questions', items: [{ question: 'What should visitors know?', answer: 'Answer the common question clearly.' }] },
        testimonials: { heading: 'What people say', items: [{ quote: 'This made the next step obvious.', name: 'Customer' }] },
        contact_form: { heading: 'Contact us', button_label: 'Send message', fields: [{ key: 'name', label: 'Name', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'message', label: 'Message', type: 'textarea', required: false }] },
    };

    return { id: createId(), type, content: defaults[type] || {} };
}

function FieldLabel({ children }) {
    return <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">{children}</label>;
}

export function WebPageTextInput({ label, value, onChange, placeholder, type = 'text', error }) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <input value={value || ''} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} className="w-full rounded-lg border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" />
            {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
        </div>
    );
}

export function WebPageTextArea({ label, value, onChange, rows = 3, placeholder, error }) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-lg border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" />
            {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
        </div>
    );
}

export function WebPageSelect({ label, value, onChange, options = [] }) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <select value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10">
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </div>
    );
}

function IconButton({ label, onClick, children, tone = 'default' }) {
    const toneClass = tone === 'danger'
        ? 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900';

    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${toneClass}`}>
            {children}
        </button>
    );
}

function PairRepeater({
    items = [],
    firstKey,
    firstLabel,
    secondKey,
    secondLabel,
    onChange,
    secondMultiline = false,
    error,
}) {
    const updateItem = (index, key, value) => {
        onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
    };
    const removeItem = (index) => onChange(items.filter((_, itemIndex) => itemIndex !== index));
    const addItem = () => onChange([...items, { [firstKey]: '', [secondKey]: '' }]);

    return (
        <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
                <FieldLabel>Items</FieldLabel>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-xs font-black text-primary-700">
                    <Plus className="h-3.5 w-3.5" />
                    Add item
                </button>
            </div>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={`${index}-${item[firstKey]}`} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1.4fr_auto]">
                        <WebPageTextInput label={firstLabel} value={item[firstKey]} onChange={(value) => updateItem(index, firstKey, value)} />
                        {secondMultiline ? (
                            <WebPageTextArea label={secondLabel} value={item[secondKey]} onChange={(value) => updateItem(index, secondKey, value)} rows={2} />
                        ) : (
                            <WebPageTextInput label={secondLabel} value={item[secondKey]} onChange={(value) => updateItem(index, secondKey, value)} />
                        )}
                        <div className="flex items-end">
                            <IconButton label={`Remove item ${index + 1}`} onClick={() => removeItem(index)} tone="danger"><Trash2 className="h-4 w-4" /></IconButton>
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
        </div>
    );
}

function FormFieldRepeater({ fields = [], onChange }) {
    const updateField = (index, key, value) => {
        onChange(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, [key]: value } : field));
    };
    const removeField = (index) => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index));
    const addField = () => onChange([...fields, { key: `field_${fields.length + 1}`, label: 'New field', type: 'text', required: false }]);

    return (
        <div className="lg:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
                <FieldLabel>Form fields</FieldLabel>
                <button type="button" onClick={addField} className="inline-flex items-center gap-1 text-xs font-black text-primary-700">
                    <Plus className="h-3.5 w-3.5" />
                    Add field
                </button>
            </div>
            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={`${field.key}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[0.8fr_1.2fr_0.8fr_auto_auto]">
                        <WebPageTextInput label="Key" value={field.key} onChange={(value) => updateField(index, 'key', value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))} />
                        <WebPageTextInput label="Label" value={field.label} onChange={(value) => updateField(index, 'label', value)} />
                        <WebPageSelect label="Type" value={field.type} onChange={(value) => updateField(index, 'type', value)} options={[
                            { value: 'text', label: 'Text' },
                            { value: 'email', label: 'Email' },
                            { value: 'tel', label: 'Phone' },
                            { value: 'textarea', label: 'Long text' },
                        ]} />
                        <label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-600">
                            <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, 'required', event.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                            Required
                        </label>
                        <div className="flex items-end">
                            <IconButton label={`Remove field ${index + 1}`} onClick={() => removeField(index)} tone="danger"><Trash2 className="h-4 w-4" /></IconButton>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SectionEditor({ section, index, onChange, onDelete, errors = {} }) {
    const content = section.content || {};
    const block = webPageBlockTypes.find(({ type }) => type === section.type);
    const BlockIcon = block?.icon || LayoutTemplate;
    const updateContent = (key, value) => onChange({ ...section, content: { ...content, [key]: value } });
    const prefix = `sections.${index}`;
    const contentError = (key) => errors[`${prefix}.content.${key}`];
    const groupedError = (key) => Object.entries(errors)
        .filter(([errorKey]) => errorKey.startsWith(`${prefix}.content.${key}.`))
        .map(([, message]) => message)
        .filter(Boolean)
        .join(' ');
    const structuralError = [errors[prefix], errors[`${prefix}.id`], errors[`${prefix}.type`], errors[`${prefix}.content`]].filter(Boolean).join(' ');

    return (
        <Draggable draggableId={section.id} index={index}>
            {(provided, snapshot) => (
                <article ref={provided.innerRef} {...provided.draggableProps} className={`rounded-lg border bg-white p-4 shadow-sm transition sm:p-5 ${snapshot.isDragging ? 'border-primary-300 shadow-xl' : 'border-slate-200'}`}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <button type="button" {...provided.dragHandleProps} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500" aria-label={`Reorder ${block?.label || section.type}`} title="Drag to reorder">
                                <GripVertical className="h-4 w-4" />
                            </button>
                            <div className="flex min-w-0 items-center gap-2">
                                <BlockIcon className="h-4 w-4 shrink-0 text-primary-600" />
                                <p className="truncate text-sm font-black text-slate-900">{block?.label || section.type}</p>
                            </div>
                        </div>
                        <IconButton label={`Delete ${block?.label || section.type} block`} onClick={onDelete} tone="danger"><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                    {structuralError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">{structuralError}</p>}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <WebPageTextInput label="Heading" value={content.heading} onChange={(value) => updateContent('heading', value)} />
                        {section.type === 'hero' && <WebPageTextInput label="Eyebrow" value={content.eyebrow} onChange={(value) => updateContent('eyebrow', value)} />}
                        {['hero', 'text', 'image', 'cta'].includes(section.type) && <WebPageTextArea label="Body" value={content.body} onChange={(value) => updateContent('body', value)} rows={3} />}
                        {['hero', 'image'].includes(section.type) && <WebPageTextInput label="Image URL" value={content.image_url} onChange={(value) => updateContent('image_url', value)} error={contentError('image_url')} />}
                        {section.type === 'video' && <WebPageTextInput label="Embed URL" value={content.url} onChange={(value) => updateContent('url', value)} error={contentError('url')} />}
                        {['hero', 'cta'].includes(section.type) && (
                            <>
                                <WebPageTextInput label="Primary label" value={content.primary_label} onChange={(value) => updateContent('primary_label', value)} />
                                <WebPageTextInput label="Primary URL" value={content.primary_url} onChange={(value) => updateContent('primary_url', value)} error={contentError('primary_url')} />
                                <WebPageTextInput label="Secondary label" value={content.secondary_label} onChange={(value) => updateContent('secondary_label', value)} />
                                <WebPageTextInput label="Secondary URL" value={content.secondary_url} onChange={(value) => updateContent('secondary_url', value)} error={contentError('secondary_url')} />
                            </>
                        )}
                        {section.type === 'link_list' && <PairRepeater items={content.links || []} firstKey="label" firstLabel="Label" secondKey="url" secondLabel="URL" onChange={(value) => updateContent('links', value)} error={groupedError('links')} />}
                        {section.type === 'faq' && <PairRepeater items={content.items || []} firstKey="question" firstLabel="Question" secondKey="answer" secondLabel="Answer" onChange={(value) => updateContent('items', value)} secondMultiline />}
                        {section.type === 'testimonials' && <PairRepeater items={content.items || []} firstKey="name" firstLabel="Name" secondKey="quote" secondLabel="Quote" onChange={(value) => updateContent('items', value)} secondMultiline />}
                        {section.type === 'contact_form' && (
                            <>
                                <WebPageTextInput label="Button label" value={content.button_label} onChange={(value) => updateContent('button_label', value)} />
                                <FormFieldRepeater fields={content.fields || []} onChange={(value) => updateContent('fields', value)} />
                            </>
                        )}
                    </div>
                </article>
            )}
        </Draggable>
    );
}

export function WebPageSectionBuilder({ sections = [], onChange, errors = {}, droppableId = 'web-page-sections' }) {
    const addSection = (type) => onChange([...sections, createWebPageSection(type)]);
    const updateSection = (sectionId, nextSection) => onChange(sections.map((section) => section.id === sectionId ? nextSection : section));
    const deleteSection = (sectionId) => onChange(sections.filter((section) => section.id !== sectionId));
    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }

        const next = [...sections];
        const [moved] = next.splice(result.source.index, 1);
        next.splice(result.destination.index, 0, moved);
        onChange(next);
    };

    return (
        <div>
            {errors.sections && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">{errors.sections}</p>}
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Add block</p>
                    <span className="text-xs font-bold text-slate-500">{sections.length} blocks</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                    {webPageBlockTypes.map(({ type, label, icon: Icon }) => (
                        <button key={type} type="button" onClick={() => addSection(type)} className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId={droppableId}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                            {sections.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <LayoutTemplate className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-3 text-sm font-black text-slate-800">No blocks yet</p>
                                    <p className="mt-1 text-sm text-slate-500">Add a hero or apply a template to begin.</p>
                                </div>
                            ) : sections.map((section, index) => (
                                <SectionEditor
                                    key={section.id}
                                    section={section}
                                    index={index}
                                    onChange={(nextSection) => updateSection(section.id, nextSection)}
                                    onDelete={() => deleteSection(section.id)}
                                    errors={errors}
                                />
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
}

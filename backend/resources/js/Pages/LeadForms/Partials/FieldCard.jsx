import {
    Calendar,
    Circle,
    CheckSquare,
    ChevronDown,
    ChevronDownSquare,
    CloudUpload,
    Copy,
    Globe,
    GripVertical,
    Hash,
    Link as LinkIcon,
    Mail,
    MapPin,
    Phone,
    Star,
    Trash2,
    Type,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

const FIELD_ICONS = {
    text: Type,
    number: Hash,
    email: Mail,
    url: LinkIcon,
    phone: Phone,
    location: MapPin,
    country: Globe,
    date: Calendar,
    dropdown: ChevronDownSquare,
    checkbox: CheckSquare,
    radio: Circle,
    rating: Star,
    upload: CloudUpload,
};

export default function FieldCard({
    field,
    index,
    isExpanded,
    onExpand,
    onUpdate,
    onRemove,
    onDuplicate,
    draggableProvided,
    fieldTypes,
}) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const Icon = FIELD_ICONS[field.type] || Type;

    const updateValue = (key, value) => {
        onUpdate(index, key, value);
    };

    const updateOptions = (value) => {
        const parsedOptions = value
            .replace(/\r\n/g, '\n')
            .split(/[,\n]/)
            .map((option) => option.trim());

        const options = /[,\n]\s*$/.test(value)
            ? parsedOptions
            : parsedOptions.filter(Boolean);

        updateValue('options', options);
    };

    return (
        <div
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            className={`group relative rounded-2xl border transition-all duration-200 ${isExpanded
                ? 'border-primary-200 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
        >
            {/* Header / Summary View */}
            <div
                className={`flex items-center gap-3 p-4 ${isExpanded ? 'border-b border-slate-100' : 'cursor-pointer'}`}
                onClick={() => !isExpanded && onExpand()}
            >
                <div
                    {...draggableProvided.dragHandleProps}
                    className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing"
                >
                    <GripVertical className="h-5 w-5 text-primary-500" />
                </div>

                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isExpanded ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                    <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                            {field.label || 'Untitled Field'}
                        </span>
                        {field.required && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Required</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                        {field.type} {field.key ? `• ${field.key}` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
                        className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg"
                        title="Duplicate"
                    >
                        <Copy className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsConfirmOpen(true); }}
                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg"
                        title="Remove"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onExpand(); }}
                        className={`p-2 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 pt-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Label</label>
                                    <input
                                        type="text"
                                        value={field.label || ''}
                                        onChange={(e) => updateValue('label', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                        placeholder="Enter field label..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Property Key</label>
                                    <input
                                        type="text"
                                        value={field.key || ''}
                                        onChange={(e) => updateValue('key', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                        placeholder="e.g. first_name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Type</label>
                                    <select
                                        value={field.type || 'text'}
                                        onChange={(e) => updateValue('type', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                    >
                                        {fieldTypes.map((item) => (
                                            <option key={item.type} value={item.type}>{item.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Placeholder (optional)</label>
                                    <input
                                        type="text"
                                        value={field.placeholder || ''}
                                        onChange={(e) => updateValue('placeholder', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                        placeholder="e.g. Type something..."
                                    />
                                </div>
                            </div>

                            {(field.type === 'dropdown' || field.type === 'checkbox' || field.type === 'radio') && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Options (comma separated)</label>
                                    <textarea
                                        value={Array.isArray(field.options)
                                            ? field.options.join(', ')
                                            : (typeof field.options === 'string' ? field.options : '')}
                                        onChange={(e) => updateOptions(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                        placeholder="Option 1, Option 2, Option 3"
                                    />
                                </div>
                            )}

                            {field.type === 'rating' && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Max Stars (3-10)</label>
                                    <input
                                        type="number"
                                        min={3}
                                        max={10}
                                        value={field.max_rating || 5}
                                        onChange={(e) => updateValue('max_rating', Number(e.target.value))}
                                        className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-6 pt-2 border-t border-slate-50">
                                <label className="inline-flex items-center gap-2 cursor-pointer group">
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(field.required)}
                                            onChange={(e) => updateValue('required', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Required Field</span>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                show={isConfirmOpen}
                title="Remove Field?"
                message={`Are you sure you want to remove the "${field.label || 'Untitled'}" field? This will erase its configuration.`}
                confirmLabel="Remove"
                variant="danger"
                onConfirm={() => {
                    onRemove(index);
                    setIsConfirmOpen(false);
                }}
                onCancel={() => setIsConfirmOpen(false)}
            />
        </div>
    );
}

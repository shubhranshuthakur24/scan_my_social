import React, { useState, Fragment, forwardRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import { Tab, Dialog, Transition } from '@headlessui/react';
import { clsx } from 'clsx';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

const TabButton = forwardRef(({ selected, children, icon, ...props }, ref) => {
    return (
        <button
            {...props}
            ref={ref}
            className={clsx(
                'flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-wider outline-none transition-all duration-200 border-b-2',
                selected
                    ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30'
            )}
        >
            <Icon name={icon} size={16} />
            {children}
        </button>
    );
});

function IntelligenceTable({ items, onEdit, onDelete, typeLabel }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest w-16">Order</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Label / Slug</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest">Prompt Instruction</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest w-24">Status</th>
                            <th className="px-5 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-5 py-12 text-center text-slate-400 font-medium">
                                    No {typeLabel} found. Add your first one to get started.
                                </td>
                            </tr>
                        )}
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-4">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-xs font-black">
                                        {item.display_order}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="text-sm font-black text-slate-900">{item.label}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.slug}</p>
                                    {item.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <p className="text-xs text-slate-600 line-clamp-2 italic">
                                        "{item.prompt_instruction}"
                                    </p>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={clsx(
                                        'inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border',
                                        item.is_active
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                    )}>
                                        {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Icon name="edit" size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Icon name="trash" size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ItemModal({ isOpen, onClose, item, type, title }) {
    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        label: '',
        description: '',
        prompt_instruction: '',
        display_order: 1,
        is_active: true,
    });

    React.useEffect(() => {
        if (item) {
            setData({
                label: item.label,
                description: item.description || '',
                prompt_instruction: item.prompt_instruction,
                display_order: item.display_order,
                is_active: item.is_active,
            });
        } else {
            reset();
        }
        clearErrors();
    }, [item, isOpen]);

    const submit = (e) => {
        e.preventDefault();

        const routes = {
            hooks: { store: 'admin.script-intelligence.hooks.store', update: 'admin.script-intelligence.hooks.update' },
            ctas: { store: 'admin.script-intelligence.ctas.store', update: 'admin.script-intelligence.ctas.update' },
            objectives: { store: 'admin.script-intelligence.objectives.store', update: 'admin.script-intelligence.objectives.update' },
        };

        if (item) {
            patch(route(routes[type].update, item.id), {
                onSuccess: () => onClose(),
            });
        } else {
            post(route(routes[type].store), {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[600]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-black text-slate-900 tracking-tight">
                                        {item ? 'Edit' : 'Add'} {title}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <Icon name="x" size={20} />
                                    </button>
                                </div>

                                <form onSubmit={submit} className="space-y-5">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                            Label
                                        </label>
                                        <input
                                            type="text"
                                            value={data.label}
                                            onChange={(e) => setData('label', e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-bold focus:border-slate-900 focus:ring-slate-900"
                                            placeholder="e.g. Problem Setup"
                                        />
                                        {errors.label && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.label}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-medium focus:border-slate-900 focus:ring-slate-900 min-h-[80px]"
                                            placeholder="Internal description for this item..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                            AI Prompt Instruction
                                        </label>
                                        <textarea
                                            value={data.prompt_instruction}
                                            onChange={(e) => setData('prompt_instruction', e.target.value)}
                                            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-medium focus:border-slate-900 focus:ring-slate-900 min-h-[120px]"
                                            placeholder="Instructions for the AI to follow when this option is selected..."
                                        />
                                        {errors.prompt_instruction && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1">{errors.prompt_instruction}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                Display Order
                                            </label>
                                            <input
                                                type="number"
                                                value={data.display_order}
                                                onChange={(e) => setData('display_order', e.target.value)}
                                                className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm font-bold focus:border-slate-900 focus:ring-slate-900"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                Active Status
                                            </label>
                                            <label className="relative inline-flex items-center cursor-pointer mt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={data.is_active}
                                                    onChange={(e) => setData('is_active', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                                <span className="ml-3 text-sm font-bold text-slate-600">{data.is_active ? 'Active' : 'Inactive'}</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 rounded-xl bg-slate-100 text-slate-600 py-3 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="flex-1 rounded-xl bg-slate-900 text-white py-3 text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50"
                                        >
                                            {processing ? 'Saving...' : 'Save Item'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

export default function ScriptIntelligence({ hooks, ctas, objectives }) {
    const { flash } = usePage().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);

    const tabs = [
        { label: 'Hook Types', icon: 'wand', items: hooks, type: 'hooks' },
        { label: 'CTA Types', icon: 'send', items: ctas, type: 'ctas' },
        { label: 'Objectives', icon: 'landmark', items: objectives, type: 'objectives' },
    ];

    const handleEdit = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleDelete = (item) => {
        setItemToDelete(item);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;

        const routes = {
            hooks: 'admin.script-intelligence.hooks.destroy',
            ctas: 'admin.script-intelligence.ctas.destroy',
            objectives: 'admin.script-intelligence.objectives.destroy',
        };

        router.delete(route(routes[tabs[currentTab].type], itemToDelete.id), {
            onSuccess: () => setItemToDelete(null),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Script Intelligence" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                                <Icon name="scripts" size={20} />
                            </div>
                            Script Intelligence
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">
                            Manage AI prompt fragments for hooks, calls-to-action, and generation objectives.
                        </p>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        <Icon name="plus" size={16} />
                        Add {tabs[currentTab].label.slice(0, -1)}
                    </button>
                </div>



                <Tab.Group selectedIndex={currentTab} onChange={setCurrentTab}>
                    <Tab.List className="flex border-b border-slate-200">
                        {tabs.map((tab, idx) => (
                            <Tab key={tab.label} as={Fragment}>
                                {({ selected }) => (
                                    <TabButton selected={selected} icon={tab.icon}>
                                        {tab.label}
                                    </TabButton>
                                )}
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels className="mt-6">
                        {tabs.map((tab, idx) => (
                            <Tab.Panel key={idx}>
                                <IntelligenceTable
                                    items={tab.items}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    typeLabel={tab.label.toLowerCase()}
                                />
                            </Tab.Panel>
                        ))}
                    </Tab.Panels>
                </Tab.Group>
            </div>

            <ItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                item={editingItem}
                type={tabs[currentTab].type}
                title={tabs[currentTab].label.slice(0, -1)}
            />

            <ConfirmDialog
                show={!!itemToDelete}
                title={`Delete ${tabs[currentTab].label.slice(0, -1)}?`}
                message={`Are you sure you want to delete "${itemToDelete?.label}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />
        </AuthenticatedLayout>
    );
}

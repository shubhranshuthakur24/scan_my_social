import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

export default function Manage({ prompts }) {
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);


    const filteredPrompts = prompts.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.prompt.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };
    const confirmDelete = () => {
        if (!deleteConfirm) {
            return;
        }

        router.delete(route('viral-image-prompts.destroy', deleteConfirm), {
            preserveScroll: true,
        });
        setDeleteConfirm(null);
    }


    return (
        <AuthenticatedLayout>
            <Head title="Manage Prompts" />

            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manage Prompts</h1>
                        <p className="text-sm text-slate-500 font-medium">Add, update or remove viral image prompts.</p>
                    </div>
                    <Link
                        href={route('viral-image-prompts.create')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <Icon name="plus" size={18} />
                        Create Prompt
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Icon name="search" size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by title, category or content..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-shadow outline-none font-medium"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Image</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Details</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Prompt Preview</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPrompts.length > 0 ? (
                                    filteredPrompts.map((p) => (
                                        <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                                    {p.image_path ? (
                                                        <img src={p.image_path} alt={p.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <Icon name="image" size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 min-w-[200px]">
                                                <div className="font-black text-slate-900 leading-tight">{p.title}</div>
                                                <div className="mt-1">
                                                    <span className="inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-primary-50 text-primary-600 rounded border border-primary-100">
                                                        {p.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-500 font-medium line-clamp-2 italic max-w-sm">
                                                    "{p.prompt}"
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={route('viral-image-prompts.edit', p.id)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <Icon name="edit" size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <Icon name="trash" size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Icon name="search" size={40} className="mb-4 opacity-20" />
                                                <p className="font-bold">No prompts match your search.</p>
                                                <button onClick={() => setSearch('')} className="mt-2 text-primary-600 text-sm font-black hover:underline underline-offset-4">
                                                    Clear filter
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <ConfirmDialog
                    show={deleteConfirm !== null}
                    title="Delete Prompt"
                    message="Delete this Prompt? This action cannot be undone."
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}

'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Copy,
  Check,
  Tag,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';

interface PromptItem {
  id: string;
  title: string;
  category: string;
  promptText: string;
  aspectRatio: string;
  usesCount: number;
}

const mockPrompts: PromptItem[] = [
  {
    id: 'pr-1',
    title: 'Cyberpunk Solopreneur Workspace',
    category: 'Aesthetic / Tech',
    promptText: 'Ultra-detailed cinematic 3D render of a futuristic glass desk overlooking neon skyline, holographic floating analytics charts, ambient violet lighting, 8k octane render.',
    aspectRatio: '9:16',
    usesCount: 412,
  },
  {
    id: 'pr-2',
    title: 'Minimalist SaaS Founder Portrait',
    category: 'Executive / Editorial',
    promptText: 'Hyper-realistic studio editorial photograph of a startup founder in dark cashmere turtleneck, high-contrast studio lighting, neutral warm background, Hasselblad 100mm lens.',
    aspectRatio: '1:1',
    usesCount: 890,
  },
];

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>(mockPrompts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tech / Minimalist');
  const [promptText, setPromptText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptText) return;

    const newPrompt: PromptItem = {
      id: `pr-${Date.now()}`,
      title,
      category,
      promptText,
      aspectRatio: '9:16',
      usesCount: 0,
    };

    setPrompts([newPrompt, ...prompts]);
    setTitle('');
    setPromptText('');
    setIsModalOpen(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-black text-slate-900">Viral Image & Midjourney Prompts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Curate and manage prompt templates available to users for generating viral thumbnails and carousel slides.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 shadow-md shrink-0"
        >
          <Plus size={16} /> New Prompt
        </button>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {prompts.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1">{p.title}</h3>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {p.aspectRatio}
                </span>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 font-mono leading-relaxed border border-slate-100">
                "{p.promptText}"
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>{p.usesCount} creator uses</span>
              <button
                onClick={() => handleCopy(p.id, p.promptText)}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800"
              >
                {copiedId === p.id ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId === p.id ? 'Copied' : 'Copy Prompt'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-slate-900">Add Viral Image Prompt</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prompt Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cyberpunk Office Desk"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Midjourney / FLUX Prompt Text</label>
                <textarea
                  required
                  rows={4}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Detailed prompt text..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-md"
                >
                  Save Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

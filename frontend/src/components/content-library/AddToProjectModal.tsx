'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Folder, Plus, Check } from 'lucide-react';
import { getProjects, createProject, addPostToProject } from '@/lib/api/contentLibraryService';
import type { ContentPostItem, ProjectItem } from '@/types/contentLibrary';

interface AddToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: ContentPostItem | null;
  onSuccess?: () => void;
}

export default function AddToProjectModal({
  isOpen,
  onClose,
  post,
  onSuccess,
}: AddToProjectModalProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    getProjects()
      .then((items) => {
        if (active) {
          setProjects(items);
          if (items.length > 0) {
            setSelectedProjectId(items[0].id);
          }
          setError(null);
          setSuccessMessage(null);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    setError(null);
    setSaving(true);

    try {
      let targetProjectId = selectedProjectId;

      if (isCreatingNew) {
        if (!newProjectName.trim()) {
          setError('Please provide a project name.');
          setSaving(false);
          return;
        }
        const created = await createProject(newProjectName.trim());
        targetProjectId = created.id;
      }

      if (!targetProjectId) {
        setError('Please select or create a project.');
        setSaving(false);
        return;
      }

      await addPostToProject(targetProjectId, post.id);
      setSuccessMessage('Post saved to project board!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add post to project.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save to Project Board">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs font-bold text-slate-400">Loading project boards...</div>
        ) : (
          <>
            {!isCreatingNew ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Select Project Collection
                </label>

                {projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">You don&apos;t have any project boards yet.</p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"
                    >
                      <Plus size={14} /> Create your first board
                    </button>
                  </div>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {projects.map((proj) => (
                      <label
                        key={proj.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedProjectId === proj.id
                            ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="project"
                            checked={selectedProjectId === proj.id}
                            onChange={() => setSelectedProjectId(proj.id)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <Folder size={16} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-800">{proj.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {proj.posts_count} {proj.posts_count === 1 ? 'post' : 'posts'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline pt-1"
                  >
                    <Plus size={14} /> Create new board instead
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">New Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q4 Viral Hook Ideas"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 focus:border-primary-500 focus:outline-hidden"
                />

                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    ← Select existing board
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Video'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

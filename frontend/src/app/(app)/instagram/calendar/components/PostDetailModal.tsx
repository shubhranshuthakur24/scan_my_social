import { useState } from 'react';
import type { ComponentType } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  Trash2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  AlertTriangle,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';
import { ScheduledPost, PostStatus } from '../types';

interface PostDetailModalProps {
  post: ScheduledPost | null;
  onClose: () => void;
  onDeletePost: (id: string) => void | Promise<void>;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const STATUS_CONFIG: Record<PostStatus, StatusConfig> = {
  published: {
    label: 'Published',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2,
  },
  publishing: {
    label: 'Publishing',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: LoaderCircle,
  },
  scheduled: {
    label: 'Scheduled',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    Icon: Clock3,
  },
  failed: {
    label: 'Failed',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    Icon: AlertTriangle,
  },
};

function PostMediaPreview({ post }: { post: ScheduledPost }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative flex aspect-[4/5] w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      {post.thumbnail && !hasError ? (
        <img
          src={post.thumbnail}
          alt={post.title || 'Post thumbnail'}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
          <ImageIcon size={24} />
          <span className="text-[9px] font-bold uppercase tracking-wider">
            No Media
          </span>
        </div>
      )}

      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
        {post.type}
      </span>
    </div>
  );
}

export function PostDetailModal({
  post,
  onClose,
  onDeletePost,
}: PostDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!post) return null;

  const statusInfo = STATUS_CONFIG[post.status];
  const StatusIcon = statusInfo.Icon;

  const handleClose = () => {
    setIsConfirmingDelete(false);
    onClose();
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeletePost(post.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(post)}
      onClose={handleClose}
      title={isConfirmingDelete ? 'Delete Post?' : 'Instagram Post Details'}
      description={
        isConfirmingDelete
          ? 'Are you sure you want to delete this scheduled post? This action cannot be undone.'
          : 'View media, caption, scheduling details, and delivery status.'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {isConfirmingDelete ? (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={isDeleting}
                disabled={isDeleting}
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete Post
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Close
              </Button>
            </>
          )}
        </div>
      }
    >
      {!isConfirmingDelete ? (
        <div className="space-y-4">
          <div className="flex gap-4">
            {/* Isolated Media Preview */}
            <PostMediaPreview post={post} />

            {/* Information */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase border ${statusInfo.badgeClass}`}
                >
                  <StatusIcon size={11} className={post.status === 'publishing' ? 'animate-spin' : ''} />
                  {statusInfo.label}
                </span>

                <span className="text-xs font-bold text-slate-500">
                  {post.date} at {post.time}
                </span>
              </div>

              <h4 className="text-sm font-black text-slate-900 leading-snug">{post.title}</h4>

              {post.hasAutodm && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <Zap size={13} className="text-emerald-600 fill-emerald-600" />
                  <span>AutoDM Keyword: <strong>{post.autodmKeyword}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Post Caption</p>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {post.caption || 'No caption provided.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 text-xs font-medium space-y-1">
          <p className="font-bold text-rose-800">Warning: Permanent Action</p>
          <p>
            Deleting post <strong>&quot;{post.title}&quot;</strong> will cancel its dispatch and remove it from your Instagram content calendar.
          </p>

        </div>
      )}
    </Modal>
  );
}

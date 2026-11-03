'use client';

import React from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ShortLink } from '@/lib/api/linkShortService';

interface LinkShortDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  shortLink: ShortLink | null;
  isDeleting: boolean;
}

export default function LinkShortDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  shortLink,
  isDeleting,
}: LinkShortDeleteDialogProps) {
  if (!shortLink) return null;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Short Link?"
      description={`This will permanently delete "${shortLink.title}" (/s/${shortLink.code}) and all of its click tracking telemetry. This action cannot be undone.`}
      confirmText={isDeleting ? 'Deleting...' : 'Delete Short Link'}
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
  );
}

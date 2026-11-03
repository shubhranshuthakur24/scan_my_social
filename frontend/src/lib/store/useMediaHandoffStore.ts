import { create } from 'zustand';

export interface MediaHandoffState {
  pendingFile: File | null;
  targetFormat: 'reel' | 'story' | 'image' | 'carousel';
  sourceTool: 'watermark-remover' | null;
  setPendingFile: (file: File, format?: 'reel' | 'story' | 'image' | 'carousel') => void;
  clearPendingFile: () => void;
}

export const useMediaHandoffStore = create<MediaHandoffState>((set) => ({
  pendingFile: null,
  targetFormat: 'reel',
  sourceTool: null,
  setPendingFile: (file, format = 'reel') =>
    set({ pendingFile: file, targetFormat: format, sourceTool: 'watermark-remover' }),
  clearPendingFile: () =>
    set({ pendingFile: null, targetFormat: 'reel', sourceTool: null }),
}));

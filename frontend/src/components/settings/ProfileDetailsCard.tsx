'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { updateUserProfile, uploadUserAvatar, removeUserAvatar, getUserSettings } from '@/lib/api/authService';
import { User, Camera, Sparkles, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import BioImageCropModal from '@/components/social-bio-links/BioImageCropModal';

interface ProfileDetailsCardProps {
  onToast: (msg: string) => void;
}

export default function ProfileDetailsCard({ onToast }: ProfileDetailsCardProps) {
  const { user, updateUser } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [initialValues, setInitialValues] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Fetch latest user details on mount to guarantee fresh name, email, bio
  useEffect(() => {
    let isMounted = true;
    getUserSettings()
      .then((data) => {
        if (!isMounted) return;
        if (data.user) {
          const sName = data.user.name || '';
          const sEmail = data.user.email || '';
          const sBio = data.user.bio || '';
          if (!hasUserEdited) {
            setFullName(sName);
            setEmail(sEmail);
            setBio(sBio);
            setInitialValues({
              name: sName,
              email: sEmail,
              bio: sBio,
            });
          }
          if (data.user.avatar) {
            setAvatarUrl(data.user.avatar);
          }
          updateUser(data.user);
        }
      })
      .catch(() => {
        // Silently retain auth store user data if settings API is offline
      });

    return () => {
      isMounted = false;
    };
  }, [hasUserEdited, updateUser]);

  // Determine if fields have been modified compared to original/saved values
  const isChanged =
    fullName !== initialValues.name ||
    email !== initialValues.email ||
    bio !== initialValues.bio;

  const isValid = fullName.trim().length > 0 && email.trim().length > 0;
  const isSaveActive = isChanged && isValid && !isSubmittingProfile;

  // Image Cropping Modal State (Avatar 1:1 circular)
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageUrl: null,
    fileName: 'avatar.jpg',
  });

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('Please upload an image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onToast('Avatar file size must be under 10MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropModalState({
      isOpen: true,
      imageUrl: objectUrl,
      fileName: file.name,
    });

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setIsUploadingAvatar(true);
    try {
      const res = await uploadUserAvatar(croppedFile);
      if (res.avatar_url) {
        setAvatarUrl(res.avatar_url);
        updateUser({ avatar: res.avatar_url });
        onToast('Profile avatar updated successfully!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar.';
      onToast(msg);
    } finally {
      setIsUploadingAvatar(false);
      handleCloseCropModal();
    }
  };

  const handleCloseCropModal = () => {
    if (cropModalState.imageUrl) {
      URL.revokeObjectURL(cropModalState.imageUrl);
    }
    setCropModalState((prev) => ({ ...prev, isOpen: false, imageUrl: null }));
  };

  const handleRemoveAvatarClick = async () => {
    setIsUploadingAvatar(true);
    try {
      await removeUserAvatar();
      setAvatarUrl('');
      updateUser({ avatar: '' });
      onToast('Avatar removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove avatar.';
      onToast(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSaveActive) {
      return;
    }
    setProfileError('');
    setIsSubmittingProfile(true);

    try {
      const res = await updateUserProfile({
        name: fullName.trim(),
        email: email.trim(),
        bio,
      });
      if (res.user) {
        updateUser(res.user);
      }
      setInitialValues({
        name: fullName.trim(),
        email: email.trim(),
        bio,
      });
      setHasUserEdited(false);
      setSavedProfile(true);
      onToast('Profile details updated successfully!');
      setTimeout(() => setSavedProfile(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-primary-600">
          <User size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Profile & Account Details</h3>
          <p className="text-xs text-slate-500">Update your personal information and profile picture</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-slate-400" />
            )}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                <RefreshCw size={18} className="animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/*"
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                icon={<Camera size={14} />}
              >
                Change Avatar
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatarClick}
                  disabled={isUploadingAvatar}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  icon={<Trash2 size={14} />}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">JPG, PNG or GIF. Max size 2MB.</p>
          </div>
        </div>

        {profileError && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
            {profileError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="Your Full Name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setHasUserEdited(true);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Bio / Organization</label>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setHasUserEdited(true);
            }}
            rows={3}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            placeholder="Tell us about your brand, agency, or content creation goals..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isSaveActive}
            variant={isSaveActive ? 'primary' : 'secondary'}
            className={
              savedProfile
                ? '!bg-emerald-50 !text-emerald-700 !border-emerald-200 !shadow-none !cursor-default disabled:!opacity-100'
                : !isSaveActive
                ? '!bg-slate-200 !text-slate-400 !border-slate-200 !shadow-none !cursor-not-allowed hover:!bg-slate-200 hover:!text-slate-400 hover:!translate-y-0 active:!scale-100 disabled:!opacity-100'
                : ''
            }
            icon={savedProfile ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Sparkles size={16} />}
          >
            {isSubmittingProfile ? 'Saving Changes...' : savedProfile ? 'Saved!' : 'Save Profile Changes'}
          </Button>
        </div>
      </form>

      {/* Avatar Image Crop Modal */}
      <BioImageCropModal
        isOpen={cropModalState.isOpen}
        onClose={handleCloseCropModal}
        imageUrl={cropModalState.imageUrl}
        fileName={cropModalState.fileName}
        type="avatar"
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

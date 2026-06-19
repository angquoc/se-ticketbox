import { useState, useEffect } from 'react';
import { getStoredUser, updateProfile } from '@/services/authService';

export interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  organizationName: string;
  organizationWebsite: string;
}

const DEFAULT_PROFILE: ProfileForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'ORGANIZER',
  organizationName: 'TicketBox Events',
  organizationWebsite: 'https://ticketbox.vn',
};

export function useSettingsForm() {
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // Load profile từ localStorage (user object được lưu khi login)
  const [profile, setProfile] = useState<ProfileForm>(DEFAULT_PROFILE);
  const [draft, setDraft] = useState<ProfileForm>(DEFAULT_PROFILE);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const loaded: ProfileForm = {
        fullName: stored.fullName || '',
        email: stored.email || '',
        phone: '',         // chưa có trong JWT payload
        role: stored.role || 'ORGANIZER',
        organizationName: 'TicketBox Events',
        organizationWebsite: 'https://ticketbox.vn',
      };
      setProfile(loaded);
      setDraft(loaded);
    }
  }, []);

  const [notifications, setNotifications] = useState({
    newOrder: true,
    paymentFailed: true,
    uploadComplete: true,
    checkinAnomaly: false,
    weeklyReport: true,
  });

  const handleEditToggle = () => {
    if (!editing) {
      setDraft({ ...profile });
      setEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      // Gọi API updateProfile — cập nhật localStorage + thử PATCH /auth/profile
      await updateProfile({
        fullName: draft.fullName || undefined,
        phone: draft.phone || undefined,
      });
      setProfile({ ...draft });
      setSavedProfile(true);
      setEditing(false);
      setTimeout(() => setSavedProfile(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft({ ...profile });
    setEditing(false);
  };

  const updateDraft = (field: keyof ProfileForm) => (val: string) => {
    setDraft((prev) => ({ ...prev, [field]: val }));
  };

  return {
    editing,
    showPasswordModal,
    setShowPasswordModal,
    savingProfile,
    savedProfile,
    profile,
    draft,
    notifications,
    setNotifications,
    handleEditToggle,
    handleSaveProfile,
    handleCancelEdit,
    updateDraft,
  };
}

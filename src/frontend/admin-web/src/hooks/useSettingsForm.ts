import { useState } from 'react';

export interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  organizationName: string;
  organizationWebsite: string;
}

export function useSettingsForm() {
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  const [profile, setProfile] = useState<ProfileForm>({
    fullName: 'Admin User',
    email: 'admin@ticketbox.vn',
    phone: '+84 90 000 0000',
    role: 'ORGANIZER',
    organizationName: 'TicketBox Events',
    organizationWebsite: 'https://ticketbox.vn',
  });
  const [draft, setDraft] = useState<ProfileForm>(profile);

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
      await new Promise((r) => setTimeout(r, 800)); // TODO: call API
      setProfile({ ...draft });
      setSavedProfile(true);
      setEditing(false);
      setTimeout(() => setSavedProfile(false), 2500);
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

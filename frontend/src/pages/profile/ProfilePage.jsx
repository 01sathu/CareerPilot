import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import {
  User,
  Key,
  Bell,
  Download,
  Trash2,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  FileSpreadsheet,
  History,
  AlertTriangle,
  Clock,
  Briefcase,
  MapPin
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Active Settings Tab (FR-115)
  const [activeTab, setActiveTab] = useState('profile');

  // 1. Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    headline: user?.headline || '',
    experienceLevel: user?.experienceLevel || 'fresher',
    openToRemote: user?.openToRemote || false,
    skills: user?.skills || [],
    targetRoles: user?.targetRoles || [],
    preferredLocations: user?.preferredLocations || []
  });

  const [skillInput, setSkillInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // 2. Account & Timezone State
  const [accountData, setAccountData] = useState({
    timezone: user?.timezone || 'UTC'
  });
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Password State (FR-116)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 3. Notification Preferences State (FR-111)
  const [notifications, setNotifications] = useState({
    interview_reminder: user?.notificationPreferences?.interview_reminder ?? true,
    follow_up_reminder: user?.notificationPreferences?.follow_up_reminder ?? true,
    application_status_changed: user?.notificationPreferences?.application_status_changed ?? true
  });
  const [isUpdatingNotifs, setIsUpdatingNotifs] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');

  // 4. Data Export State (FR-117, FR-118, FR-119)
  const [isExportingApps, setIsExportingApps] = useState(false);
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [exportError, setExportError] = useState('');

  // 5. Delete Account State (FR-121, FR-122, FR-123)
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmation: ''
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ---------------- Handlers ----------------

  // Profile Handlers
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (profileSuccess) setProfileSuccess('');
    if (profileError) setProfileError('');
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !profileData.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      if (profileData.skills.length >= 50) return;
      setProfileData((prev) => ({ ...prev, skills: [...prev.skills, clean] }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  };

  const handleAddRole = (e) => {
    e.preventDefault();
    const clean = roleInput.trim();
    if (clean && profileData.targetRoles.length < 10) {
      setProfileData((prev) => ({ ...prev, targetRoles: [...prev.targetRoles, clean] }));
      setRoleInput('');
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.filter((r) => r !== roleToRemove)
    }));
  };

  const handleAddLocation = (e) => {
    e.preventDefault();
    const clean = locationInput.trim();
    if (clean && profileData.preferredLocations.length < 10) {
      setProfileData((prev) => ({ ...prev, preferredLocations: [...prev.preferredLocations, clean] }));
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (locToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((l) => l !== locToRemove)
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      await updateProfile(profileData);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Account & Timezone Handler
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setIsUpdatingAccount(true);
    setAccountSuccess('');
    setAccountError('');

    try {
      await updateProfile({ timezone: accountData.timezone });
      setAccountSuccess('Account preferences saved.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update account preferences.';
      setAccountError(msg);
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  // Password Handler (FR-116)
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.newPasswordConfirmation) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess('Password changed successfully. All other sessions have been revoked.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirmation: ''
      });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to change password.';
      setPasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Notification Preferences Handler (FR-111)
  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setIsUpdatingNotifs(true);
    setNotifSuccess('');
    setNotifError('');

    try {
      await updateProfile({ notificationPreferences: notifications });
      setNotifSuccess('Notification preferences saved.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to update notification preferences.';
      setNotifError(msg);
    } finally {
      setIsUpdatingNotifs(false);
    }
  };

  // CSV Export Handlers (FR-117, FR-118, FR-119)
  const triggerCsvDownload = async (url, fallbackFilename, setExporting) => {
    setExporting(true);
    setExportError('');

    try {
      const response = await api.get(url, {
        responseType: 'blob'
      });

      // Extract filename from header if present
      const disposition = response.headers['content-disposition'];
      let filename = fallbackFilename;
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) filename = matches[1];
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setExportError('Failed to generate CSV export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportApplications = () => {
    const today = new Date().toISOString().slice(0, 10);
    triggerCsvDownload('/applications/export/csv', `careerpilot-applications-${today}.csv`, setIsExportingApps);
  };

  const handleExportHistory = () => {
    const today = new Date().toISOString().slice(0, 10);
    triggerCsvDownload('/applications/export/history-csv', `careerpilot-history-${today}.csv`, setIsExportingHistory);
  };

  // Account Deletion Handler (FR-121, FR-122, FR-123)
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteData.confirmation !== 'DELETE') {
      setDeleteError('You must type the exact word "DELETE" to confirm.');
      return;
    }

    if (!window.confirm('Are you absolutely sure? This will permanently erase your account, resumes, and applications. This action CANNOT be undone.')) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      await deleteAccount(deleteData.password, deleteData.confirmation);
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to delete account. Please verify your password.';
      setDeleteError(msg);
      setIsDeletingAccount(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account & Security', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'danger', label: 'Danger Zone', icon: Trash2, danger: true }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings & Profile</h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your personal information, security, notifications, and data ownership.
            </p>
          </div>
          <Link
            to="/privacy"
            className="inline-flex items-center space-x-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>View Privacy Notice (FR-124)</span>
          </Link>
        </div>

        {/* Tab Navigation (FR-115) */}
        <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 mb-8 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-3 sm:px-4 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? tab.danger
                      ? 'border-rose-500 text-rose-400'
                      : 'border-brand-500 text-brand-400'
                    : tab.danger
                    ? 'border-transparent text-slate-400 hover:text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-400" />
              <span>Public Profile Details</span>
            </h2>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
                  <select
                    name="experienceLevel"
                    value={profileData.experienceLevel}
                    onChange={handleProfileChange}
                    className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="fresher">Fresher / Entry Level (0-1 yrs)</option>
                    <option value="junior">Junior (1-3 yrs)</option>
                    <option value="mid">Mid-Level (3-5 yrs)</option>
                    <option value="senior">Senior (5-8 yrs)</option>
                    <option value="lead">Lead / Principal (8+ yrs)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Professional Headline</label>
                <input
                  type="text"
                  name="headline"
                  placeholder="e.g. Full Stack Engineer | React & Node.js Enthusiast"
                  value={profileData.headline}
                  onChange={handleProfileChange}
                  maxLength={120}
                  className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              {/* Target Roles */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Roles ({profileData.targetRoles.length}/10)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profileData.targetRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center space-x-1 bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs px-2.5 py-1 rounded-lg"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(role)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRole(e)}
                    placeholder="Add target role (e.g. Software Engineer)..."
                    className="flex-1 bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-xl border border-slate-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Preferred Locations */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Preferred Locations ({profileData.preferredLocations.length}/10)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profileData.preferredLocations.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center space-x-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg"
                    >
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{loc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(loc)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLocation(e)}
                    placeholder="Add preferred location (e.g. New York, Remote)..."
                    className="flex-1 bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-xl border border-slate-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Skills ({profileData.skills.length}/50)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-36 overflow-y-auto">
                  {profileData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center space-x-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-lg"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(e)}
                    placeholder="Add a skill (e.g. React, TypeScript, Docker)..."
                    className="flex-1 bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-xl border border-slate-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Remote Toggle */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="openToRemote"
                  name="openToRemote"
                  checked={profileData.openToRemote}
                  onChange={handleProfileChange}
                  className="rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
                />
                <label htmlFor="openToRemote" className="text-xs text-slate-300 cursor-pointer">
                  Open to Remote roles
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 px-5 rounded-xl text-xs transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isUpdatingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Account & Security */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Timezone Preference */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
              <h2 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>Time Zone Preference (FR-022, FR-102)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Interview calendar events and reminder notifications are automatically aligned to your local time zone.
              </p>

              {accountSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{accountSuccess}</span>
                </div>
              )}

              {accountError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{accountError}</span>
                </div>
              )}

              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Time Zone (IANA Name)</label>
                  <input
                    type="text"
                    value={accountData.timezone}
                    onChange={(e) => setAccountData({ timezone: e.target.value })}
                    placeholder="e.g. America/New_York, Asia/Kolkata, UTC"
                    className="w-full sm:w-80 bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingAccount}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-5 rounded-xl text-xs border border-slate-700 transition disabled:opacity-50"
                >
                  {isUpdatingAccount ? 'Saving...' : 'Save Time Zone'}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
              <h2 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
                <Key className="w-4 h-4 text-brand-400" />
                <span>Change Password (FR-116)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Changing your password revokes all active refresh tokens on other devices for security.
              </p>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Min 8 chars, 1 uppercase, 1 lowercase, 1 digit</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPasswordConfirmation}
                      onChange={(e) => setPasswordData({ ...passwordData, newPasswordConfirmation: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-5 rounded-xl text-xs border border-slate-700 transition disabled:opacity-50"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-brand-400" />
              <span>In-App Notification Preferences (FR-111)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Configure which events generate in-app alerts and notifications in your notification feed.
            </p>

            {notifSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{notifSuccess}</span>
              </div>
            )}

            {notifError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{notifError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNotifications} className="space-y-4">
              <div className="divide-y divide-slate-800">
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Interview Reminders</div>
                    <div className="text-xs text-slate-400">
                      Notifications generated before scheduled interview sessions (15m, 1h, 1d, 2d).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.interview_reminder}
                    onChange={(e) => setNotifications({ ...notifications, interview_reminder: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Follow-Up Reminders</div>
                    <div className="text-xs text-slate-400">
                      Reminders delivered at 09:00 local time on application follow-up dates.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.follow_up_reminder}
                    onChange={(e) => setNotifications({ ...notifications, follow_up_reminder: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
                  />
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">Application Status Changes</div>
                    <div className="text-xs text-slate-400">
                      Notifications when an application transitions through hiring stages.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.application_status_changed}
                    onChange={(e) => setNotifications({ ...notifications, application_status_changed: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingNotifs}
                  className="bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 px-5 rounded-xl text-xs transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isUpdatingNotifs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Data Export */}
        {activeTab === 'export' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
              <Download className="w-4 h-4 text-brand-400" />
              <span>Data Export (FR-117, FR-118, FR-119)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Export your CareerPilot records to RFC 4180 compliant CSV files with spreadsheet formula injection protection.
            </p>

            {exportError && (
              <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Applications Card */}
              <div className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-brand-400" />
                    <h3 className="text-sm font-semibold text-white">Job Applications CSV (FR-117)</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Download all your applications including company name, job title, location, status, compensation, dates, URLs, and notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportApplications}
                  disabled={isExportingApps}
                  className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isExportingApps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Applications CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Applications CSV</span>
                    </>
                  )}
                </button>
              </div>

              {/* Export History Card */}
              <div className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2.5 mb-2">
                    <History className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Status History CSV (FR-118)</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Download complete historical stage transition events, timestamps, from/to status values, and transition notes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportHistory}
                  disabled={isExportingHistory}
                  className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition disabled:opacity-50"
                >
                  {isExportingHistory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating History CSV...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Status History CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-800/20 border border-slate-800 rounded-xl text-[11px] text-slate-500">
              Note: All CSV files are generated with a UTF-8 BOM (\uFEFF) to ensure special characters and symbols render correctly across Excel, Google Sheets, and Apple Numbers. Cells containing formula triggers are neutralized per FR-119.
            </div>
          </div>
        )}

        {/* Tab 5: Danger Zone (Delete Account) */}
        {activeTab === 'danger' && (
          <div className="bg-rose-950/10 border border-rose-900/40 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-rose-400">Delete Account & Permanent Erasure</h2>
                <p className="text-xs text-slate-400">SRS FR-121, FR-122, FR-123 Compliance</p>
              </div>
            </div>

            <div className="p-4 bg-rose-950/20 border border-rose-800/30 rounded-xl text-xs text-rose-200/90 leading-relaxed mb-6 space-y-2">
              <p className="font-semibold text-rose-200">
                Warning: This action is permanent and completely irreversible.
              </p>
              <p>
                Deleting your account will immediately and permanently erase:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-rose-300">
                <li>Your profile and login credentials</li>
                <li>All tracked job applications and activity timelines</li>
                <li>All uploaded resume PDF files and extracted analyses</li>
                <li>All scheduled interviews and calendar events</li>
                <li>All AI mock interview prep sessions and evaluation scores</li>
                <li>All notifications and system records</li>
              </ul>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. Enter your current password:
                </label>
                <input
                  type="password"
                  required
                  value={deleteData.password}
                  onChange={(e) => setDeleteData({ ...deleteData, password: e.target.value })}
                  placeholder="Your current password"
                  className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2. Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={deleteData.confirmation}
                  onChange={(e) => setDeleteData({ ...deleteData, confirmation: e.target.value })}
                  placeholder="Type DELETE"
                  className="w-full bg-slate-950/80 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDeletingAccount || deleteData.confirmation !== 'DELETE' || !deleteData.password}
                  className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 px-6 rounded-xl text-xs transition shadow-lg shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeletingAccount ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Account & Cascading Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete My Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

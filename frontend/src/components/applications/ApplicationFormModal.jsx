import React, { useState, useEffect } from 'react';
import { X, Building2, Briefcase, MapPin, DollarSign, Calendar, Link as LinkIcon, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { ALL_STATUSES, STATUS_CONFIG } from '../../utils/statusColors';

export default function ApplicationFormModal({
  isOpen,
  initialData = null,
  onClose,
  onSubmit
}) {
  const isEditing = !!initialData?._id;

  const [formData, setFormData] = useState({
    companyName: '',
    jobTitle: '',
    location: '',
    status: 'wishlist',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'USD',
    salaryPeriod: 'yearly',
    applicationUrl: '',
    appliedDate: '',
    followUpDate: '',
    deadlineDate: '',
    notes: '',
    jobDescription: '',
    statusNote: ''
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to format ISO date to YYYY-MM-DD for date inputs
  const formatDateForInput = (isoDate) => {
    if (!isoDate) return '';
    try {
      return new Date(isoDate).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        jobTitle: initialData.jobTitle || '',
        location: initialData.location || '',
        status: initialData.status || 'wishlist',
        salaryMin: initialData.salary?.min !== null && initialData.salary?.min !== undefined ? String(initialData.salary.min) : '',
        salaryMax: initialData.salary?.max !== null && initialData.salary?.max !== undefined ? String(initialData.salary.max) : '',
        salaryCurrency: initialData.salary?.currency || 'USD',
        salaryPeriod: initialData.salary?.period || 'yearly',
        applicationUrl: initialData.applicationUrl || '',
        appliedDate: formatDateForInput(initialData.appliedDate),
        followUpDate: formatDateForInput(initialData.followUpDate),
        deadlineDate: formatDateForInput(initialData.deadlineDate),
        notes: initialData.notes || '',
        jobDescription: initialData.jobDescription || '',
        statusNote: ''
      });
    } else {
      setFormData({
        companyName: '',
        jobTitle: '',
        location: '',
        status: 'wishlist',
        salaryMin: '',
        salaryMax: '',
        salaryCurrency: 'USD',
        salaryPeriod: 'yearly',
        applicationUrl: '',
        appliedDate: '',
        followUpDate: '',
        deadlineDate: '',
        notes: '',
        jobDescription: '',
        statusNote: ''
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!formData.jobTitle.trim()) {
      setError('Job title is required.');
      return;
    }

    const min = formData.salaryMin !== '' ? Number(formData.salaryMin) : null;
    const max = formData.salaryMax !== '' ? Number(formData.salaryMax) : null;

    if (min !== null && max !== null && min > max) {
      setError('Minimum salary cannot exceed maximum salary.');
      return;
    }

    const payload = {
      companyName: formData.companyName.trim(),
      jobTitle: formData.jobTitle.trim(),
      location: formData.location.trim(),
      status: formData.status,
      applicationUrl: formData.applicationUrl.trim(),
      notes: formData.notes,
      jobDescription: formData.jobDescription,
      salary: {
        min,
        max,
        currency: formData.salaryCurrency.toUpperCase(),
        period: formData.salaryPeriod
      },
      appliedDate: formData.appliedDate ? new Date(formData.appliedDate).toISOString() : null,
      followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : null,
      deadlineDate: formData.deadlineDate ? new Date(formData.deadlineDate).toISOString() : null
    };

    if (isEditing && formData.status !== initialData.status && formData.statusNote) {
      payload.statusNote = formData.statusNote.trim();
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isEditing ? 'Edit Job Application' : 'Add New Application'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing ? 'Update details or record status transitions' : 'Track an active or potential opportunity'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 py-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Company & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  name="companyName"
                  required
                  maxLength={120}
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Google, Stripe"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Job Title <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  name="jobTitle"
                  required
                  maxLength={120}
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  name="location"
                  maxLength={120}
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Remote, San Francisco, CA"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Application Status (FR-026)
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 capitalize"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Note (when editing and status changed) */}
          {isEditing && formData.status !== initialData?.status && (
            <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl">
              <label className="block text-xs font-medium text-brand-300 mb-1">
                Status Change Note (FR-041)
              </label>
              <input
                type="text"
                name="statusNote"
                maxLength={500}
                value={formData.statusNote}
                onChange={handleChange}
                placeholder="Reason or update for this status change (e.g. Phone screen passed)"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Salary Grid (FR-025) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Compensation Details
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="number"
                name="salaryMin"
                min="0"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="Min (e.g. 90000)"
                className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <input
                type="number"
                name="salaryMax"
                min="0"
                value={formData.salaryMax}
                onChange={handleChange}
                placeholder="Max (e.g. 130000)"
                className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <select
                name="salaryCurrency"
                value={formData.salaryCurrency}
                onChange={handleChange}
                className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
              <select
                name="salaryPeriod"
                value={formData.salaryPeriod}
                onChange={handleChange}
                className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 capitalize"
              >
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>

          {/* Important Dates (FR-030) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Applied Date
              </label>
              <input
                type="date"
                name="appliedDate"
                value={formData.appliedDate}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Deadline Date
              </label>
              <input
                type="date"
                name="deadlineDate"
                value={formData.deadlineDate}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Application URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Job Post / Application Link
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="url"
                name="applicationUrl"
                maxLength={2048}
                value={formData.applicationUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {/* Notes (FR-031: Plain text) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Personal Notes ({formData.notes.length}/5000)
            </label>
            <textarea
              name="notes"
              rows={2}
              maxLength={5000}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Referral contact, recruiters notes, questions for the team..."
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          {/* Job Description (FR-025) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Job Description ({formData.jobDescription.length}/10000)
            </label>
            <textarea
              name="jobDescription"
              rows={3}
              maxLength={10000}
              value={formData.jobDescription}
              onChange={handleChange}
              placeholder="Paste job description (used in Phase 5 for AI resume match)..."
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Save Changes' : 'Create Application'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

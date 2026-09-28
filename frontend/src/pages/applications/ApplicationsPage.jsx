import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../../components/layout/Navbar';
import StatusBadge from '../../components/applications/StatusBadge';
import ApplicationFormModal from '../../components/applications/ApplicationFormModal';
import ApplicationDetailModal from '../../components/applications/ApplicationDetailModal';
import KanbanBoard from '../../components/applications/kanban/KanbanBoard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { 
  getApplications, 
  getApplication, 
  createApplication, 
  updateApplication, 
  deleteApplication 
} from '../../services/application.service';
import { ALL_STATUSES, STATUS_CONFIG } from '../../utils/statusColors';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Building2, 
  Calendar, 
  MoreHorizontal, 
  ExternalLink, 
  Eye, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Inbox, 
  ChevronLeft, 
  ChevronRight,
  X,
  List,
  LayoutGrid
} from 'lucide-react';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // View Mode: 'table' | 'kanban' (FR-039: remembered per browser)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('careerpilot_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('careerpilot_view_mode', mode);
    } catch {
      // Ignore storage errors
    }
    setPage(1);
  };

  // Search & Filter State (FR-039: shared between Table and Kanban views)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input by 300ms (FR-033)
  const debounceTimerRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  };

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        // In Kanban view, fetch up to 100 applications so all columns populate (FR-128 max limit)
        limit: viewMode === 'kanban' ? 100 : 20,
        sortBy,
        sortOrder
      };
      if (debouncedSearch && debouncedSearch.trim().length >= 2) {
        params.search = debouncedSearch.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (locationFilter.trim()) {
        params.location = locationFilter.trim();
      }

      const res = await getApplications(params);
      setApplications(res.data || []);
      setMeta(res.meta || { page: 1, limit: params.limit, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, locationFilter, sortBy, sortOrder, viewMode]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Open Detail View
  const handleOpenDetail = async (app) => {
    setIsLoadingDetail(true);
    try {
      const data = await getApplication(app._id);
      setDetailData(data);
      setIsDetailOpen(true);
    } catch (err) {
      setError('Failed to load application details: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Create / Edit Submit
  const handleFormSubmit = async (formData) => {
    if (editingApplication) {
      await updateApplication(editingApplication._id, formData);
    } else {
      await createApplication(formData);
    }
    fetchApplications();
  };

  // Handle Status Change with Optimistic UI & Rollback (FR-037, FR-040, AC-B-04)
  const handleStatusChange = async (appId, newStatus, note = '') => {
    const previousApplications = [...applications];

    // Optimistically update UI immediately (FR-037)
    setApplications((prev) =>
      prev.map((app) => (app._id === appId ? { ...app, status: newStatus } : app))
    );

    try {
      await updateApplication(appId, { status: newStatus, statusNote: note });
      // If detail modal is open, refresh detailData
      if (detailData && detailData.application?._id === appId) {
        const refreshed = await getApplication(appId);
        setDetailData(refreshed);
      }
    } catch (err) {
      // Rollback optimistic update on API failure (FR-037, AC-B-04)
      setApplications(previousApplications);
      setError('Failed to move application: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);
    try {
      await deleteApplication(deletingApp._id);
      setIsDeleteOpen(false);
      setDeletingApp(null);
      if (isDetailOpen && detailData?.application?._id === deletingApp._id) {
        setIsDetailOpen(false);
      }
      fetchApplications();
    } catch (err) {
      setError('Failed to delete application: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Header & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
              <span>Job Application Tracker</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {meta.total} {meta.total === 1 ? 'Job' : 'Jobs'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize, filter, and track applications across every stage of your pipeline.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle: Table vs Kanban (FR-039) */}
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 flex items-center">
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === 'table'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
                aria-pressed={viewMode === 'table'}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  viewMode === 'kanban'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Kanban Board View"
                aria-pressed={viewMode === 'kanban'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            </div>

            {/* Add Application CTA */}
            <button
              onClick={() => {
                setEditingApplication(null);
                setIsFormOpen(true);
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-medium px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-brand-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Add Application</span>
            </button>
          </div>
        </div>

        {/* Filter & Control Bar (FR-033 - FR-035, FR-039 shared state) */}
        <div className="py-5 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input (FR-033) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search company, job title, or location..."
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-10 pr-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder-slate-500"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Location Filter */}
            <div className="w-full md:w-48">
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by location..."
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 placeholder-slate-500"
              />
            </div>

            {/* Sort Dropdown (FR-034) */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="updatedAt">Sort: Last Updated</option>
                <option value="appliedDate">Sort: Applied Date</option>
                <option value="createdAt">Sort: Created Date</option>
                <option value="companyName">Sort: Company Name</option>
                <option value="jobTitle">Sort: Job Title</option>
                <option value="status">Sort: Status</option>
              </select>

              <button
                onClick={() => {
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  setPage(1);
                }}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition"
                title={`Toggle sort order (Current: ${sortOrder.toUpperCase()})`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Filter Tabs (FR-035) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-slate-500 mr-1 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Status:</span>
            </span>

            <button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === ''
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Statuses
            </button>

            {ALL_STATUSES.map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(statusFilter === st ? '' : st);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {STATUS_CONFIG[st].label}
              </button>
            ))}
          </div>
        </div>

        {/* Content State Handling */}
        {isLoading ? (
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mb-3" />
            <span className="text-xs font-medium">Loading applications...</span>
          </div>
        ) : error ? (
          <div className="bg-slate-800/40 border border-rose-500/30 rounded-2xl p-8 text-center my-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Notice</h3>
            <p className="text-xs text-slate-300 mb-4">{error}</p>
            <button
              onClick={fetchApplications}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition"
            >
              Retry
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            {debouncedSearch || statusFilter || locationFilter ? (
              <>
                <h3 className="text-sm font-semibold text-white mb-1">No matching applications</h3>
                <p className="text-xs text-slate-400 mb-4">
                  No applications found matching your search or filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                    setStatusFilter('');
                    setLocationFilter('');
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-white mb-1">No applications yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Start your search journey by recording your first job application or wishlist opportunity.
                </p>
                <button
                  onClick={() => {
                    setEditingApplication(null);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-500/25 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Track First Application</span>
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Board View (FR-036 - FR-039) */
          <KanbanBoard
            applications={applications}
            onOpenDetail={handleOpenDetail}
            onEdit={(app) => {
              setEditingApplication(app);
              setIsFormOpen(true);
            }}
            onDelete={(app) => {
              setDeletingApp(app);
              setIsDeleteOpen(true);
            }}
            onStatusChange={handleStatusChange}
          />
        ) : (
          /* Applications Table View (FR-032) */
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Company &amp; Role</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Applied</th>
                    <th className="py-3 px-4">Follow-up</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {applications.map((app) => (
                    <tr
                      key={app._id}
                      className="hover:bg-slate-800/50 transition group"
                    >
                      {/* Company & Role */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs text-brand-400 flex-shrink-0">
                            {app.companyName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenDetail(app)}
                              className="font-semibold text-white hover:text-brand-300 tracking-tight transition text-left"
                            >
                              {app.companyName}
                            </button>
                            <span className="block text-slate-400 text-[11px] truncate max-w-xs">
                              {app.jobTitle}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {app.location || '—'}
                      </td>

                      {/* Status Dropdown (FR-040: Changeable in table view) */}
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app._id, e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 font-medium border focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer ${
                            STATUS_CONFIG[app.status]?.bg || 'bg-slate-800'
                          } ${STATUS_CONFIG[app.status]?.text || 'text-slate-300'} ${
                            STATUS_CONFIG[app.status]?.border || 'border-slate-700'
                          }`}
                        >
                          {ALL_STATUSES.map((st) => (
                            <option
                              key={st}
                              value={st}
                              className="bg-slate-900 text-white"
                            >
                              {STATUS_CONFIG[st].label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {formatDate(app.appliedDate)}
                      </td>

                      {/* Follow-up Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDate(app.followUpDate)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetail(app)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
                            title="View Timeline & Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingApplication(app);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
                            title="Edit Application"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingApp(app);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition"
                            title="Delete Application"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (FR-032) */}
            <div className="py-3 px-4 sm:px-6 bg-slate-800/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                Showing {(meta.page - 1) * meta.limit + 1} to{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} applications
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 font-medium text-white">
                  Page {meta.page} of {meta.totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Form Modal (Create / Edit) */}
      <ApplicationFormModal
        isOpen={isFormOpen}
        initialData={editingApplication}
        onClose={() => {
          setIsFormOpen(false);
          setEditingApplication(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Detail & History Modal */}
      <ApplicationDetailModal
        isOpen={isDetailOpen}
        applicationData={detailData}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailData(null);
        }}
        onEdit={(app) => {
          setIsDetailOpen(false);
          setEditingApplication(app);
          setIsFormOpen(true);
        }}
        onDelete={(app) => {
          setDeletingApp(app);
          setIsDeleteOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Confirm Delete Dialog (FR-029) */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Job Application"
        message={`Are you sure you want to delete ${deletingApp?.companyName} (${deletingApp?.jobTitle})? This will permanently delete the application and its entire status history timeline.`}
        confirmText="Delete Application"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteOpen(false);
          setDeletingApp(null);
        }}
      />
    </div>
  );
}

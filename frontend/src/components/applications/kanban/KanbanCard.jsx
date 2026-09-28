import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  GripVertical, 
  MoreVertical, 
  Eye, 
  Edit3, 
  Trash2,
  ArrowRight,
  Clock
} from 'lucide-react';
import { ALL_STATUSES, STATUS_CONFIG } from '../../../utils/statusColors';

/**
 * Kanban Card Component (FR-036, FR-037, FR-038)
 * Draggable application card with quick actions and "Move to..." menu alternative
 */
export default function KanbanCard({
  application,
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange,
  isOverlay = false
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: application._id,
    data: { application }
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined
      }
    : undefined;

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const formattedApplied = formatDate(application.appliedDate);
  const formattedFollowUp = formatDate(application.followUpDate);
  const hasSalary = application.salary?.min || application.salary?.max;

  // Available destination statuses for "Move to..." menu (excluding current)
  const destinationStatuses = ALL_STATUSES.filter((st) => st !== application.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-md hover:border-slate-600 transition-all select-none ${
        isDragging ? 'opacity-40 shadow-2xl ring-2 ring-brand-500' : ''
      } ${isOverlay ? 'shadow-2xl ring-2 ring-brand-500 rotate-1 cursor-grabbing bg-slate-800' : ''}`}
    >
      {/* Top Row: Company & Menu */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-slate-500 hover:text-slate-300 transition"
            title="Drag to move card"
            aria-label={`Drag handle for ${application.companyName} application`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs text-white truncate" title={application.companyName}>
            {application.companyName}
          </span>
        </div>

        {/* Action Menu (FR-038: "Move to..." non-drag alternative) */}
        {!isOverlay && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition"
              title="Card actions"
              aria-expanded={isMenuOpen}
              aria-label="Application options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-6 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 text-xs">
                {/* View Details */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDetail(application);
                  }}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Details</span>
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(application);
                  }}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center space-x-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Application</span>
                </button>

                {/* Move to... submenu (FR-038) */}
                <div className="border-t border-slate-800 my-1 pt-1">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Move to...
                  </div>
                  {destinationStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onStatusChange(application._id, st);
                      }}
                      className="w-full text-left px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span className="flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_CONFIG[st].color }}
                        />
                        <span>{STATUS_CONFIG[st].label}</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>

                {/* Delete */}
                <div className="border-t border-slate-800 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(application);
                    }}
                    className="w-full text-left px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Title */}
      <h3
        onClick={() => onOpenDetail(application)}
        className="text-xs font-semibold text-slate-200 hover:text-brand-400 cursor-pointer transition truncate mb-2"
        title={application.jobTitle}
      >
        {application.jobTitle}
      </h3>

      {/* Location */}
      {application.location && (
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-2 truncate">
          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="truncate">{application.location}</span>
        </div>
      )}

      {/* Bottom Metadata Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-700/50 text-[10px]">
        {/* Applied Date (FR-036) */}
        {formattedApplied && (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900/60 text-slate-300 border border-slate-700/60 font-mono">
            <Calendar className="w-2.5 h-2.5 text-brand-400" />
            <span>Applied {formattedApplied}</span>
          </span>
        )}

        {/* Salary */}
        {hasSalary && (
          <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <span>
              {application.salary.min ? `$${(application.salary.min / 1000).toFixed(0)}k` : ''}
              {application.salary.min && application.salary.max ? '–' : ''}
              {application.salary.max ? `$${(application.salary.max / 1000).toFixed(0)}k` : ''}
            </span>
          </span>
        )}

        {/* Follow-up reminder */}
        {formattedFollowUp && (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            <Clock className="w-2.5 h-2.5" />
            <span>Follow-up {formattedFollowUp}</span>
          </span>
        )}
      </div>
    </div>
  );
}

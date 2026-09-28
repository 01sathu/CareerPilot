import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import { STATUS_CONFIG } from '../../../utils/statusColors';
import { Inbox } from 'lucide-react';

/**
 * Kanban Column Component (FR-036, FR-037)
 * Droppable target representing one of the 6 canonical application statuses
 */
export default function KanbanColumn({
  status,
  applications = [],
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status
  });

  const config = STATUS_CONFIG[status] || {
    label: status,
    color: '#94a3b8',
    bgLight: 'bg-slate-800'
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl bg-slate-800/40 border transition-all duration-200 min-h-[500px] w-full ${
        isOver
          ? 'border-brand-500 bg-brand-500/10 shadow-lg ring-2 ring-brand-500/30'
          : 'border-slate-800/80 hover:border-slate-700/60'
      }`}
    >
      {/* Column Header (FR-036) */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between sticky top-0 bg-slate-850/80 backdrop-blur rounded-t-2xl z-10">
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
            style={{ backgroundColor: config.color }}
          />
          <h2 className="text-xs font-bold text-white tracking-wide uppercase">
            {config.label}
          </h2>
        </div>

        {/* Counter Badge (FR-036) */}
        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
          {applications.length}
        </span>
      </div>

      {/* Cards List */}
      <div className="p-2.5 space-y-2.5 flex-1 flex flex-col">
        {applications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800/80 rounded-xl text-center my-2">
            <Inbox className="w-5 h-5 text-slate-600 mb-1.5" />
            <p className="text-[11px] text-slate-500 font-medium">No applications</p>
            <p className="text-[10px] text-slate-600">Drop cards here</p>
          </div>
        ) : (
          applications.map((app) => (
            <KanbanCard
              key={app._id}
              application={app}
              onOpenDetail={onOpenDetail}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

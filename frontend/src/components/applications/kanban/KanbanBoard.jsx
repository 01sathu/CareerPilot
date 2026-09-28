import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { ALL_STATUSES } from '../../../utils/statusColors';

/**
 * Kanban Board Component (FR-036, FR-037, FR-038)
 * Top-level container managing drag-and-drop context, columns, and drag overlay
 */
export default function KanbanBoard({
  applications = [],
  onOpenDetail,
  onEdit,
  onDelete,
  onStatusChange
}) {
  const [activeApp, setActiveApp] = useState(null);

  // Configure drag sensors:
  // 1. PointerSensor with 5px distance constraint to allow click actions without accidental drags
  // 2. KeyboardSensor for full keyboard accessibility (FR-038)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Group applications by canonical status (FR-036)
  const columnsData = ALL_STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const { active } = event;
    const foundApp = applications.find((app) => app._id === active.id);
    if (foundApp) {
      setActiveApp(foundApp);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const appId = active.id;
    const newStatus = over.id; // Target column status ID

    const currentApp = applications.find((app) => app._id === appId);
    if (!currentApp) return;

    // Only trigger status change if moved to a different column
    if (ALL_STATUSES.includes(newStatus) && currentApp.status !== newStatus) {
      onStatusChange(appId, newStatus);
    }
  };

  const handleDragCancel = () => {
    setActiveApp(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* 6-Column Kanban Grid (FR-036) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start w-full overflow-x-auto pb-6">
        {ALL_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            applications={columnsData[status] || []}
            onOpenDetail={onOpenDetail}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* Floating Drag Overlay (FR-037) */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeApp ? (
          <KanbanCard
            application={activeApp}
            isOverlay={true}
            onOpenDetail={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onStatusChange={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

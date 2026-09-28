# Module B — Application Kanban Board

## 1. Overview & Architectural Scope
The Application Kanban Board (**Module B**, requirements **FR-036 through FR-040**) complements the tabular tracker by providing an interactive visual pipeline of a candidate's job search. Applications are organized across 6 canonical status columns:
1. **Wishlist** (`wishlist`)
2. **Applied** (`applied`)
3. **Assessment** (`assessment`)
4. **Interview** (`interview`)
5. **Offer** (`offer`)
6. **Rejected** (`rejected`)

---

## 2. Key Features & SRS Requirements Mapping

### 2.1 Drag-and-Drop Pipeline (FR-036, FR-037)
- Powered by `@dnd-kit/core` using `DndContext`, `useDroppable` (columns), and `useDraggable` (cards).
- **Pointer Sensor Constraints**: Configured with a 5px movement activation constraint to prevent unintentional drag operations when clicking action menus, links, or buttons.
- **DragOverlay**: Renders an elevated, rotated card preview during drag operations for smooth visual feedback.
- **Optimistic UI with Rollback (FR-037, AC-B-04)**: When a card is dropped on a destination column, the card moves immediately in the UI. If the underlying API request fails or is rejected, the state automatically rolls back to the previous status and an error banner is displayed.

### 2.2 Accessibility & Non-Drag Alternative (FR-038, AC-B-05)
- **Keyboard Operability**: `@dnd-kit` is configured with `KeyboardSensor` so cards can be picked up and moved using standard keyboard navigation.
- **"Move to..." Menu Alternative**: Every card features an action dropdown menu containing direct "Move to..." options for all other 5 statuses, enabling mouse or keyboard users to transition applications without dragging.

### 2.3 Shared State & View Persistence (FR-039)
- **Persistent View Preference**: The chosen view mode (`table` vs `kanban`) is stored in browser `localStorage` under `careerpilot_view_mode`, remembering the user's preference across reloads.
- **Shared Filter & Search State**: Search query, location filter, and status filter apply seamlessly to both Table and Kanban modes.

### 2.4 Automatic Applied Date & Status History (FR-030, FR-040, FR-041)
- Reuses the existing backend `PATCH /api/v1/applications/:id` endpoint.
- Any status can transition to any other status (FR-040).
- When transitioning to `applied` for the first time without an explicit `appliedDate`, the backend automatically stamps the current timestamp (FR-030).
- Every transition atomically writes an `ApplicationHistory` event (`status_changed`) recording `fromStatus`, `toStatus`, and optional notes (FR-041).

---

## 3. Backend Integration & Multi-Tenancy Isolation

- **Endpoint Reused**: `PATCH /api/v1/applications/:id`
- **Security & Authorization**: Protected by `requireAuth`. All modifications are scoped strictly to `req.user.id`.
- **Tenant Isolation (FR-149)**: If User B attempts to drag or update a card belonging to User A, the backend returns HTTP 404 `NOT_FOUND` to avoid leaking resource existence.
- **Schema Validation (FR-129)**: Status updates are validated by Zod against canonical enum values. Invalid transitions return HTTP 400 `VALIDATION_ERROR` and write no history.

---

## 4. Frontend Component Breakdown

| Component | Path | Purpose |
|---|---|---|
| `KanbanBoard` | `frontend/src/components/applications/kanban/KanbanBoard.jsx` | `DndContext` wrapper, sensor configuration, columns grid, drag overlay |
| `KanbanColumn` | `frontend/src/components/applications/kanban/KanbanColumn.jsx` | Droppable target for a status, column counter badge, empty state placeholder |
| `KanbanCard` | `frontend/src/components/applications/kanban/KanbanCard.jsx` | Draggable card with company, title, location, applied date, salary, and "Move to..." menu |
| `ApplicationsPage` | `frontend/src/pages/applications/ApplicationsPage.jsx` | View mode toggle, shared filters, optimistic state management with rollback |

---

## 5. Verification & Test Coverage

### Automated Tests (`backend/tests/kanban.test.js`)
1. **Status Column Filtering**: Queries `GET /api/v1/applications?status=<status>` across all 6 statuses.
2. **Column Move & Auto-Stamping**: Transitions card from `wishlist` to `applied` and verifies `appliedDate` auto-stamping.
3. **Status History Logging**: Verifies `ApplicationHistory` logs `fromStatus`, `toStatus`, and user notes.
4. **Bidirectional Moves**: Verifies direct moves (`interview` $\to$ `offer`, `offer` $\to$ `rejected`).
5. **Unauthenticated Moves**: Verifies HTTP 401 `UNAUTHORIZED`.
6. **Multi-Tenancy Isolation**: Verifies User B receives HTTP 404 `NOT_FOUND` when attempting to move User A's card.
7. **Invalid Status Rejection**: Verifies HTTP 400 `VALIDATION_ERROR` with no history recorded.

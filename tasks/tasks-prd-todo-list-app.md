# Tasks

## Relevant Files

- `src/app/app.component.ts` - Main app shell component orchestrating the overall application.
- `src/app/app.component.html` - Template for the main app layout including header and kanban board.
- `src/app/components/kanban-board/kanban-board.component.ts` - Core component managing the three-column layout and drag-and-drop logic.
- `src/app/components/kanban-board/kanban-board.component.html` - Template for the three-column kanban layout.
- `src/app/components/task-card/task-card.component.ts` - Individual task card component with inline editing capabilities.
- `src/app/components/task-card/task-card.component.html` - Template for task card display and inline editing.
- `src/app/components/task-edit-modal/task-edit-modal.component.ts` - Modal component for detailed task editing.
- `src/app/components/task-edit-modal/task-edit-modal.component.html` - Template for the task editing modal.
- `src/app/services/task.service.ts` - Service handling task CRUD operations and localStorage persistence.
- `src/app/services/toast.service.ts` - Service for displaying toast notifications.
- `src/app/models/task.model.ts` - TypeScript interface/model for Task data structure.
- `src/app/models/task-status.model.ts` - TypeScript enum for task status values.
- `src/styles.css` - Global styles for the application.
- `angular.json` - Angular workspace configuration.
- `package.json` - Project dependencies and scripts.
- `tsconfig.json` - TypeScript configuration.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `task.service.ts` and `task.service.spec.ts` in the same directory).
- Use `ng test` to run all tests or `ng test --include="**/specific.component.spec.ts"` for specific test files.
- Use `ng serve` to run the development server.

## Task List

- [x] 1.0 Project Setup and Configuration

  - [x] 1.1 Initialize Angular project with latest stable version
  - [x] 1.2 Install and configure Angular CDK for drag-and-drop functionality
  - [x] 1.3 Set up project structure and folder organization
  - [x] 1.4 Configure TypeScript and Angular build settings
  - [x] 1.5 Set up basic routing (if needed for future expansion)
  - [x] 1.6 Configure development environment and scripts

- [ ] 2.0 Core Data Models and Services

  - [ ] 2.1 Create Task interface with id, title, description, status, createdAt, order fields
  - [ ] 2.2 Create TaskStatus enum for "backlog", "in-progress", "done" statuses
  - [ ] 2.3 Implement TaskService with CRUD operations
  - [ ] 2.4 Add methods for task ordering and status management
  - [ ] 2.5 Implement ToastService for notifications
  - [ ] 2.6 Create service unit tests

- [ ] 3.0 Basic Task Management Functionality

  - [ ] 3.1 Create TaskCardComponent with display logic
  - [ ] 3.2 Implement task creation form with title and description fields
  - [ ] 3.3 Add task deletion with confirmation dialog
  - [ ] 3.4 Display task creation timestamps
  - [ ] 3.5 Implement basic task list rendering
  - [ ] 3.6 Add task CRUD operation tests

- [ ] 4.0 Kanban Board Layout and Drag-and-Drop

  - [ ] 4.1 Create KanbanBoardComponent with three-column layout
  - [ ] 4.2 Implement Angular CDK drag-and-drop functionality
  - [ ] 4.3 Enable drag-and-drop between columns (status changes)
  - [ ] 4.4 Enable drag-and-drop within columns (reordering)
  - [ ] 4.5 Add visual feedback during drag operations
  - [ ] 4.6 Handle drag-and-drop persistence and state management
  - [ ] 4.7 Test drag-and-drop functionality across all scenarios

- [ ] 5.0 Task Editing and Modal Interface

  - [ ] 5.1 Implement inline editing for task titles (click to edit)
  - [ ] 5.2 Implement inline editing for task descriptions
  - [ ] 5.3 Create TaskEditModalComponent for detailed editing
  - [ ] 5.4 Add modal trigger and form validation
  - [ ] 5.5 Implement save/cancel functionality for both inline and modal editing
  - [ ] 5.6 Add keyboard shortcuts (Enter to save, Esc to cancel)
  - [ ] 5.7 Test all editing scenarios and edge cases

- [ ] 6.0 Data Persistence and Storage

  - [ ] 6.1 Implement localStorage save functionality for tasks
  - [ ] 6.2 Implement localStorage load functionality on app initialization
  - [ ] 6.3 Handle localStorage errors and edge cases
  - [ ] 6.4 Persist task order and column positions
  - [ ] 6.5 Add data migration logic for future schema changes
  - [ ] 6.6 Test persistence across browser sessions

- [ ] 7.0 User Interface Polish and Toast Notifications

  - [ ] 7.1 Create modern card-based design with borders and shadows
  - [ ] 7.2 Implement responsive three-column layout for desktop
  - [ ] 7.3 Style task cards with appropriate typography and spacing
  - [ ] 7.4 Add hover states and interactive feedback
  - [ ] 7.5 Implement toast notification system
  - [ ] 7.6 Add confirmation dialogs for delete operations
  - [ ] 7.7 Style header with application title and "Add Task" button
  - [ ] 7.8 Final visual polish and animations

- [ ] 8.0 Validation and Error Handling
  - [ ] 8.1 Implement 128-character limit for task titles
  - [ ] 8.2 Implement 256-character limit for task descriptions
  - [ ] 8.3 Require task title before allowing creation
  - [ ] 8.4 Add client-side validation with error messages
  - [ ] 8.5 Handle localStorage quota and error scenarios
  - [ ] 8.6 Add comprehensive error handling for all user actions
  - [ ] 8.7 Test validation and error scenarios
  - [ ] 8.8 Add user-friendly error messages and recovery options

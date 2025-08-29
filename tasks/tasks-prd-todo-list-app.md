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

- [ ] 1.0 Project Setup and Configuration
- [ ] 2.0 Core Data Models and Services
- [ ] 3.0 Basic Task Management Functionality
- [ ] 4.0 Kanban Board Layout and Drag-and-Drop
- [ ] 5.0 Task Editing and Modal Interface
- [ ] 6.0 Data Persistence and Storage
- [ ] 7.0 User Interface Polish and Toast Notifications
- [ ] 8.0 Validation and Error Handling

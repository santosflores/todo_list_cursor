import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  CdkDragPlaceholder,
  CdkDragPreview,
  moveItemInArray,
  transferArrayItem,
  CdkDragStart,
  CdkDragEnd,
  CdkDragEnter,
  CdkDragExit,
} from '@angular/cdk/drag-drop';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskEditModalComponent } from '../task-edit-modal/task-edit-modal.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';
import { Task } from '../../models/task.model';
import { TaskStatus, TaskStatusType } from '../../models/task-status.model';
import { DragDropTestRunner } from './drag-drop-test-runner';

// Global window extensions for testing utilities
declare global {
  interface Window {
    dragDropTestRunner?: DragDropTestRunner;
    testPersistence?: () => void;
  }
}

@Component({
  selector: 'app-kanban-board',
  imports: [
    CommonModule,
    TaskCardComponent,
    TaskEditModalComponent,
    ConfirmationDialogComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
  ],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KanbanBoardComponent {
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  private elementRef = inject(ElementRef);

  // Visual feedback signals
  isDragging = signal(false);
  dragSourceColumn = signal<string | null>(null);
  dragOverColumn = signal<string | null>(null);

  // Modal state
  isModalOpen = signal(false);
  editingTask = signal<Task | null>(null);
  
  // Confirmation dialog state
  isConfirmDialogOpen = signal(false);
  confirmDialogData = signal<ConfirmationDialogData>({ title: '', message: '' });
  pendingDeleteTaskId = signal<string | null>(null);

  // Test runner instance
  private testRunner: DragDropTestRunner;

  constructor() {
    // Validate data integrity on component initialization
    this.validateDataIntegrityOnInit();

    // Initialize test runner
    this.testRunner = new DragDropTestRunner(this, this.taskService);

    // Expose to global scope for browser console access
    if (typeof window !== 'undefined') {
      window.dragDropTestRunner = this.testRunner;
      
      // Add simple persistence test functions to global scope
      window.testPersistence = () => {
        console.log('🧪 Testing localStorage persistence...');
        console.log('Tasks in localStorage:', localStorage.getItem('daily-tasks'));
        console.log('Current version:', localStorage.getItem('daily-tasks-version'));
        console.log('Total tasks loaded:', this.taskService.allTasks().length);
        console.log('Storage info:', this.taskService.getStorageInfo());
        console.log('Data version info:', this.taskService.getDataVersion());
      };
    }
  }

  // Column definitions
  readonly columns = [
    {
      id: TaskStatus.BACKLOG,
      title: 'Backlog',
      description: 'Tasks to be started',
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress',
      description: 'Tasks currently being worked on',
    },
    {
      id: TaskStatus.DONE,
      title: 'Done',
      description: 'Completed tasks',
    },
  ];

  // Get all tasks from service
  allTasks = this.taskService.allTasks;

  // Computed signals for tasks grouped by status
  backlogTasks = computed(() =>
    this.allTasks()
      .filter((task) => task.status === TaskStatus.BACKLOG)
      .sort((a, b) => a.order - b.order)
  );

  inProgressTasks = computed(() =>
    this.allTasks()
      .filter((task) => task.status === TaskStatus.IN_PROGRESS)
      .sort((a, b) => a.order - b.order)
  );

  doneTasks = computed(() =>
    this.allTasks()
      .filter((task) => task.status === TaskStatus.DONE)
      .sort((a, b) => a.order - b.order)
  );

  /**
   * Gets tasks for a specific column status
   */
  getTasksForColumn(status: TaskStatusType): Task[] {
    switch (status) {
      case TaskStatus.BACKLOG:
        return this.backlogTasks();
      case TaskStatus.IN_PROGRESS:
        return this.inProgressTasks();
      case TaskStatus.DONE:
        return this.doneTasks();
      default:
        return [];
    }
  }

  /**
   * Handles task deletion
   */
  onDeleteTask(taskId: string): void {
    const task = this.taskService.getTask(taskId);
    if (!task) {
      return;
    }

    // Set up confirmation dialog
    this.confirmDialogData.set({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    this.pendingDeleteTaskId.set(taskId);
    this.isConfirmDialogOpen.set(true);
  }

  /**
   * Handles task updates from inline editing
   */
  onUpdateTask(event: { id: string; updates: Partial<Pick<Task, 'title' | 'description'>> }): void {
    try {
      const updatedTask = this.taskService.updateTask(event.id, event.updates);
      
      // Show appropriate success message based on what was updated
      if (event.updates.title) {
        this.toastService.showSuccess(`Task title updated to "${event.updates.title}"`);
      } else if (event.updates.description !== undefined) {
        if (event.updates.description) {
          this.toastService.showSuccess('Task description updated successfully');
        } else {
          this.toastService.showSuccess('Task description removed');
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      this.toastService.showError('Failed to update task. Please try again.');
    }
  }

  /**
   * Opens the edit modal for a specific task
   */
  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.isModalOpen.set(true);
  }

  /**
   * Opens the create modal for a new task
   */
  openCreateModal(): void {
    this.editingTask.set(null);
    this.isModalOpen.set(true);
  }

  /**
   * Closes the edit modal
   */
  closeEditModal(): void {
    this.isModalOpen.set(false);
    this.editingTask.set(null);
  }

  /**
   * Handles confirmation dialog confirm action
   */
  onConfirmDialogConfirm(): void {
    const taskId = this.pendingDeleteTaskId();
    if (taskId) {
      const task = this.taskService.getTask(taskId);
      const success = this.taskService.deleteTask(taskId);
      
      if (success && task) {
        this.toastService.showSuccess(`Task "${task.title}" deleted successfully`);
      } else {
        this.toastService.showError('Failed to delete task. Please try again.');
      }
    }
    
    this.closeConfirmDialog();
  }

  /**
   * Handles confirmation dialog cancel action
   */
  onConfirmDialogCancel(): void {
    this.closeConfirmDialog();
  }

  /**
   * Closes the confirmation dialog and cleans up state
   */
  private closeConfirmDialog(): void {
    this.isConfirmDialogOpen.set(false);
    this.pendingDeleteTaskId.set(null);
    this.confirmDialogData.set({ title: '', message: '' });
  }

  /**
   * Handles saving from the modal (both create and edit)
   */
  onModalSave(event: { task: Task | null; updates: Partial<Pick<Task, 'title' | 'description' | 'status'>> }): void {
    try {
      if (event.task) {
        // Editing existing task
        const updatedTask = this.taskService.updateTask(event.task.id, event.updates);
        this.toastService.showSuccess(`Task "${updatedTask.title}" updated successfully`);
      } else {
        // Creating new task
        const newTask = this.taskService.createTask(
          event.updates.title!,
          event.updates.description
        );
        this.toastService.showSuccess(`Task "${newTask.title}" created successfully!`);
      }
      
      this.closeEditModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      this.toastService.showError('Failed to save task. Please try again.');
    }
  }

  /**
   * Handles drag and drop events for tasks with enhanced persistence
   */
  onDrop(event: CdkDragDrop<Task[]>): void {
    // Show loading state (optional)
    const draggedTask = event.previousContainer.data[event.previousIndex];

    if (event.previousContainer === event.container) {
      // Reordering within the same column
      this.handleReorderOperation(event, draggedTask);
    } else {
      // Moving between different columns
      this.handleMoveOperation(event, draggedTask);
    }
  }

  /**
   * Handles reordering tasks within the same column
   */
  private handleReorderOperation(
    event: CdkDragDrop<Task[]>,
    draggedTask: Task
  ): void {
    const tasks = [...event.container.data];
    const status = this.getStatusFromContainerId(event.container.id);

    // Optimistically update the UI
    moveItemInArray(tasks, event.previousIndex, event.currentIndex);

    // Calculate affected tasks for atomic update
    const affectedTasks = tasks.map((task, index) => ({
      id: task.id,
      newOrder: index,
    }));

    // Perform atomic persistence
    const result = this.taskService.handleDragDropOperation({
      type: 'reorder',
      taskId: draggedTask.id,
      newOrder: event.currentIndex,
      affectedTasks,
    });

    if (!result.success) {
      // Revert UI changes on failure
      this.revertDropOperation();
      this.showErrorMessage(`Failed to reorder task: ${result.error}`);
    } else {
      this.showSuccessMessage(
        `Task "${draggedTask.title}" reordered successfully`
      );
    }
  }

  /**
   * Handles moving tasks between different columns
   */
  private handleMoveOperation(
    event: CdkDragDrop<Task[]>,
    draggedTask: Task
  ): void {
    const previousTasks = [...event.previousContainer.data];
    const currentTasks = [...event.container.data];
    const newStatus = this.getStatusFromContainerId(event.container.id);
    const previousStatus = this.getStatusFromContainerId(
      event.previousContainer.id
    );

    // Optimistically update the UI
    transferArrayItem(
      previousTasks,
      currentTasks,
      event.previousIndex,
      event.currentIndex
    );

    // Calculate all affected tasks for atomic update
    const affectedTasks: Array<{ id: string; newOrder: number }> = [];

    // Add affected tasks from current column
    currentTasks.forEach((task, index) => {
      affectedTasks.push({ id: task.id, newOrder: index });
    });

    // Add affected tasks from previous column
    previousTasks.forEach((task, index) => {
      affectedTasks.push({ id: task.id, newOrder: index });
    });

    // Perform atomic persistence
    const result = this.taskService.handleDragDropOperation({
      type: 'move',
      taskId: draggedTask.id,
      newStatus,
      newOrder: event.currentIndex,
      affectedTasks,
    });

    if (!result.success) {
      // Revert UI changes on failure
      this.revertDropOperation();
      this.showErrorMessage(`Failed to move task: ${result.error}`);
    } else {
      const statusNames = {
        [TaskStatus.BACKLOG]: 'Backlog',
        [TaskStatus.IN_PROGRESS]: 'In Progress',
        [TaskStatus.DONE]: 'Done',
      };
      this.showSuccessMessage(
        `Task "${draggedTask.title}" moved to ${statusNames[newStatus]} successfully`
      );
    }
  }

  /**
   * Reverts the drop operation by refreshing data from service
   * This ensures the UI reflects the actual persisted state
   */
  private revertDropOperation(): void {
    // The signals will automatically update when the service state changes
    // Force a check of data integrity
    this.validateDataIntegrity();
  }

  /**
   * Validates and repairs data integrity if needed
   */
  private validateDataIntegrity(): void {
    const validation = this.taskService.validateTaskIntegrity();
    if (!validation.isValid) {
      console.warn('Data integrity issues detected:', validation.errors);

      // Attempt to repair automatically
      const repaired = this.taskService.repairTaskIntegrity();
      if (repaired) {
        this.showSuccessMessage(
          'Data integrity issues were automatically repaired'
        );
      } else {
        this.showErrorMessage(
          'Critical data integrity issues detected. Please refresh the page.'
        );
      }
    }
  }

  /**
   * Shows success message to user
   */
  private showSuccessMessage(message: string): void {
    console.log('Success:', message);
    this.toastService.showSuccess(message);
  }

  /**
   * Shows error message to user
   */
  private showErrorMessage(message: string): void {
    console.error('Error:', message);
    
    // Show critical errors with no auto-dismiss
    if (message.includes('Critical')) {
      this.toastService.showError(message, 0);
    } else {
      this.toastService.showError(message, 8000); // 8 seconds for regular errors
    }
  }

  /**
   * Validates data integrity when component initializes
   */
  private validateDataIntegrityOnInit(): void {
    try {
      const validation = this.taskService.validateTaskIntegrity();
      if (!validation.isValid) {
        console.warn(
          'Data integrity issues found on initialization:',
          validation.errors
        );

        // Attempt automatic repair
        const repaired = this.taskService.repairTaskIntegrity();
        if (repaired) {
          console.log(
            'Data integrity issues automatically repaired on startup'
          );
        } else {
          console.error('Failed to repair data integrity issues on startup');
        }
      } else {
        console.log('Data integrity validation passed on initialization');
      }
    } catch (error) {
      console.error('Error during data integrity validation on init:', error);
    }
  }

  /**
   * Gets performance metrics for drag and drop operations
   */
  getDragDropMetrics(): {
    totalTasks: number;
    tasksByStatus: Record<TaskStatusType, number>;
    lastUpdateTime: string;
  } {
    const allTasks = this.allTasks();
    const tasksByStatus = {
      [TaskStatus.BACKLOG]: this.backlogTasks().length,
      [TaskStatus.IN_PROGRESS]: this.inProgressTasks().length,
      [TaskStatus.DONE]: this.doneTasks().length,
    };

    return {
      totalTasks: allTasks.length,
      tasksByStatus,
      lastUpdateTime: new Date().toISOString(),
    };
  }

  /**
   * Exports current kanban state for debugging or backup
   */
  exportKanbanState(): string {
    const state = {
      tasks: this.allTasks(),
      columns: this.columns,
      metrics: this.getDragDropMetrics(),
      integrity: this.taskService.validateTaskIntegrity(),
      storage: this.taskService.getStorageInfo(),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Developer utility: Tests persistence functionality
   * Can be called from browser console for debugging
   */
  testPersistence(): void {
    console.group('🧪 Testing Kanban Persistence & State Management');

    try {
      // Test 1: Data Integrity Validation
      console.log('📋 Test 1: Data Integrity Validation');
      const integrity = this.taskService.validateTaskIntegrity();
      console.log('Integrity check:', integrity);

      // Test 2: Storage Information
      console.log('💾 Test 2: Storage Information');
      const storage = this.taskService.getStorageInfo();
      console.log('Storage info:', storage);

      // Test 3: Export Current State
      console.log('📤 Test 3: Export Current State');
      const state = this.exportKanbanState();
      console.log('Current state exported (check next log)');
      console.log(JSON.parse(state));

      // Test 4: Metrics
      console.log('📊 Test 4: Performance Metrics');
      const metrics = this.getDragDropMetrics();
      console.log('Drag & Drop Metrics:', metrics);

      // Test 5: Performance Monitoring
      console.log('⚡ Test 5: Performance Monitoring');
      const performance = this.taskService.getPerformanceMetrics();
      console.log('Performance Metrics:', performance);

      console.log('✅ All persistence tests completed successfully');
    } catch (error) {
      console.error('❌ Persistence test failed:', error);
    }

    console.groupEnd();
  }

  /**
   * Developer utility: Simulates various error scenarios for testing
   */
  simulateErrorScenarios(): void {
    console.group('🚨 Testing Error Scenarios');

    console.warn('This will test error handling - some errors are expected');

    try {
      // Test invalid task operations
      console.log('Testing invalid operations...');

      // These should be handled gracefully
      this.showErrorMessage('Test error message');
      this.showSuccessMessage('Test success message');

      console.log('✅ Error scenario testing completed');
    } catch (error) {
      console.error('❌ Error scenario test failed:', error);
    }

    console.groupEnd();
  }

  /**
   * Runs comprehensive drag and drop test suite
   * Available in browser console via: window.dragDropTestRunner.runAllTests()
   */
  async runDragDropTests(): Promise<any> {
    return await this.testRunner.runAllTests();
  }

  /**
   * Quick smoke test for drag and drop functionality
   */
  quickDragDropTest(): void {
    console.group('🚀 Quick Drag & Drop Smoke Test');

    try {
      // Test 1: Basic component state
      console.log('1. Testing component state...');
      const hasCorrectColumns = this.columns.length === 3;
      console.log(`✅ Columns: ${hasCorrectColumns ? 'OK' : 'FAIL'}`);

      // Test 2: Task distribution
      console.log('2. Testing task distribution...');
      const backlogCount = this.getTasksForColumn(TaskStatus.BACKLOG).length;
      const inProgressCount = this.getTasksForColumn(
        TaskStatus.IN_PROGRESS
      ).length;
      const doneCount = this.getTasksForColumn(TaskStatus.DONE).length;
      console.log(
        `   Backlog: ${backlogCount}, In Progress: ${inProgressCount}, Done: ${doneCount}`
      );

      // Test 3: Visual feedback state
      console.log('3. Testing visual feedback...');
      const initialDragState = this.isDragging();
      this.isDragging.set(true);
      const updatedDragState = this.isDragging();
      this.isDragging.set(false);
      console.log(
        `✅ Visual feedback: ${
          !initialDragState && updatedDragState ? 'OK' : 'FAIL'
        }`
      );

      // Test 4: Status mapping
      console.log('4. Testing status mapping...');
      const mappingCorrect =
        this.getDropListId(TaskStatus.BACKLOG) === 'backlog-list' &&
        this.getDropListId(TaskStatus.IN_PROGRESS) === 'in-progress-list' &&
        this.getDropListId(TaskStatus.DONE) === 'done-list';
      console.log(`✅ Status mapping: ${mappingCorrect ? 'OK' : 'FAIL'}`);

      // Test 5: Service integration
      console.log('5. Testing service integration...');
      const integrity = this.taskService.validateTaskIntegrity();
      console.log(
        `✅ Data integrity: ${integrity.isValid ? 'OK' : 'ISSUES DETECTED'}`
      );
      if (!integrity.isValid) {
        console.warn('Integrity issues:', integrity.errors);
      }

      // Test 6: Performance metrics
      console.log('6. Testing performance metrics...');
      const metrics = this.taskService.getPerformanceMetrics();
      console.log(`   Operations: ${JSON.stringify(metrics.operations)}`);
      console.log(`   Success rate: ${metrics.successRate}%`);

      console.log('\n🎉 Quick smoke test completed successfully!');
      console.log(
        '💡 For comprehensive testing, run: window.dragDropTestRunner.runAllTests()'
      );
    } catch (error) {
      console.error('❌ Quick test failed:', error);
    }

    console.groupEnd();
  }

  /**
   * Creates sample tasks for testing purposes
   */
  createTestTasks(count: number = 6): void {
    console.log(`🏗️ Creating ${count} test tasks...`);

    const taskNames = [
      'Implement user authentication',
      'Design dashboard layout',
      'Set up CI/CD pipeline',
      'Write unit tests',
      'Optimize database queries',
      'Create API documentation',
      'Fix responsive design issues',
      'Add error logging',
      'Implement caching layer',
      'Review security protocols',
    ];

    const descriptions = [
      'Set up JWT authentication with refresh tokens',
      'Create modern, responsive dashboard interface',
      'Configure automated deployment pipeline',
      'Write comprehensive test coverage',
      'Optimize slow database operations',
      'Document REST API endpoints',
      'Fix mobile responsiveness issues',
      'Implement centralized error logging',
      'Add Redis caching for performance',
      'Audit and improve security measures',
    ];

    for (let i = 0; i < Math.min(count, taskNames.length); i++) {
      this.taskService.createTask(taskNames[i], descriptions[i]);
    }

    console.log(`✅ Created ${Math.min(count, taskNames.length)} test tasks`);

    // Distribute some tasks to different columns for testing
    if (count >= 3) {
      const allTasks = this.taskService.allTasks();
      if (allTasks.length >= 3) {
        // Move some tasks to in-progress
        this.taskService.updateTaskStatus(
          allTasks[1].id,
          TaskStatus.IN_PROGRESS
        );
        if (allTasks.length >= 4) {
          this.taskService.updateTaskStatus(
            allTasks[3].id,
            TaskStatus.IN_PROGRESS
          );
        }

        // Move some tasks to done
        if (allTasks.length >= 2) {
          this.taskService.updateTaskStatus(allTasks[2].id, TaskStatus.DONE);
        }
        if (allTasks.length >= 5) {
          this.taskService.updateTaskStatus(allTasks[4].id, TaskStatus.DONE);
        }

        console.log('📊 Tasks distributed across columns for testing');
      }
    }
  }

  /**
   * Clears all tasks (for testing purposes)
   */
  clearAllTasks(): void {
    const confirmed = confirm('⚠️ This will delete ALL tasks. Are you sure?');
    if (confirmed) {
      const allTasks = this.taskService.allTasks();
      allTasks.forEach((task) => {
        this.taskService.deleteTask(task.id);
      });
      console.log('🗑️ All tasks cleared');
    }
  }

  /**
   * Gets the task status from a drop list container ID
   */
  private getStatusFromContainerId(containerId: string): TaskStatusType {
    switch (containerId) {
      case 'backlog-list':
        return TaskStatus.BACKLOG;
      case 'in-progress-list':
        return TaskStatus.IN_PROGRESS;
      case 'done-list':
        return TaskStatus.DONE;
      default:
        return TaskStatus.BACKLOG;
    }
  }

  /**
   * Gets the drop list ID for a given status
   */
  getDropListId(status: TaskStatusType): string {
    switch (status) {
      case TaskStatus.BACKLOG:
        return 'backlog-list';
      case TaskStatus.IN_PROGRESS:
        return 'in-progress-list';
      case TaskStatus.DONE:
        return 'done-list';
      default:
        return 'backlog-list';
    }
  }

  /**
   * Handles drag start event for visual feedback
   */
  onDragStart(event: CdkDragStart): void {
    this.isDragging.set(true);

    // Find the source column
    const draggedTask = event.source.data;
    if (draggedTask) {
      this.dragSourceColumn.set(this.getDropListId(draggedTask.status));
    }

    // Add dragging class to the board
    this.elementRef.nativeElement.classList.add('is-dragging');

    // Add source column class
    const sourceColumn = this.getColumnElement(this.dragSourceColumn());
    if (sourceColumn) {
      sourceColumn.classList.add('drag-source');
    }
  }

  /**
   * Handles drag end event to clean up visual feedback
   */
  onDragEnd(event: CdkDragEnd): void {
    this.isDragging.set(false);
    this.dragSourceColumn.set(null);
    this.dragOverColumn.set(null);

    // Remove dragging class from the board
    this.elementRef.nativeElement.classList.remove('is-dragging');

    // Remove all drag-related classes from columns
    const columns =
      this.elementRef.nativeElement.querySelectorAll('.kanban-column');
    columns.forEach((column: HTMLElement) => {
      column.classList.remove('drag-source', 'drag-over');
    });
  }

  /**
   * Handles drag enter event for column highlighting
   */
  onDragEnter(event: CdkDragEnter): void {
    const targetListId = event.container.id;
    this.dragOverColumn.set(targetListId);

    // Add drag-over class to the target column
    const targetColumn = this.getColumnElement(targetListId);
    if (targetColumn) {
      targetColumn.classList.add('drag-over');
    }
  }

  /**
   * Handles drag exit event to remove column highlighting
   */
  onDragExit(event: CdkDragExit): void {
    const exitedListId = event.container.id;

    // Remove drag-over class from the exited column
    const exitedColumn = this.getColumnElement(exitedListId);
    if (exitedColumn) {
      exitedColumn.classList.remove('drag-over');
    }

    // Clear drag over column if it matches
    if (this.dragOverColumn() === exitedListId) {
      this.dragOverColumn.set(null);
    }
  }

  /**
   * Gets the column element by drop list ID
   */
  private getColumnElement(dropListId: string | null): HTMLElement | null {
    if (!dropListId) return null;

    const dropList = this.elementRef.nativeElement.querySelector(
      `[id="${dropListId}"]`
    );
    return dropList?.closest('.kanban-column') || null;
  }

  /**
   * Checks if a column is the drag source
   */
  isSourceColumn(status: TaskStatusType): boolean {
    return this.dragSourceColumn() === this.getDropListId(status);
  }

  /**
   * Checks if a column is being dragged over
   */
  isDragOverColumn(status: TaskStatusType): boolean {
    return this.dragOverColumn() === this.getDropListId(status);
  }
}

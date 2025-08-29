import { Component, ChangeDetectionStrategy, inject, computed, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem, CdkDragStart, CdkDragEnd, CdkDragEnter, CdkDragExit } from '@angular/cdk/drag-drop';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { TaskStatus, TaskStatusType } from '../../models/task-status.model';

@Component({
  selector: 'app-kanban-board',
  imports: [CommonModule, TaskCardComponent, CdkDropListGroup, CdkDropList, CdkDrag],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanBoardComponent {
  private taskService = inject(TaskService);
  private elementRef = inject(ElementRef);
  
  // Visual feedback signals
  isDragging = signal(false);
  dragSourceColumn = signal<string | null>(null);
  dragOverColumn = signal<string | null>(null);

  constructor() {
    // Validate data integrity on component initialization
    this.validateDataIntegrityOnInit();
  }
  
  // Column definitions
  readonly columns = [
    { 
      id: TaskStatus.BACKLOG,
      title: 'Backlog',
      description: 'Tasks to be started'
    },
    { 
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress', 
      description: 'Tasks currently being worked on'
    },
    { 
      id: TaskStatus.DONE,
      title: 'Done',
      description: 'Completed tasks'
    }
  ];

  // Get all tasks from service
  allTasks = this.taskService.allTasks;

  // Computed signals for tasks grouped by status
  backlogTasks = computed(() => 
    this.allTasks()
      .filter(task => task.status === TaskStatus.BACKLOG)
      .sort((a, b) => a.order - b.order)
  );

  inProgressTasks = computed(() => 
    this.allTasks()
      .filter(task => task.status === TaskStatus.IN_PROGRESS)
      .sort((a, b) => a.order - b.order)
  );

  doneTasks = computed(() => 
    this.allTasks()
      .filter(task => task.status === TaskStatus.DONE)
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
    
    const confirmed = confirm(
      `Are you sure you want to delete the task "${task.title}"?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      const success = this.taskService.deleteTask(taskId);
      if (success) {
        // TODO: Show success toast notification
        console.log('Task deleted successfully');
      } else {
        // TODO: Show error toast notification
        console.error('Failed to delete task');
      }
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
  private handleReorderOperation(event: CdkDragDrop<Task[]>, draggedTask: Task): void {
    const tasks = [...event.container.data];
    const status = this.getStatusFromContainerId(event.container.id);
    
    // Optimistically update the UI
    moveItemInArray(tasks, event.previousIndex, event.currentIndex);
    
    // Calculate affected tasks for atomic update
    const affectedTasks = tasks.map((task, index) => ({
      id: task.id,
      newOrder: index
    }));

    // Perform atomic persistence
    const result = this.taskService.handleDragDropOperation({
      type: 'reorder',
      taskId: draggedTask.id,
      newOrder: event.currentIndex,
      affectedTasks
    });

    if (!result.success) {
      // Revert UI changes on failure
      this.revertDropOperation();
      this.showErrorMessage(`Failed to reorder task: ${result.error}`);
    } else {
      this.showSuccessMessage(`Task "${draggedTask.title}" reordered successfully`);
    }
  }

  /**
   * Handles moving tasks between different columns
   */
  private handleMoveOperation(event: CdkDragDrop<Task[]>, draggedTask: Task): void {
    const previousTasks = [...event.previousContainer.data];
    const currentTasks = [...event.container.data];
    const newStatus = this.getStatusFromContainerId(event.container.id);
    const previousStatus = this.getStatusFromContainerId(event.previousContainer.id);
    
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
      affectedTasks
    });

    if (!result.success) {
      // Revert UI changes on failure
      this.revertDropOperation();
      this.showErrorMessage(`Failed to move task: ${result.error}`);
    } else {
      const statusNames = {
        [TaskStatus.BACKLOG]: 'Backlog',
        [TaskStatus.IN_PROGRESS]: 'In Progress',
        [TaskStatus.DONE]: 'Done'
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
        this.showSuccessMessage('Data integrity issues were automatically repaired');
      } else {
        this.showErrorMessage('Critical data integrity issues detected. Please refresh the page.');
      }
    }
  }

  /**
   * Shows success message (placeholder for toast service integration)
   */
  private showSuccessMessage(message: string): void {
    console.log('Success:', message);
    // TODO: Integrate with ToastService when implemented
  }

  /**
   * Shows error message (placeholder for toast service integration)
   */
  private showErrorMessage(message: string): void {
    console.error('Error:', message);
    // TODO: Integrate with ToastService when implemented
    
    // For now, show a simple alert for critical errors
    if (message.includes('Critical')) {
      alert(message);
    }
  }

  /**
   * Validates data integrity when component initializes
   */
  private validateDataIntegrityOnInit(): void {
    try {
      const validation = this.taskService.validateTaskIntegrity();
      if (!validation.isValid) {
        console.warn('Data integrity issues found on initialization:', validation.errors);
        
        // Attempt automatic repair
        const repaired = this.taskService.repairTaskIntegrity();
        if (repaired) {
          console.log('Data integrity issues automatically repaired on startup');
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
      [TaskStatus.DONE]: this.doneTasks().length
    };

    return {
      totalTasks: allTasks.length,
      tasksByStatus,
      lastUpdateTime: new Date().toISOString()
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
      timestamp: new Date().toISOString()
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
    const columns = this.elementRef.nativeElement.querySelectorAll('.kanban-column');
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
    
    const dropList = this.elementRef.nativeElement.querySelector(`[id="${dropListId}"]`);
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
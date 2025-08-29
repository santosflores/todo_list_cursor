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
   * Handles drag and drop events for tasks
   */
  onDrop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      // Reordering within the same column
      const tasks = event.container.data;
      moveItemInArray(tasks, event.previousIndex, event.currentIndex);
      
      // Update the order of all tasks in this column
      this.updateTaskOrder(tasks, this.getStatusFromContainerId(event.container.id));
    } else {
      // Moving between different columns
      const previousTasks = event.previousContainer.data;
      const currentTasks = event.container.data;
      
      // Get the task being moved
      const movedTask = previousTasks[event.previousIndex];
      const newStatus = this.getStatusFromContainerId(event.container.id);
      
      // Transfer the task between arrays
      transferArrayItem(
        previousTasks,
        currentTasks,
        event.previousIndex,
        event.currentIndex
      );
      
      // Update task status and order
      this.taskService.updateTaskStatus(movedTask.id, newStatus);
      this.updateTaskOrder(currentTasks, newStatus);
      
      // Also update order for the previous column if needed
      if (previousTasks.length > 0) {
        const previousStatus = this.getStatusFromContainerId(event.previousContainer.id);
        this.updateTaskOrder(previousTasks, previousStatus);
      }
    }
  }

  /**
   * Updates the order of tasks in a column
   */
  private updateTaskOrder(tasks: Task[], status: TaskStatusType): void {
    tasks.forEach((task, index) => {
      this.taskService.updateTaskOrder(task.id, index);
    });
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
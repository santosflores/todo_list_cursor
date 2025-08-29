import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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
}
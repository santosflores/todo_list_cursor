import { Injectable, signal, computed } from '@angular/core';
import { Task } from '../models/task.model';
import { TaskStatus, TaskStatusType } from '../models/task-status.model';

/**
 * Service for managing tasks with CRUD operations and localStorage persistence
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly STORAGE_KEY = 'daily-tasks';
  
  // Signal for all tasks
  private _tasks = signal<Task[]>([]);
  
  // Computed signals for tasks by status
  readonly backlogTasks = computed(() => 
    this._tasks().filter(task => task.status === TaskStatus.BACKLOG)
      .sort((a, b) => a.order - b.order)
  );
  
  readonly inProgressTasks = computed(() => 
    this._tasks().filter(task => task.status === TaskStatus.IN_PROGRESS)
      .sort((a, b) => a.order - b.order)
  );
  
  readonly doneTasks = computed(() => 
    this._tasks().filter(task => task.status === TaskStatus.DONE)
      .sort((a, b) => a.order - b.order)
  );
  
  readonly allTasks = computed(() => this._tasks());

  constructor() {
    this.loadTasks();
  }

  /**
   * Creates a new task
   */
  createTask(title: string, description?: string): Task {
    if (!title.trim()) {
      throw new Error('Task title is required');
    }
    
    if (title.length > 128) {
      throw new Error('Task title cannot exceed 128 characters');
    }
    
    if (description && description.length > 256) {
      throw new Error('Task description cannot exceed 256 characters');
    }

    const newTask: Task = {
      id: this.generateId(),
      title: title.trim(),
      description: description?.trim(),
      status: TaskStatus.BACKLOG,
      createdAt: new Date(),
      order: this.getNextOrder(TaskStatus.BACKLOG)
    };

    this._tasks.update(tasks => [...tasks, newTask]);
    this.saveTasks();
    
    return newTask;
  }

  /**
   * Gets a task by ID
   */
  getTask(id: string): Task | undefined {
    return this._tasks().find(task => task.id === id);
  }

  /**
   * Updates an existing task
   */
  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Task title is required');
      }
      if (updates.title.length > 128) {
        throw new Error('Task title cannot exceed 128 characters');
      }
    }

    if (updates.description !== undefined && updates.description.length > 256) {
      throw new Error('Task description cannot exceed 256 characters');
    }

    this._tasks.update(tasks => 
      tasks.map(t => 
        t.id === id 
          ? { ...t, ...updates, title: updates.title?.trim() || t.title, description: updates.description?.trim() }
          : t
      )
    );
    
    this.saveTasks();
    return this.getTask(id)!;
  }

  /**
   * Deletes a task by ID
   */
  deleteTask(id: string): boolean {
    const initialLength = this._tasks().length;
    this._tasks.update(tasks => tasks.filter(task => task.id !== id));
    
    if (this._tasks().length < initialLength) {
      this.saveTasks();
      return true;
    }
    
    return false;
  }

  /**
   * Gets all tasks with a specific status
   */
  getTasksByStatus(status: TaskStatusType): Task[] {
    return this._tasks()
      .filter(task => task.status === status)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Saves tasks to localStorage
   */
  private saveTasks(): void {
    try {
      const tasksData = this._tasks().map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString()
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasksData));
    } catch (error) {
      console.error('Failed to save tasks to localStorage:', error);
      throw new Error('Failed to save tasks. Please check your browser storage settings.');
    }
  }

  /**
   * Loads tasks from localStorage
   */
  private loadTasks(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const tasksData = JSON.parse(stored);
        const tasks: Task[] = tasksData.map((taskData: any) => ({
          ...taskData,
          createdAt: new Date(taskData.createdAt)
        }));
        this._tasks.set(tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks from localStorage:', error);
      // Don't throw here, just start with empty tasks
      this._tasks.set([]);
    }
  }

  /**
   * Generates a unique ID for a new task
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Changes the status of a task and updates its order within the new column
   */
  changeTaskStatus(id: string, newStatus: TaskStatusType, newOrder?: number): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const targetOrder = newOrder !== undefined 
      ? newOrder 
      : this.getNextOrder(newStatus);

    // If moving to a new status, reorder tasks in the target column
    if (task.status !== newStatus) {
      this.reorderTasksInColumn(newStatus, targetOrder, id);
    }

    return this.updateTask(id, { status: newStatus, order: targetOrder });
  }

  /**
   * Reorders a task within its current column
   */
  reorderTask(id: string, newOrder: number): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    this.reorderTasksInColumn(task.status, newOrder, id);
    return this.updateTask(id, { order: newOrder });
  }

  /**
   * Moves a task to a specific position, handling both status change and reordering
   */
  moveTask(id: string, newStatus: TaskStatusType, newOrder: number): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // If changing status, reorder both old and new columns
    if (task.status !== newStatus) {
      // Reorder old column (remove gaps)
      this.compactTaskOrders(task.status, id);
      // Reorder new column (make space)
      this.reorderTasksInColumn(newStatus, newOrder, id);
    } else {
      // Just reordering within the same column
      this.reorderTasksInColumn(newStatus, newOrder, id);
    }

    return this.updateTask(id, { status: newStatus, order: newOrder });
  }

  /**
   * Reorders tasks in a column to make space for a task at the specified position
   */
  private reorderTasksInColumn(status: TaskStatusType, insertOrder: number, excludeTaskId?: string): void {
    const tasksInColumn = this.getTasksByStatus(status)
      .filter(task => task.id !== excludeTaskId);

    // Update orders for tasks that need to be shifted
    tasksInColumn.forEach(task => {
      if (task.order >= insertOrder) {
        this._tasks.update(tasks => 
          tasks.map(t => 
            t.id === task.id 
              ? { ...t, order: t.order + 1 }
              : t
          )
        );
      }
    });
  }

  /**
   * Removes gaps in task ordering for a specific status
   */
  private compactTaskOrders(status: TaskStatusType, excludeTaskId?: string): void {
    const tasksInColumn = this.getTasksByStatus(status)
      .filter(task => task.id !== excludeTaskId);

    tasksInColumn.forEach((task, index) => {
      if (task.order !== index) {
        this._tasks.update(tasks => 
          tasks.map(t => 
            t.id === task.id 
              ? { ...t, order: index }
              : t
          )
        );
      }
    });
  }

  /**
   * Updates task status (for drag and drop functionality)
   */
  updateTaskStatus(id: string, newStatus: TaskStatusType): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    return this.updateTask(id, { status: newStatus });
  }

  /**
   * Updates task order (for drag and drop functionality)
   */
  updateTaskOrder(id: string, newOrder: number): Task {
    const task = this.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    return this.updateTask(id, { order: newOrder });
  }

  /**
   * Gets the next order number for a given status
   */
  private getNextOrder(status: TaskStatusType): number {
    const tasksInStatus = this.getTasksByStatus(status);
    return tasksInStatus.length > 0 
      ? Math.max(...tasksInStatus.map(t => t.order)) + 1 
      : 0;
  }
}
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
  private readonly PERFORMANCE_KEY = 'daily-tasks-performance';

  // Signal for all tasks
  private _tasks = signal<Task[]>([]);

  // Performance monitoring
  private performanceMetrics = {
    saveOperations: 0,
    loadOperations: 0,
    batchOperations: 0,
    dragDropOperations: 0,
    totalPersistenceTime: 0,
    lastOperationTime: 0,
    errors: 0
  };

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
    this.validateAndRepairOnInit();
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
   * Saves tasks to localStorage with enhanced error handling and performance monitoring
   */
  private saveTasks(): void {
    const startTime = performance.now();

    try {
      const tasksData = this._tasks().map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString()
      }));

      const dataString = JSON.stringify(tasksData);

      // Check localStorage quota before saving
      if (this.checkStorageQuota(dataString)) {
        localStorage.setItem(this.STORAGE_KEY, dataString);

        // Update performance metrics
        const duration = performance.now() - startTime;
        this.performanceMetrics.saveOperations++;
        this.performanceMetrics.totalPersistenceTime += duration;
        this.performanceMetrics.lastOperationTime = Date.now();

        console.log(`Successfully saved ${tasksData.length} tasks to localStorage in ${duration.toFixed(2)}ms`);
      } else {
        throw new Error('Insufficient localStorage space');
      }
    } catch (error) {
      this.performanceMetrics.errors++;
      console.error('Failed to save tasks to localStorage:', error);

      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
          throw new Error('Storage quota exceeded. Please clear some browser data and try again.');
        } else if (error.message.includes('Insufficient localStorage')) {
          throw new Error('Not enough storage space. Please free up some space and try again.');
        }
      }

      throw new Error('Failed to save tasks. Please check your browser storage settings.');
    }
  }

  /**
   * Checks if there's enough localStorage space for the data
   */
  private checkStorageQuota(dataString: string): boolean {
    try {
      // Estimate current usage
      let currentUsage = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          currentUsage += localStorage[key].length + key.length;
        }
      }

      // Estimate available space (most browsers have ~5-10MB limit)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes
      const dataSize = dataString.length * 2; // UTF-16 encoding

      return (currentUsage + dataSize) < (estimatedLimit * 0.9); // Use 90% of estimated limit
    } catch (error) {
      console.warn('Could not check storage quota:', error);
      return true; // Assume it's okay if we can't check
    }
  }

  /**
   * Loads tasks from localStorage with performance monitoring
   */
  private loadTasks(): void {
    const startTime = performance.now();

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const tasksData = JSON.parse(stored);
        const tasks: Task[] = tasksData.map((taskData: any) => ({
          ...taskData,
          createdAt: new Date(taskData.createdAt)
        }));
        this._tasks.set(tasks);

        // Update performance metrics
        const duration = performance.now() - startTime;
        this.performanceMetrics.loadOperations++;
        this.performanceMetrics.totalPersistenceTime += duration;

        console.log(`Successfully loaded ${tasks.length} tasks from localStorage in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      this.performanceMetrics.errors++;
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
   * Performs a batch update of multiple tasks atomically with performance monitoring
   * All updates succeed or all fail to maintain data consistency
   */
  batchUpdateTasks(updates: Array<{ id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> }>): Task[] {
    const startTime = performance.now();

    // Validate all tasks exist first
    const tasks = updates.map(update => {
      const task = this.getTask(update.id);
      if (!task) {
        throw new Error(`Task not found: ${update.id}`);
      }
      return task;
    });

    // Validate all updates
    updates.forEach(update => {
      if (update.updates.title !== undefined) {
        if (!update.updates.title.trim()) {
          throw new Error('Task title is required');
        }
        if (update.updates.title.length > 128) {
          throw new Error('Task title cannot exceed 128 characters');
        }
      }

      if (update.updates.description !== undefined && update.updates.description.length > 256) {
        throw new Error('Task description cannot exceed 256 characters');
      }
    });

    // Create a backup of current state for rollback
    const currentTasks = [...this._tasks()];

    try {
      // Apply all updates
      this._tasks.update(tasks => {
        const updatedTasks = [...tasks];

        updates.forEach(update => {
          const taskIndex = updatedTasks.findIndex(t => t.id === update.id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              ...update.updates,
              title: update.updates.title?.trim() || updatedTasks[taskIndex].title,
              description: update.updates.description?.trim()
            };
          }
        });

        return updatedTasks;
      });

      // Save to localStorage
      this.saveTasks();

      // Update performance metrics
      const duration = performance.now() - startTime;
      this.performanceMetrics.batchOperations++;
      this.performanceMetrics.totalPersistenceTime += duration;

      console.log(`Batch update of ${updates.length} tasks completed in ${duration.toFixed(2)}ms`);

      // Return updated tasks
      return updates.map(update => this.getTask(update.id)!);
    } catch (error) {
      this.performanceMetrics.errors++;
      // Rollback on any error
      this._tasks.set(currentTasks);
      throw error;
    }
  }

  /**
   * Handles drag and drop operation with atomic persistence and performance monitoring
   * Either all changes are saved or none are (maintains consistency)
   */
  handleDragDropOperation(operation: {
    type: 'reorder' | 'move';
    taskId: string;
    newStatus?: TaskStatusType;
    newOrder: number;
    affectedTasks: Array<{ id: string; newOrder: number }>;
  }): { success: boolean; error?: string; duration?: number } {
    const startTime = performance.now();

    try {
      const updates: Array<{ id: string; updates: Partial<Omit<Task, 'id' | 'createdAt'>> }> = [];

      // Add the main task update
      const mainUpdate: Partial<Omit<Task, 'id' | 'createdAt'>> = { order: operation.newOrder };
      if (operation.newStatus) {
        mainUpdate.status = operation.newStatus;
      }
      updates.push({ id: operation.taskId, updates: mainUpdate });

      // Add updates for all affected tasks
      operation.affectedTasks.forEach(task => {
        if (task.id !== operation.taskId) {
          updates.push({ id: task.id, updates: { order: task.newOrder } });
        }
      });

      // Perform atomic batch update
      this.batchUpdateTasks(updates);

      // Update performance metrics
      const duration = performance.now() - startTime;
      this.performanceMetrics.dragDropOperations++;
      this.performanceMetrics.totalPersistenceTime += duration;
      this.performanceMetrics.lastOperationTime = Date.now();

      console.log(`Drag & drop operation (${operation.type}) completed in ${duration.toFixed(2)}ms`);

      return { success: true, duration };
    } catch (error) {
      this.performanceMetrics.errors++;
      console.error('Drag and drop operation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * Validates task data integrity
   */
  validateTaskIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const tasks = this._tasks();

    // Check for duplicate IDs
    const ids = tasks.map(t => t.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate task IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for valid orders within each status
    Object.values(TaskStatus).forEach(status => {
      const statusTasks = tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
      statusTasks.forEach((task, index) => {
        if (task.order !== index) {
          errors.push(`Task ${task.id} has incorrect order ${task.order}, expected ${index} in status ${status}`);
        }
      });
    });

    // Check for valid task properties
    tasks.forEach(task => {
      if (!task.id) {
        errors.push('Task found without ID');
      }
      if (!task.title || task.title.trim().length === 0) {
        errors.push(`Task ${task.id} has empty title`);
      }
      if (task.title && task.title.length > 128) {
        errors.push(`Task ${task.id} title exceeds 128 characters`);
      }
      if (task.description && task.description.length > 256) {
        errors.push(`Task ${task.id} description exceeds 256 characters`);
      }
      if (!Object.values(TaskStatus).includes(task.status as TaskStatus)) {
        errors.push(`Task ${task.id} has invalid status: ${task.status}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Repairs task data if integrity issues are found
   */
  repairTaskIntegrity(): boolean {
    try {
      const tasks = [...this._tasks()];

      // Remove tasks with missing required data
      const validTasks = tasks.filter(task =>
        task.id &&
        task.title &&
        task.title.trim().length > 0 &&
        Object.values(TaskStatus).includes(task.status as TaskStatus)
      );

      // Fix orders within each status
      Object.values(TaskStatus).forEach(status => {
        const statusTasks = validTasks.filter(t => t.status === status);
        statusTasks.sort((a, b) => a.order - b.order);
        statusTasks.forEach((task, index) => {
          task.order = index;
        });
      });

      this._tasks.set(validTasks);
      this.saveTasks();
      return true;
    } catch (error) {
      console.error('Failed to repair task integrity:', error);
      return false;
    }
  }

  /**
   * Validates and repairs data integrity on service initialization
   */
  private validateAndRepairOnInit(): void {
    try {
      const validation = this.validateTaskIntegrity();
      if (!validation.isValid) {
        console.warn('TaskService: Data integrity issues found on initialization:', validation.errors);

        // Attempt automatic repair
        const repaired = this.repairTaskIntegrity();
        if (repaired) {
          console.log('TaskService: Data integrity issues automatically repaired');
        } else {
          console.error('TaskService: Failed to repair data integrity issues');
        }
      } else {
        console.log('TaskService: Data integrity validation passed on initialization');
      }
    } catch (error) {
      console.error('TaskService: Error during data integrity validation on init:', error);
    }
  }

  /**
   * Gets storage information and metrics
   */
  getStorageInfo(): {
    totalTasks: number;
    storageUsed: number;
    estimatedStorageLimit: number;
    storagePercentUsed: number;
    lastSaveTime: string;
  } {
    let storageUsed = 0;
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      storageUsed = data ? data.length * 2 : 0; // UTF-16 encoding
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
    }

    const estimatedLimit = 5 * 1024 * 1024; // 5MB
    const percentUsed = (storageUsed / estimatedLimit) * 100;

    return {
      totalTasks: this._tasks().length,
      storageUsed,
      estimatedStorageLimit: estimatedLimit,
      storagePercentUsed: Math.round(percentUsed * 100) / 100,
      lastSaveTime: new Date().toISOString()
    };
  }

  /**
   * Gets comprehensive performance metrics
   */
  getPerformanceMetrics(): {
    operations: {
      saveOperations: number;
      loadOperations: number;
      batchOperations: number;
      dragDropOperations: number;
      totalPersistenceTime: number;
      lastOperationTime: number;
      errors: number;
    };
    averagePersistenceTime: number;
    operationsPerMinute: number;
    successRate: number;
    lastOperationAgo: number;
  } {
    const totalOperations = this.performanceMetrics.saveOperations +
                           this.performanceMetrics.loadOperations +
                           this.performanceMetrics.batchOperations +
                           this.performanceMetrics.dragDropOperations;

    const averagePersistenceTime = totalOperations > 0
      ? this.performanceMetrics.totalPersistenceTime / totalOperations
      : 0;

    const successRate = totalOperations > 0
      ? ((totalOperations - this.performanceMetrics.errors) / totalOperations) * 100
      : 100;

    const lastOperationAgo = this.performanceMetrics.lastOperationTime > 0
      ? Date.now() - this.performanceMetrics.lastOperationTime
      : 0;

    // Estimate operations per minute (rough calculation)
    const operationsPerMinute = totalOperations > 0 && lastOperationAgo > 0
      ? (totalOperations / (lastOperationAgo / 60000))
      : 0;

    return {
      operations: { ...this.performanceMetrics },
      averagePersistenceTime: Math.round(averagePersistenceTime * 100) / 100,
      operationsPerMinute: Math.round(operationsPerMinute * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      lastOperationAgo
    };
  }

  /**
   * Resets performance metrics (useful for testing)
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      saveOperations: 0,
      loadOperations: 0,
      batchOperations: 0,
      dragDropOperations: 0,
      totalPersistenceTime: 0,
      lastOperationTime: 0,
      errors: 0
    };
    console.log('Performance metrics reset');
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

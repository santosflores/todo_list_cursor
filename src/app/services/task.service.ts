import { Injectable, signal, computed, inject } from '@angular/core';
import { Task } from '../models/task.model';
import { TaskStatus, TaskStatusType } from '../models/task-status.model';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Service for managing tasks with CRUD operations and localStorage persistence
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly STORAGE_KEY = 'daily-tasks';
  private readonly PERFORMANCE_KEY = 'daily-tasks-performance';
  private readonly VERSION_KEY = 'daily-tasks-version';
  private readonly CURRENT_VERSION = '1.0.0';

  private errorHandler = inject(ErrorHandlerService);

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
    this.handleDataMigration();
    this.loadTasks();
    this.validateAndRepairOnInit();
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for error recovery actions
   */
  private setupEventListeners(): void {
    window.addEventListener('cleanup-old-tasks', () => {
      this.cleanupOldTasks();
    });
  }

  /**
   * Handles data migration for schema changes between versions
   */
  private handleDataMigration(): void {
    try {
      const currentVersion = localStorage.getItem(this.VERSION_KEY);

      if (!currentVersion) {
        // First time user or legacy data without version
        this.migrateLegacyData();
        localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        console.log('TaskService: Initialized data version to', this.CURRENT_VERSION);
        return;
      }

      if (currentVersion !== this.CURRENT_VERSION) {
        console.log(`TaskService: Migration needed from ${currentVersion} to ${this.CURRENT_VERSION}`);
        this.migrateData(currentVersion, this.CURRENT_VERSION);
        localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
        console.log('TaskService: Migration completed successfully');
      } else {
        console.log('TaskService: Data version is current, no migration needed');
      }
    } catch (error) {
      console.error('TaskService: Error during data migration:', error);
      // Continue without migration - let validation handle any issues
    }
  }

  /**
   * Migrates legacy data (data without version) to current schema
   */
  private migrateLegacyData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return; // No data to migrate
      }

      const data = JSON.parse(stored);

      // Check if this looks like legacy task data (array of tasks without version wrapper)
      if (Array.isArray(data) && data.length > 0 && data[0].id) {
        console.log('TaskService: Detected legacy task data, performing migration');

        // Validate and clean up legacy data
        const migratedTasks = data.map((task: any, index: number) => ({
          id: task.id || `migrated_task_${Date.now()}_${index}`,
          title: task.title || 'Untitled Task',
          description: task.description || undefined,
          status: this.validateStatus(task.status) || TaskStatus.BACKLOG,
          createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          order: typeof task.order === 'number' ? task.order : index
        }));

        // Save migrated data
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(migratedTasks.map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString()
        }))));

        console.log(`TaskService: Successfully migrated ${migratedTasks.length} legacy tasks`);
      }
    } catch (error) {
      console.error('TaskService: Error migrating legacy data:', error);
      // If migration fails, clear the data to start fresh
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Migrates data between specific versions
   */
  private migrateData(fromVersion: string, toVersion: string): void {
    const migrations = this.getMigrationPath(fromVersion, toVersion);

    for (const migration of migrations) {
      try {
        migration.migrate();
        console.log(`TaskService: Applied migration ${migration.version}`);
      } catch (error) {
        console.error(`TaskService: Failed to apply migration ${migration.version}:`, error);
        throw new Error(`Migration failed at version ${migration.version}`);
      }
    }
  }

  /**
   * Gets the sequence of migrations needed to go from one version to another
   */
  private getMigrationPath(fromVersion: string, toVersion: string): Array<{
    version: string;
    migrate: () => void;
  }> {
    const migrations: Array<{ version: string; migrate: () => void }> = [
      // Future migrations would be added here
      // Example:
      // {
      //   version: '1.1.0',
      //   migrate: () => this.migrateToV1_1_0()
      // }
    ];

    return migrations.filter(migration =>
      this.compareVersions(migration.version, fromVersion) > 0 &&
      this.compareVersions(migration.version, toVersion) <= 0
    );
  }

  /**
   * Compares two semantic version strings
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  /**
   * Validates and normalizes a task status from potentially old data
   */
  private validateStatus(status: any): TaskStatus | null {
    if (typeof status === 'string') {
      // Handle old string formats
      switch (status.toLowerCase()) {
        case 'backlog':
        case 'todo':
        case 'pending':
          return TaskStatus.BACKLOG;
        case 'in-progress':
        case 'inprogress':
        case 'in_progress':
        case 'doing':
        case 'active':
          return TaskStatus.IN_PROGRESS;
        case 'done':
        case 'completed':
        case 'finished':
          return TaskStatus.DONE;
      }
    }

    // Check if it's already a valid TaskStatus enum value
    if (Object.values(TaskStatus).includes(status as TaskStatus)) {
      return status as TaskStatus;
    }

    return null;
  }

  /**
   * Example migration function for future use (commented out)
   */
  /*
  private migrateToV1_1_0(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;

    const tasks = JSON.parse(stored);

    // Example: Add new field to existing tasks
    const migratedTasks = tasks.map((task: any) => ({
      ...task,
      priority: task.priority || 'medium', // New field with default value
      tags: task.tags || [] // Another new field
    }));

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(migratedTasks));
  }
  */

  /**
   * Gets current data version and migration info
   */
  getDataVersion(): {
    currentVersion: string;
    storedVersion: string | null;
    migrationHistory: string[];
  } {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);

    // For now, migration history is simple, but could be expanded
    const migrationHistory: string[] = [];
    if (storedVersion && storedVersion !== this.CURRENT_VERSION) {
      migrationHistory.push(`Migrated from ${storedVersion} to ${this.CURRENT_VERSION}`);
    }

    return {
      currentVersion: this.CURRENT_VERSION,
      storedVersion,
      migrationHistory
    };
  }

  /**
   * Creates a new task with enhanced validation
   */
  createTask(title: string, description?: string): Task {
    try {
      // Use error handler for consistent validation
      this.errorHandler.validateTaskInput(title, description);

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
    } catch (error) {
      this.errorHandler.handleError(error, 'createTask', false);
      throw error; // Re-throw for component handling
    }
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
          ? { ...t, ...updates, title: updates.title !== undefined ? updates.title.trim() : t.title, description: updates.description !== undefined ? updates.description.trim() : t.description }
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

      this.errorHandler.handleStorageError(error);
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
              title: update.updates.title !== undefined ? update.updates.title.trim() : updatedTasks[taskIndex].title,
              description: update.updates.description !== undefined ? update.updates.description.trim() : updatedTasks[taskIndex].description
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
   * Reorders tasks in all columns to ensure consistent ordering
   */
  private reorderAllColumns(): void {
    Object.values(TaskStatus).forEach(status => {
      const tasksInColumn = this.getTasksByStatus(status);
      tasksInColumn.forEach((task, index) => {
        if (task.order !== index) {
          this.updateTask(task.id, { order: index });
        }
      });
    });
  }

  /**
   * Cleans up completed tasks older than specified days
   */
  cleanupOldTasks(daysOld: number = 30): { removedCount: number; spaceSaved: number } {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const currentTasks = this._tasks();
      const tasksToKeep = currentTasks.filter(task => {
        // Keep task if it's not done, or if it's done but not old enough
        return task.status !== TaskStatus.DONE || task.createdAt > cutoffDate;
      });

      const removedCount = currentTasks.length - tasksToKeep.length;
      const currentSize = JSON.stringify(currentTasks).length * 2; // UTF-16 encoding
      const newSize = JSON.stringify(tasksToKeep).length * 2;
      const spaceSaved = currentSize - newSize;

      if (removedCount > 0) {
        this._tasks.set(tasksToKeep);
        this.reorderAllColumns(); // Ensure proper ordering after cleanup
        this.saveTasks();

        console.log(`Cleaned up ${removedCount} old completed tasks, saved ${spaceSaved} bytes`);
      }

      return { removedCount, spaceSaved };
    } catch (error) {
      this.errorHandler.handleError(error, 'cleanupOldTasks');
      return { removedCount: 0, spaceSaved: 0 };
    }
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

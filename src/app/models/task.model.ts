import { TaskStatusType } from './task-status.model';

/**
 * Represents a task in the todo list application
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  
  /** Task title (max 128 characters) */
  title: string;
  
  /** Optional task description (max 256 characters) */
  description?: string;
  
  /** Current status of the task */
  status: TaskStatusType;
  
  /** Timestamp when the task was created */
  createdAt: Date;
  
  /** Order/position of the task within its column */
  order: number;
}
/**
 * Enum representing the possible status values for a task
 */
export enum TaskStatus {
  /** Task is in the backlog, not yet started */
  BACKLOG = 'backlog',
  
  /** Task is currently being worked on */
  IN_PROGRESS = 'in-progress',
  
  /** Task has been completed */
  DONE = 'done'
}

/**
 * Type alias for task status string literals
 */
export type TaskStatusType = 'backlog' | 'in-progress' | 'done';
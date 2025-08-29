import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';

/**
 * Component for displaying individual task cards with basic display logic
 */
@Component({
  selector: 'app-task-card',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-card" [class.task-backlog]="task().status === 'backlog'" 
         [class.task-in-progress]="task().status === 'in-progress'"
         [class.task-done]="task().status === 'done'">
      
      <div class="task-header">
        @if (isEditingTitle()) {
          <input
            #titleInput
            type="text"
            class="task-title-input"
            [(ngModel)]="editedTitle"
            (blur)="saveTitleEdit()"
            (keydown.enter)="saveTitleEdit()"
            (keydown.escape)="cancelTitleEdit()"
            maxlength="128"
            (click)="$event.stopPropagation()"
          />
        } @else {
          <h3 
            class="task-title clickable"
            (click)="startTitleEdit()"
            title="Click to edit">
            {{ task().title }}
          </h3>
        }
        <div class="task-actions">
          <button class="edit-btn" 
                  (click)="onEdit()" 
                  type="button"
                  title="Edit task">
            ✏️
          </button>
          <button class="delete-btn" 
                  (click)="onDelete()" 
                  type="button"
                  title="Delete task">
            ×
          </button>
        </div>
      </div>
      
      @if (isEditingDescription()) {
        <textarea
          #descriptionInput
          class="task-description-input"
          [(ngModel)]="editedDescription"
          (blur)="saveDescriptionEdit()"
          (keydown.escape)="cancelDescriptionEdit()"
          (keydown.ctrl.enter)="saveDescriptionEdit()"
          maxlength="256"
          placeholder="Enter task description..."
          rows="3"
          (click)="$event.stopPropagation()"
        ></textarea>
      } @else {
        @if (task().description) {
          <p 
            class="task-description clickable"
            (click)="startDescriptionEdit()"
            title="Click to edit">
            {{ task().description }}
          </p>
        } @else {
          <p 
            class="task-description-placeholder clickable"
            (click)="startDescriptionEdit()"
            title="Click to add description">
            Click to add description...
          </p>
        }
      }
      
      <div class="task-footer">
        <span class="task-status">{{ getStatusDisplay() }}</span>
        <time class="task-created" [dateTime]="task().createdAt.toISOString()">
          {{ getFormattedDate() }}
        </time>
      </div>
    </div>
  `,
  styles: [`
    .task-card {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      cursor: grab;
    }

    .task-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .task-card:active {
      cursor: grabbing;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .task-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      line-height: 1.4;
      flex: 1;
      word-wrap: break-word;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .task-title.clickable {
      cursor: pointer;
    }

    .task-title.clickable:hover {
      background-color: #f5f5f5;
    }

    .task-title-input {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      line-height: 1.4;
      flex: 1;
      border: 2px solid #2196F3;
      border-radius: 4px;
      padding: 4px 8px;
      background: white;
      outline: none;
      font-family: inherit;
    }

    .task-title-input:focus {
      border-color: #1976D2;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .task-actions {
      display: flex;
      gap: 4px;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .edit-btn,
    .delete-btn {
      background: none;
      border: none;
      color: #666;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .edit-btn:hover {
      background: #f5f5f5;
      color: #2196F3;
    }

    .delete-btn {
      font-size: 18px;
    }

    .delete-btn:hover {
      background: #f5f5f5;
      color: #d32f2f;
    }

    .task-description {
      margin: 0 0 12px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .task-description.clickable {
      cursor: pointer;
    }

    .task-description.clickable:hover {
      background-color: #f5f5f5;
    }

    .task-description-placeholder {
      margin: 0 0 12px 0;
      color: #999;
      font-size: 14px;
      line-height: 1.5;
      font-style: italic;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
      cursor: pointer;
    }

    .task-description-placeholder:hover {
      background-color: #f5f5f5;
      color: #777;
    }

    .task-description-input {
      margin: 0 0 12px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
      width: 100%;
      border: 2px solid #2196F3;
      border-radius: 4px;
      padding: 8px;
      background: white;
      outline: none;
      font-family: inherit;
      resize: vertical;
      min-height: 60px;
    }

    .task-description-input:focus {
      border-color: #1976D2;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }

    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #888;
    }

    .task-status {
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .task-backlog .task-status {
      background: #e3f2fd;
      color: #1976d2;
    }

    .task-in-progress .task-status {
      background: #fff3e0;
      color: #f57c00;
    }

    .task-done .task-status {
      background: #e8f5e8;
      color: #388e3c;
    }

    .task-created {
      font-style: italic;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCardComponent {
  // Input for the task data
  task = input.required<Task>();
  
  // Output events
  deleteTask = output<string>();
  updateTask = output<{ id: string; updates: Partial<Pick<Task, 'title' | 'description'>> }>();
  editTask = output<Task>();

  // Editing state
  isEditingTitle = signal(false);
  editedTitle = '';
  isEditingDescription = signal(false);
  editedDescription = '';

  /**
   * Formats the creation date for display
   */
  getFormattedDate(): string {
    const date = this.task().createdAt;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Gets display-friendly status text
   */
  getStatusDisplay(): string {
    const status = this.task().status;
    switch (status) {
      case 'backlog':
        return 'Backlog';
      case 'in-progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return status;
    }
  }

  /**
   * Handles task deletion
   */
  onDelete(): void {
    this.deleteTask.emit(this.task().id);
  }

  /**
   * Handles task editing - opens the modal
   */
  onEdit(): void {
    this.editTask.emit(this.task());
  }

  /**
   * Starts editing the task title
   */
  startTitleEdit(): void {
    this.editedTitle = this.task().title;
    this.isEditingTitle.set(true);
    
    // Focus the input after the view updates
    setTimeout(() => {
      const input = document.querySelector('.task-title-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  /**
   * Saves the title edit if valid
   */
  saveTitleEdit(): void {
    const trimmedTitle = this.editedTitle.trim();
    
    if (trimmedTitle && trimmedTitle !== this.task().title) {
      if (trimmedTitle.length <= 128) {
        this.updateTask.emit({
          id: this.task().id,
          updates: { title: trimmedTitle }
        });
      }
    }
    
    this.cancelTitleEdit();
  }

  /**
   * Cancels the title edit
   */
  cancelTitleEdit(): void {
    this.isEditingTitle.set(false);
    this.editedTitle = '';
  }

  /**
   * Starts editing the task description
   */
  startDescriptionEdit(): void {
    this.editedDescription = this.task().description || '';
    this.isEditingDescription.set(true);
    
    // Focus the textarea after the view updates
    setTimeout(() => {
      const textarea = document.querySelector('.task-description-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    });
  }

  /**
   * Saves the description edit if valid
   */
  saveDescriptionEdit(): void {
    const trimmedDescription = this.editedDescription.trim();
    const currentDescription = this.task().description || '';
    
    // Check if description actually changed
    if (trimmedDescription !== currentDescription) {
      if (trimmedDescription.length <= 256) {
        // If description is empty, pass undefined to remove it
        const descriptionValue = trimmedDescription || undefined;
        this.updateTask.emit({
          id: this.task().id,
          updates: { description: descriptionValue }
        });
      }
    }
    
    this.cancelDescriptionEdit();
  }

  /**
   * Cancels the description edit
   */
  cancelDescriptionEdit(): void {
    this.isEditingDescription.set(false);
    this.editedDescription = '';
  }
}
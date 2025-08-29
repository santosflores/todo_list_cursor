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
      background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
      border: 1px solid #e8edf2;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.06),
        0 1px 3px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: grab;
      position: relative;
      overflow: hidden;
    }

    .task-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #007bff 0%, #0056b3 100%);
      border-radius: 2px 0 0 2px;
    }

    .task-card.task-backlog::before {
      background: linear-gradient(180deg, #6c757d 0%, #495057 100%);
    }

    .task-card.task-in-progress::before {
      background: linear-gradient(180deg, #ffc107 0%, #ff8f00 100%);
    }

    .task-card.task-done::before {
      background: linear-gradient(180deg, #28a745 0%, #1e7e34 100%);
    }

    .task-card:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 
        0 8px 25px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      border-color: #d1d9e0;
    }

    .task-card:active {
      cursor: grabbing;
      transform: rotate(2deg) scale(1.03);
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .task-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #1a202c;
      line-height: 1.3;
      flex: 1;
      word-wrap: break-word;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: -0.01em;
    }

    .task-title.clickable {
      cursor: pointer;
    }

    .task-title.clickable:hover {
      background-color: rgba(0, 123, 255, 0.08);
      color: #0056b3;
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
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: #6c757d;
      font-size: 14px;
      cursor: pointer;
      padding: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(4px);
    }

    .edit-btn:hover {
      background: rgba(33, 150, 243, 0.1);
      border-color: rgba(33, 150, 243, 0.3);
      color: #1976D2;
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
    }

    .delete-btn {
      font-size: 16px;
    }

    .delete-btn:hover {
      background: rgba(244, 67, 54, 0.1);
      border-color: rgba(244, 67, 54, 0.3);
      color: #d32f2f;
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(244, 67, 54, 0.2);
    }

    .task-description {
      margin: 0 0 16px 0;
      color: #4a5568;
      font-size: 15px;
      line-height: 1.6;
      word-wrap: break-word;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .task-description.clickable {
      cursor: pointer;
    }

    .task-description.clickable:hover {
      background-color: rgba(0, 123, 255, 0.08);
      color: #2d3748;
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
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 6px 12px;
      border-radius: 16px;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .task-backlog .task-status {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      color: #1565c0;
      border-color: rgba(21, 101, 192, 0.2);
    }

    .task-in-progress .task-status {
      background: linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%);
      color: #ef6c00;
      border-color: rgba(239, 108, 0, 0.2);
    }

    .task-done .task-status {
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      color: #2e7d32;
      border-color: rgba(46, 125, 50, 0.2);
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
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
          <div class="editing-container">
            <input
              #titleInput
              type="text"
              class="task-title-input"
              [(ngModel)]="editedTitle"
              (input)="validateTitleRealTime()"
              (blur)="saveTitleEdit()"
              (keydown.enter)="saveTitleEdit()"
              (keydown.escape)="cancelTitleEdit()"
              maxlength="128"
              [class.error]="titleValidationError()"
              (click)="$event.stopPropagation()"
            />
            @if (titleValidationError()) {
              <div class="validation-error">{{ titleValidationError() }}</div>
            }
            <div class="char-counter" [class.warning]="editedTitle.length > 100" [class.error]="editedTitle.length > 128">{{ editedTitle.length }}/128</div>
          </div>
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
        <div class="editing-container">
          <textarea
            #descriptionInput
            class="task-description-input"
            [(ngModel)]="editedDescription"
            (input)="validateDescriptionRealTime()"
            (blur)="saveDescriptionEdit()"
            (keydown.escape)="cancelDescriptionEdit()"
            (keydown.ctrl.enter)="saveDescriptionEdit()"
            maxlength="256"
            [class.error]="descriptionValidationError()"
            placeholder="Enter task description..."
            rows="3"
            (click)="$event.stopPropagation()"
          ></textarea>
          @if (descriptionValidationError()) {
            <div class="validation-error">{{ descriptionValidationError() }}</div>
          }
                      <div class="char-counter" [class.warning]="editedDescription.length > 200" [class.error]="editedDescription.length > 256">{{ editedDescription.length }}/256</div>
        </div>
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
      margin-bottom: 12px;
      gap: 12px;
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
      transform: scale(1.02);
    }

    .task-title.clickable:active {
      transform: scale(0.98);
      background-color: rgba(0, 123, 255, 0.12);
    }

    .task-title-input {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #1a202c;
      line-height: 1.3;
      flex: 1;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      background: #ffffff;
      outline: none;
      font-family: inherit;
      letter-spacing: -0.01em;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .task-title-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      background: #fafbfc;
    }

    .task-actions {
      display: flex;
      gap: 6px;
      margin-left: 12px;
      flex-shrink: 0;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .task-card:hover .task-actions {
      opacity: 1;
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

    .edit-btn:active {
      transform: scale(1.05);
      box-shadow: 0 1px 4px rgba(33, 150, 243, 0.3);
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

    .delete-btn:active {
      transform: scale(1.05);
      box-shadow: 0 1px 4px rgba(244, 67, 54, 0.3);
    }

    .task-description {
      margin: 0 0 20px 0;
      color: #4a5568;
      font-size: 15px;
      line-height: 1.65;
      word-wrap: break-word;
      word-break: break-word;
      padding: 12px;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 400;
      text-align: left;
      hyphens: auto;
    }

    .task-description.clickable {
      cursor: pointer;
    }

    .task-description.clickable:hover {
      background-color: rgba(0, 123, 255, 0.08);
      color: #2d3748;
      transform: scale(1.01);
    }

    .task-description.clickable:active {
      transform: scale(0.99);
      background-color: rgba(0, 123, 255, 0.12);
    }

    .task-description-placeholder {
      margin: 0 0 20px 0;
      color: #a0aec0;
      font-size: 15px;
      line-height: 1.65;
      font-style: italic;
      padding: 12px;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: 2px dashed transparent;
    }

    .task-description-placeholder:hover {
      background-color: rgba(0, 123, 255, 0.04);
      color: #718096;
      border-color: rgba(0, 123, 255, 0.2);
      transform: scale(1.01);
    }

    .task-description-placeholder:active {
      transform: scale(0.99);
      background-color: rgba(0, 123, 255, 0.08);
      border-color: rgba(0, 123, 255, 0.3);
    }

    .task-description-input {
      margin: 0 0 20px 0;
      color: #4a5568;
      font-size: 15px;
      line-height: 1.65;
      width: 100%;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      background: #ffffff;
      outline: none;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 400;
    }

    .task-description-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      background: #fafbfc;
    }

    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #718096;
      margin-top: 4px;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.04);
      gap: 12px;
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
      font-style: normal;
      font-size: 11px;
      font-weight: 500;
      color: #a0aec0;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      transition: color 0.2s ease;
    }

    .task-footer:hover .task-created {
      color: #718096;
    }

    .task-footer:hover .task-status {
      transform: scale(1.05);
    }

    .editing-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .validation-error {
      color: #d32f2f;
      font-size: 11px;
      margin-top: 4px;
      font-weight: 500;
    }

    .char-counter {
      color: #888;
      font-size: 11px;
      margin-top: 4px;
      text-align: right;
      font-weight: 500;
    }

    .char-counter.warning {
      color: #ff9800;
    }

    .char-counter.error {
      color: #d32f2f;
    }

    .task-title-input.error {
      border-color: #d32f2f;
      box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
    }

    .task-description-input.error {
      border-color: #d32f2f;
      box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
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
  
  // Validation error signals
  titleValidationError = signal<string | null>(null);
  descriptionValidationError = signal<string | null>(null);

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
   * Validates title in real-time as user types
   */
  validateTitleRealTime(): void {
    const title = this.editedTitle.trim();
    
    if (!title) {
      this.titleValidationError.set('Title is required');
    } else if (title.length > 128) {
      this.titleValidationError.set('Title cannot exceed 128 characters');
    } else {
      this.titleValidationError.set(null);
    }
  }

  /**
   * Validates description in real-time as user types
   */
  validateDescriptionRealTime(): void {
    if (this.editedDescription.length > 256) {
      this.descriptionValidationError.set('Description cannot exceed 256 characters');
    } else {
      this.descriptionValidationError.set(null);
    }
  }

  /**
   * Starts editing the task title
   */
  startTitleEdit(): void {
    this.editedTitle = this.task().title;
    this.titleValidationError.set(null);
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
    
    // Validate before saving
    if (!trimmedTitle) {
      this.titleValidationError.set('Title is required');
      return; // Don't close the edit mode, let user fix the error
    }
    
    if (trimmedTitle.length > 128) {
      this.titleValidationError.set('Title cannot exceed 128 characters');
      return; // Don't close the edit mode, let user fix the error
    }
    
    // Only save if there's actually a change
    if (trimmedTitle !== this.task().title) {
      this.updateTask.emit({
        id: this.task().id,
        updates: { title: trimmedTitle }
      });
    }
    
    this.cancelTitleEdit();
  }

  /**
   * Cancels the title edit
   */
  cancelTitleEdit(): void {
    this.isEditingTitle.set(false);
    this.titleValidationError.set(null);
    this.editedTitle = '';
  }

  /**
   * Starts editing the task description
   */
  startDescriptionEdit(): void {
    this.editedDescription = this.task().description || '';
    this.descriptionValidationError.set(null);
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
    
    // Validate before saving
    if (this.editedDescription.length > 256) {
      this.descriptionValidationError.set('Description cannot exceed 256 characters');
      return; // Don't close the edit mode, let user fix the error
    }
    
    const currentDescription = this.task().description || '';
    
    // Only save if there's actually a change
    if (trimmedDescription !== currentDescription) {
      // If description is empty, pass undefined to remove it
      const descriptionValue = trimmedDescription || undefined;
      this.updateTask.emit({
        id: this.task().id,
        updates: { description: descriptionValue }
      });
    }
    
    this.cancelDescriptionEdit();
  }

  /**
   * Cancels the description edit
   */
  cancelDescriptionEdit(): void {
    this.isEditingDescription.set(false);
    this.descriptionValidationError.set(null);
    this.editedDescription = '';
  }
}
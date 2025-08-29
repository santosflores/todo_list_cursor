import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { TaskStatusType } from '../../models/task-status.model';

/**
 * Modal component for comprehensive task editing
 */
@Component({
  selector: 'app-task-edit-modal',
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ task() ? 'Edit Task' : 'Create Task' }}
            </h2>
            <button
              class="modal-close-btn"
              (click)="onCancel()"
              type="button"
              title="Close modal"
            >
              ×
            </button>
          </div>

          <form class="modal-form" (ngSubmit)="onSave()" #taskForm="ngForm">
            <div class="form-group">
              <label for="task-title" class="form-label">
                Title *
                <span class="char-count">{{ titleCharCount() }}/128</span>
              </label>
              <input
                id="task-title"
                type="text"
                class="form-input"
                [(ngModel)]="formData.title"
                (input)="onTitleChange($event)"
                name="title"
                required
                maxlength="128"
                placeholder="Enter task title..."
                [class.error]="titleError()"
                #titleRef="ngModel"
              />
              @if (titleError()) {
                <div class="error-message">{{ titleError() }}</div>
              }
            </div>

            <div class="form-group">
              <label for="task-description" class="form-label">
                Description
                <span class="char-count">{{ descriptionCharCount() }}/256</span>
              </label>
              <textarea
                id="task-description"
                class="form-textarea"
                [(ngModel)]="formData.description"
                (input)="onDescriptionChange($event)"
                name="description"
                maxlength="256"
                placeholder="Enter task description..."
                rows="4"
                [class.error]="descriptionError()"
                #descriptionRef="ngModel"
              ></textarea>
              @if (descriptionError()) {
                <div class="error-message">{{ descriptionError() }}</div>
              }
            </div>

            <div class="form-group">
              <label for="task-status" class="form-label">Status</label>
                              <select
                  id="task-status"
                  class="form-select"
                  [(ngModel)]="formData.status"
                  (change)="onStatusChange($event)"
                  name="status"
                >
                <option value="backlog">Backlog</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="onCancel()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="!isFormValid()"
              >
                {{ buttonText() }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      backdrop-filter: blur(2px);
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e1e5e9;
    }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .modal-close-btn:hover {
      background: #f5f5f5;
      color: #d32f2f;
    }

    .modal-form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .char-count {
      font-size: 12px;
      color: #888;
      font-weight: normal;
    }

    .form-input,
    .form-textarea,
    .form-select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e5e9;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      outline: none;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      border-color: #2196F3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    .form-input.error,
    .form-textarea.error {
      border-color: #d32f2f;
    }

    .form-input.error:focus,
    .form-textarea.error:focus {
      box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .error-message {
      color: #d32f2f;
      font-size: 12px;
      margin-top: 4px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e1e5e9;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      outline: none;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #666;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .btn-primary {
      background: #2196F3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1976D2;
    }

    @media (max-width: 540px) {
      .modal-overlay {
        padding: 10px;
      }

      .modal-header,
      .modal-form {
        padding: 16px;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskEditModalComponent {
  // Input props
  task = input<Task | null>(null);
  isOpen = input<boolean>(false);

  // Output events
  save = output<{ task: Task | null; updates: Partial<Pick<Task, 'title' | 'description' | 'status'>> }>();
  cancel = output<void>();

  // Form data as signals
  private formTitle = signal('');
  private formDescription = signal('');
  private formStatus = signal<TaskStatusType>('backlog');

  // Form data object for template binding
  formData = {
    title: '',
    description: '',
    status: 'backlog' as TaskStatusType
  };

  // Form validation
  private validationErrors = signal<{ title?: string; description?: string }>({});

  // Computed properties for character counts
  titleCharCount = computed(() => this.formTitle().length);
  descriptionCharCount = computed(() => this.formDescription().length);

  // Computed validation states
  titleError = computed(() => this.validationErrors().title);
  descriptionError = computed(() => this.validationErrors().description);

  // Computed button text
  buttonText = computed(() => {
    const task = this.task();
    const text = task ? 'Update Task' : 'Create Task';
    console.log('TaskEditModal: Button text computed - task:', task, 'text:', text);
    return text;
  });

  /**
   * Handles title input changes
   */
  onTitleChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.formTitle.set(value);
    this.formData.title = value;
    this.validateFormRealTime();
  }

  /**
   * Handles description input changes
   */
  onDescriptionChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.formDescription.set(value);
    this.formData.description = value;
    this.validateFormRealTime();
  }

  /**
   * Handles status select changes
   */
  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as TaskStatusType;
    this.formStatus.set(value);
    this.formData.status = value;
  }

  constructor(private cdr: ChangeDetectorRef) {
    // Initialize form when modal opens or task changes
    effect(() => {
      const isOpen = this.isOpen();
      const task = this.task();
      console.log('TaskEditModal: Effect triggered - isOpen:', isOpen, 'task:', task);

      if (isOpen) {
        console.log('TaskEditModal: Modal is open, initializing form...');
        this.initializeForm();
        this.cdr.detectChanges();
      } else {
        console.log('TaskEditModal: Modal is closed');
      }
    });
  }

  /**
   * Initializes the form with task data
   */
  private initializeForm(): void {
    const currentTask = this.task();
    console.log('TaskEditModal: Initializing form with task:', currentTask);

    if (currentTask) {
      const title = currentTask.title;
      const description = currentTask.description || '';
      const status = currentTask.status;
      
      this.formTitle.set(title);
      this.formDescription.set(description);
      this.formStatus.set(status);
      
      this.formData = {
        title: title,
        description: description,
        status: status
      };
      
      console.log('TaskEditModal: Form data set for editing:', { 
        title: this.formTitle(), 
        description: this.formDescription(), 
        status: this.formStatus() 
      });
    } else {
      this.formTitle.set('');
      this.formDescription.set('');
      this.formStatus.set('backlog');
      
      this.formData = {
        title: '',
        description: '',
        status: 'backlog'
      };
      
      console.log('TaskEditModal: Form data set for creating:', { 
        title: this.formTitle(), 
        description: this.formDescription(), 
        status: this.formStatus() 
      });
    }
    this.clearValidationErrors();
  }

  /**
   * Validates the form in real-time as user types
   */
  validateFormRealTime(): void {
    // Use a small timeout to debounce validation
    setTimeout(() => {
      this.isFormValid();
    }, 50);
  }

  /**
   * Validates the form and returns whether it's valid
   */
  isFormValid(): boolean {
    const errors: { title?: string; description?: string } = {};

    // Validate title
    const title = this.formTitle().trim();
    if (!title) {
      errors.title = 'Task title is required';
    } else if (title.length > 128) {
      errors.title = 'Title cannot exceed 128 characters';
    }

    // Validate description
    if (this.formDescription().length > 256) {
      errors.description = 'Description cannot exceed 256 characters';
    }

    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Clears validation errors
   */
  private clearValidationErrors(): void {
    this.validationErrors.set({});
  }

  /**
   * Handles form submission
   */
  onSave(): void {
    console.log('TaskEditModal: onSave called, formData:', {
      title: this.formTitle(),
      description: this.formDescription(),
      status: this.formStatus()
    });

    if (!this.isFormValid()) {
      console.log('TaskEditModal: Form validation failed');
      return;
    }

    const updates: Partial<Pick<Task, 'title' | 'description' | 'status'>> = {
      title: this.formTitle().trim(),
      description: this.formDescription().trim() || undefined,
      status: this.formStatus()
    };

    console.log('TaskEditModal: Emitting save event with updates:', updates);
    this.save.emit({
      task: this.task(),
      updates
    });
  }

  /**
   * Handles cancel action
   */
  onCancel(): void {
    this.initializeForm();
    this.cancel.emit();
  }

  /**
   * Handles clicking on the modal overlay
   */
  onOverlayClick(event: MouseEvent): void {
    // Close modal when clicking on overlay
    this.onCancel();
  }
}

import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TaskService } from './services/task.service';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ReactiveFormsModule, KanbanBoardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Todo App';
  
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  
  // Form for creating new tasks
  taskForm: FormGroup;
  
  // Signals for reactive data
  showForm = signal(false);
  
  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(128)]],
      description: ['', [Validators.maxLength(256)]]
    });
  }
  
  /**
   * Shows the task creation form
   */
  showTaskForm(): void {
    this.showForm.set(true);
  }
  
  /**
   * Hides the task creation form
   */
  hideTaskForm(): void {
    this.showForm.set(false);
    this.taskForm.reset();
  }
  
  /**
   * Creates a new task from the form
   */
  createTask(): void {
    if (this.taskForm.valid) {
      const { title, description } = this.taskForm.value;
      try {
        this.taskService.createTask(title, description);
        this.hideTaskForm();
      } catch (error) {
        console.error('Error creating task:', error);
        // TODO: Show toast notification for error
      }
    }
  }
  

  
  /**
   * Gets validation error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.taskForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['maxlength']) {
        const maxLength = field.errors['maxlength'].requiredLength;
        return `${fieldName} cannot exceed ${maxLength} characters`;
      }
    }
    return '';
  }
}

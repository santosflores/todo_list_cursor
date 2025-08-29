import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { TaskService } from './services/task.service';
import { TaskCardComponent } from './components/task-card/task-card.component';
import { Task } from './models/task.model';
import { TaskStatus } from './models/task-status.model';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let taskService: jasmine.SpyObj<TaskService>;
  let mockTasks: Task[];

  beforeEach(async () => {
    // Create mock tasks
    mockTasks = [
      {
        id: '1',
        title: 'Test Task 1',
        description: 'Test Description 1',
        status: TaskStatus.BACKLOG,
        createdAt: new Date('2024-01-01'),
        order: 0
      },
      {
        id: '2',
        title: 'Test Task 2',
        description: 'Test Description 2',
        status: TaskStatus.IN_PROGRESS,
        createdAt: new Date('2024-01-02'),
        order: 0
      }
    ];

    // Create spy object for TaskService
    const taskServiceSpy = jasmine.createSpyObj('TaskService', 
      ['createTask', 'deleteTask', 'getTask'], 
      {
        allTasks: jasmine.createSpy().and.returnValue(mockTasks)
      }
    );

    await TestBed.configureTestingModule({
      imports: [AppComponent, ReactiveFormsModule, TaskCardComponent],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct title', () => {
    expect(component.title).toEqual('Todo App');
  });

  it('should render the app title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Todo App');
  });

  it('should show "Add Task" button when form is hidden', () => {
    component.showForm.set(false);
    fixture.detectChanges();
    
    const addButton = fixture.nativeElement.querySelector('.btn-primary');
    expect(addButton?.textContent?.trim()).toBe('Add Task');
    expect(addButton?.classList.contains('hidden')).toBeFalsy();
  });

  it('should hide "Add Task" button when form is shown', () => {
    component.showForm.set(true);
    fixture.detectChanges();
    
    const addButton = fixture.nativeElement.querySelector('.btn-primary');
    expect(addButton?.classList.contains('hidden')).toBeTruthy();
  });

  it('should show task creation form when showTaskForm is called', () => {
    component.showTaskForm();
    expect(component.showForm()).toBeTruthy();
  });

  it('should hide task creation form when hideTaskForm is called', () => {
    component.showForm.set(true);
    component.hideTaskForm();
    expect(component.showForm()).toBeFalsy();
  });

  it('should reset form when hideTaskForm is called', () => {
    component.taskForm.patchValue({ title: 'Test', description: 'Test desc' });
    component.hideTaskForm();
    expect(component.taskForm.value.title).toBe('');
    expect(component.taskForm.value.description).toBe('');
  });

  it('should create task when form is valid and submitted', () => {
    const newTask: Task = {
      id: '3',
      title: 'New Task',
      description: 'New Description',
      status: TaskStatus.BACKLOG,
      createdAt: new Date(),
      order: 0
    };
    
    taskService.createTask.and.returnValue(newTask);
    
    component.taskForm.patchValue({
      title: 'New Task',
      description: 'New Description'
    });
    
    component.createTask();
    
    expect(taskService.createTask).toHaveBeenCalledWith('New Task', 'New Description');
    expect(component.showForm()).toBeFalsy();
  });

  it('should not create task when form is invalid', () => {
    component.taskForm.patchValue({ title: '', description: 'Test' });
    component.createTask();
    expect(taskService.createTask).not.toHaveBeenCalled();
  });

  it('should handle task creation errors gracefully', () => {
    taskService.createTask.and.throwError('Creation failed');
    spyOn(console, 'error');
    
    component.taskForm.patchValue({ title: 'Test', description: 'Test' });
    component.createTask();
    
    expect(console.error).toHaveBeenCalledWith('Error creating task:', jasmine.any(Error));
    expect(component.showForm()).toBeTruthy(); // Form should remain open on error
  });

  // Note: Task deletion is handled by KanbanBoardComponent, not AppComponent
  // These tests would be more appropriate in kanban-board.component.spec.ts

  describe('Form Validation', () => {
    it('should return required error for empty title', () => {
      component.taskForm.patchValue({ title: '' });
      component.taskForm.markAllAsTouched();
      
      const error = component.getErrorMessage('title');
      expect(error).toBe('title is required');
    });

    it('should return maxlength error for title exceeding 128 characters', () => {
      const longTitle = 'a'.repeat(129);
      component.taskForm.patchValue({ title: longTitle });
      component.taskForm.markAllAsTouched();
      
      const error = component.getErrorMessage('title');
      expect(error).toBe('title cannot exceed 128 characters');
    });

    it('should return maxlength error for description exceeding 256 characters', () => {
      const longDescription = 'a'.repeat(257);
      component.taskForm.patchValue({ description: longDescription });
      component.taskForm.markAllAsTouched();
      
      const error = component.getErrorMessage('description');
      expect(error).toBe('description cannot exceed 256 characters');
    });

    it('should return empty string when field is valid', () => {
      component.taskForm.patchValue({ title: 'Valid title' });
      
      const error = component.getErrorMessage('title');
      expect(error).toBe('');
    });
  });

  describe('Task Display', () => {
    it('should show empty state when no tasks exist', () => {
      // Mock empty tasks array
      Object.defineProperty(taskService, 'allTasks', {
        get: () => jasmine.createSpy().and.returnValue([])
      });
      
      fixture.detectChanges();
      
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState?.textContent?.trim()).toContain('No tasks yet');
    });

    it('should display task count when tasks exist', () => {
      fixture.detectChanges();
      
      const taskListHeader = fixture.nativeElement.querySelector('.tasks-list h2');
      expect(taskListHeader?.textContent?.trim()).toContain('All Tasks (2)');
    });
  });
});

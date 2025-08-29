import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TaskCardComponent } from './task-card.component';
import { Task } from '../../models/task.model';
import { TaskStatus } from '../../models/task-status.model';

describe('TaskCardComponent - Validation Features', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;
  let mockTask: Task;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;

    mockTask = {
      id: '1',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.BACKLOG,
      createdAt: new Date(),
      order: 0
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  describe('Title Validation', () => {
    it('should show error for empty title', () => {
      component.startTitleEdit();
      component.editedTitle = '   ';
      component.validateTitleRealTime();

      expect(component.titleValidationError()).toBe('Title is required');
    });

    it('should show error for title exceeding 128 characters', () => {
      component.startTitleEdit();
      component.editedTitle = 'a'.repeat(129);
      component.validateTitleRealTime();

      expect(component.titleValidationError()).toBe('Title cannot exceed 128 characters');
    });

    it('should clear error for valid title', () => {
      component.startTitleEdit();
      component.editedTitle = 'Valid Title';
      component.validateTitleRealTime();

      expect(component.titleValidationError()).toBeNull();
    });

    it('should prevent saving with validation errors', () => {
      spyOn(component.updateTask, 'emit');
      
      component.startTitleEdit();
      component.editedTitle = ''; // Empty title
      component.saveTitleEdit();

      expect(component.updateTask.emit).not.toHaveBeenCalled();
      expect(component.isEditingTitle()).toBe(true); // Should stay in edit mode
      expect(component.titleValidationError()).toBe('Title is required');
    });

    it('should save valid title changes', () => {
      spyOn(component.updateTask, 'emit');
      
      component.startTitleEdit();
      component.editedTitle = 'New Valid Title';
      component.saveTitleEdit();

      expect(component.updateTask.emit).toHaveBeenCalledWith({
        id: '1',
        updates: { title: 'New Valid Title' }
      });
      expect(component.isEditingTitle()).toBe(false);
    });

    it('should clear validation errors when canceling edit', () => {
      component.startTitleEdit();
      component.editedTitle = '';
      component.validateTitleRealTime();
      
      expect(component.titleValidationError()).toBe('Title is required');
      
      component.cancelTitleEdit();
      
      expect(component.titleValidationError()).toBeNull();
    });
  });

  describe('Description Validation', () => {
    it('should show error for description exceeding 256 characters', () => {
      component.startDescriptionEdit();
      component.editedDescription = 'a'.repeat(257);
      component.validateDescriptionRealTime();

      expect(component.descriptionValidationError()).toBe('Description cannot exceed 256 characters');
    });

    it('should clear error for valid description', () => {
      component.startDescriptionEdit();
      component.editedDescription = 'Valid description';
      component.validateDescriptionRealTime();

      expect(component.descriptionValidationError()).toBeNull();
    });

    it('should prevent saving with validation errors', () => {
      spyOn(component.updateTask, 'emit');
      
      component.startDescriptionEdit();
      component.editedDescription = 'a'.repeat(257); // Too long
      component.saveDescriptionEdit();

      expect(component.updateTask.emit).not.toHaveBeenCalled();
      expect(component.isEditingDescription()).toBe(true); // Should stay in edit mode
      expect(component.descriptionValidationError()).toBe('Description cannot exceed 256 characters');
    });

    it('should save valid description changes', () => {
      spyOn(component.updateTask, 'emit');
      
      component.startDescriptionEdit();
      component.editedDescription = 'New valid description';
      component.saveDescriptionEdit();

      expect(component.updateTask.emit).toHaveBeenCalledWith({
        id: '1',
        updates: { description: 'New valid description' }
      });
      expect(component.isEditingDescription()).toBe(false);
    });

    it('should clear validation errors when canceling edit', () => {
      component.startDescriptionEdit();
      component.editedDescription = 'a'.repeat(257);
      component.validateDescriptionRealTime();
      
      expect(component.descriptionValidationError()).toBe('Description cannot exceed 256 characters');
      
      component.cancelDescriptionEdit();
      
      expect(component.descriptionValidationError()).toBeNull();
    });
  });

  describe('Character Counter Display', () => {
    it('should display correct character count for title', () => {
      component.startTitleEdit();
      component.editedTitle = 'Test';
      fixture.detectChanges();

      const charCounter = fixture.nativeElement.querySelector('.char-counter');
      expect(charCounter.textContent).toBe('4/128');
    });

    it('should display correct character count for description', () => {
      component.startDescriptionEdit();
      component.editedDescription = 'Test description';
      fixture.detectChanges();

      const charCounter = fixture.nativeElement.querySelector('.char-counter');
      expect(charCounter.textContent).toBe('16/256');
    });

    it('should apply warning class when title approaches limit', () => {
      component.startTitleEdit();
      component.editedTitle = 'a'.repeat(110); // > 100 characters
      fixture.detectChanges();

      const charCounter = fixture.nativeElement.querySelector('.char-counter');
      expect(charCounter.classList.contains('warning')).toBe(true);
    });

    it('should apply error class when title exceeds limit', () => {
      component.startTitleEdit();
      component.editedTitle = 'a'.repeat(130); // > 128 characters
      fixture.detectChanges();

      const charCounter = fixture.nativeElement.querySelector('.char-counter');
      expect(charCounter.classList.contains('error')).toBe(true);
    });
  });
});
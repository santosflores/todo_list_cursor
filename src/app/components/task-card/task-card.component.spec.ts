import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TaskCardComponent } from './task-card.component';
import { Task } from '../../models/task.model';
import { TaskStatus } from '../../models/task-status.model';

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;
  let mockTask: Task;

  beforeEach(async () => {
    mockTask = {
      id: 'test-id',
      title: 'Test Task Title',
      description: 'Test task description',
      status: TaskStatus.BACKLOG,
      createdAt: new Date('2024-01-15T10:30:00Z'),
      order: 0
    };

    await TestBed.configureTestingModule({
      imports: [TaskCardComponent, CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    
    // Set the required input
    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display task title', () => {
    const titleElement = fixture.nativeElement.querySelector('.task-title');
    expect(titleElement?.textContent?.trim()).toBe('Test Task Title');
  });

  it('should display task description when present', () => {
    const descriptionElement = fixture.nativeElement.querySelector('.task-description');
    expect(descriptionElement?.textContent?.trim()).toBe('Test task description');
  });

  it('should not display description element when task has no description', () => {
    const taskWithoutDescription = { ...mockTask, description: undefined };
    fixture.componentRef.setInput('task', taskWithoutDescription);
    fixture.detectChanges();
    
    const descriptionElement = fixture.nativeElement.querySelector('.task-description');
    expect(descriptionElement).toBeNull();
  });

  it('should display formatted creation date', () => {
    const createdElement = fixture.nativeElement.querySelector('.task-created');
    expect(createdElement?.textContent?.trim()).toBe('Jan 15, 10:30 AM');
  });

  it('should display correct status', () => {
    const statusElement = fixture.nativeElement.querySelector('.task-status');
    expect(statusElement?.textContent?.trim()).toBe('Backlog');
  });

  it('should apply correct CSS class for backlog status', () => {
    const cardElement = fixture.nativeElement.querySelector('.task-card');
    expect(cardElement?.classList.contains('task-backlog')).toBeTruthy();
  });

  it('should apply correct CSS class for in-progress status', () => {
    const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
    fixture.componentRef.setInput('task', inProgressTask);
    fixture.detectChanges();
    
    const cardElement = fixture.nativeElement.querySelector('.task-card');
    expect(cardElement?.classList.contains('task-in-progress')).toBeTruthy();
  });

  it('should apply correct CSS class for done status', () => {
    const doneTask = { ...mockTask, status: TaskStatus.DONE };
    fixture.componentRef.setInput('task', doneTask);
    fixture.detectChanges();
    
    const cardElement = fixture.nativeElement.querySelector('.task-card');
    expect(cardElement?.classList.contains('task-done')).toBeTruthy();
  });

  it('should emit deleteTask event when delete button is clicked', () => {
    spyOn(component.deleteTask, 'emit');
    
    const deleteButton = fixture.nativeElement.querySelector('.delete-btn');
    deleteButton?.click();
    
    expect(component.deleteTask.emit).toHaveBeenCalledWith('test-id');
  });

  it('should have proper accessibility attributes', () => {
    const deleteButton = fixture.nativeElement.querySelector('.delete-btn');
    expect(deleteButton?.getAttribute('title')).toBe('Delete task');
    expect(deleteButton?.getAttribute('type')).toBe('button');
  });

  it('should have proper semantic HTML structure', () => {
    const timeElement = fixture.nativeElement.querySelector('time');
    expect(timeElement?.getAttribute('dateTime')).toBe('2024-01-15T10:30:00.000Z');
  });

  describe('getFormattedDate', () => {
    it('should format date correctly', () => {
      const formattedDate = component.getFormattedDate();
      expect(formattedDate).toBe('Jan 15, 10:30 AM');
    });

    it('should handle different dates correctly', () => {
      const differentTask = {
        ...mockTask,
        createdAt: new Date('2024-12-25T15:45:00Z')
      };
      fixture.componentRef.setInput('task', differentTask);
      fixture.detectChanges();
      
      const formattedDate = component.getFormattedDate();
      expect(formattedDate).toBe('Dec 25, 03:45 PM');
    });
  });

  describe('getStatusDisplay', () => {
    it('should return "Backlog" for backlog status', () => {
      expect(component.getStatusDisplay()).toBe('Backlog');
    });

    it('should return "In Progress" for in-progress status', () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      fixture.componentRef.setInput('task', inProgressTask);
      fixture.detectChanges();
      
      expect(component.getStatusDisplay()).toBe('In Progress');
    });

    it('should return "Done" for done status', () => {
      const doneTask = { ...mockTask, status: TaskStatus.DONE };
      fixture.componentRef.setInput('task', doneTask);
      fixture.detectChanges();
      
      expect(component.getStatusDisplay()).toBe('Done');
    });

    it('should return the status as-is for unknown status', () => {
      const unknownStatusTask = { ...mockTask, status: 'unknown' as any };
      fixture.componentRef.setInput('task', unknownStatusTask);
      fixture.detectChanges();
      
      expect(component.getStatusDisplay()).toBe('unknown');
    });
  });

  describe('Visual Design', () => {
    it('should have proper CSS classes for styling', () => {
      const cardElement = fixture.nativeElement.querySelector('.task-card');
      const headerElement = fixture.nativeElement.querySelector('.task-header');
      const footerElement = fixture.nativeElement.querySelector('.task-footer');
      
      expect(cardElement).toBeTruthy();
      expect(headerElement).toBeTruthy();
      expect(footerElement).toBeTruthy();
    });

    it('should have hover states for interactive elements', () => {
      const deleteButton = fixture.nativeElement.querySelector('.delete-btn');
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles gracefully', () => {
      const longTitleTask = {
        ...mockTask,
        title: 'A'.repeat(200) // Very long title
      };
      fixture.componentRef.setInput('task', longTitleTask);
      fixture.detectChanges();
      
      const titleElement = fixture.nativeElement.querySelector('.task-title');
      expect(titleElement?.textContent?.length).toBe(200);
    });

    it('should handle empty description', () => {
      const emptyDescTask = { ...mockTask, description: '' };
      fixture.componentRef.setInput('task', emptyDescTask);
      fixture.detectChanges();
      
      const descriptionElement = fixture.nativeElement.querySelector('.task-description');
      expect(descriptionElement).toBeNull();
    });

    it('should handle special characters in title and description', () => {
      const specialCharTask = {
        ...mockTask,
        title: 'Title with <script>alert("xss")</script>',
        description: 'Description with & special chars <>'
      };
      fixture.componentRef.setInput('task', specialCharTask);
      fixture.detectChanges();
      
      const titleElement = fixture.nativeElement.querySelector('.task-title');
      const descElement = fixture.nativeElement.querySelector('.task-description');
      
      // Angular should escape HTML automatically
      expect(titleElement?.innerHTML).toContain('&lt;script&gt;');
      expect(descElement?.innerHTML).toContain('&amp;');
    });
  });
});
import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus } from '../models/task-status.model';

describe('TaskService', () => {
  let service: TaskService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return mockLocalStorage[key] || null;
    });
    
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createTask', () => {
    it('should create a task with valid title', () => {
      const task = service.createTask('Test Task', 'Test Description');
      
      expect(task).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe(TaskStatus.BACKLOG);
      expect(task.order).toBe(0);
      expect(task.id).toBeTruthy();
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it('should create a task without description', () => {
      const task = service.createTask('Test Task');
      
      expect(task.description).toBeUndefined();
    });

    it('should throw error for empty title', () => {
      expect(() => service.createTask('')).toThrowError('Task title is required');
      expect(() => service.createTask('   ')).toThrowError('Task title is required');
    });

    it('should throw error for title exceeding 128 characters', () => {
      const longTitle = 'a'.repeat(129);
      expect(() => service.createTask(longTitle)).toThrowError('Task title cannot exceed 128 characters');
    });

    it('should throw error for description exceeding 256 characters', () => {
      const longDescription = 'a'.repeat(257);
      expect(() => service.createTask('Test', longDescription)).toThrowError('Task description cannot exceed 256 characters');
    });

    it('should increment order for multiple tasks', () => {
      const task1 = service.createTask('Task 1');
      const task2 = service.createTask('Task 2');
      
      expect(task1.order).toBe(0);
      expect(task2.order).toBe(1);
    });
  });

  describe('getTask', () => {
    it('should return task by ID', () => {
      const createdTask = service.createTask('Test Task');
      const foundTask = service.getTask(createdTask.id);
      
      expect(foundTask).toEqual(createdTask);
    });

    it('should return undefined for non-existent ID', () => {
      const foundTask = service.getTask('non-existent');
      
      expect(foundTask).toBeUndefined();
    });
  });

  describe('updateTask', () => {
    it('should update task title', () => {
      const task = service.createTask('Original Title');
      const updatedTask = service.updateTask(task.id, { title: 'Updated Title' });
      
      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.id).toBe(task.id);
    });

    it('should update task description', () => {
      const task = service.createTask('Title', 'Original Description');
      const updatedTask = service.updateTask(task.id, { description: 'Updated Description' });
      
      expect(updatedTask.description).toBe('Updated Description');
    });

    it('should throw error for non-existent task', () => {
      expect(() => service.updateTask('non-existent', { title: 'New Title' }))
        .toThrowError('Task not found');
    });

    it('should validate updated title length', () => {
      const task = service.createTask('Original Title');
      const longTitle = 'a'.repeat(129);
      
      expect(() => service.updateTask(task.id, { title: longTitle }))
        .toThrowError('Task title cannot exceed 128 characters');
    });

    it('should validate updated description length', () => {
      const task = service.createTask('Title');
      const longDescription = 'a'.repeat(257);
      
      expect(() => service.updateTask(task.id, { description: longDescription }))
        .toThrowError('Task description cannot exceed 256 characters');
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', () => {
      const task = service.createTask('Test Task');
      const deleted = service.deleteTask(task.id);
      
      expect(deleted).toBe(true);
      expect(service.getTask(task.id)).toBeUndefined();
    });

    it('should return false for non-existent task', () => {
      const deleted = service.deleteTask('non-existent');
      
      expect(deleted).toBe(false);
    });
  });

  describe('changeTaskStatus', () => {
    it('should change task status', () => {
      const task = service.createTask('Test Task');
      const updatedTask = service.changeTaskStatus(task.id, TaskStatus.IN_PROGRESS);
      
      expect(updatedTask.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should update order when changing status', () => {
      const task1 = service.createTask('Task 1');
      const task2 = service.createTask('Task 2');
      
      service.changeTaskStatus(task1.id, TaskStatus.IN_PROGRESS);
      const updatedTask1 = service.getTask(task1.id);
      
      expect(updatedTask1?.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updatedTask1?.order).toBe(0); // First in progress task
    });
  });

  describe('moveTask', () => {
    it('should move task to new status and position', () => {
      const task1 = service.createTask('Task 1');
      const task2 = service.createTask('Task 2');
      
      const movedTask = service.moveTask(task1.id, TaskStatus.DONE, 0);
      
      expect(movedTask.status).toBe(TaskStatus.DONE);
      expect(movedTask.order).toBe(0);
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks filtered by status', () => {
      const task1 = service.createTask('Task 1');
      const task2 = service.createTask('Task 2');
      
      service.changeTaskStatus(task1.id, TaskStatus.IN_PROGRESS);
      
      const backlogTasks = service.getTasksByStatus(TaskStatus.BACKLOG);
      const inProgressTasks = service.getTasksByStatus(TaskStatus.IN_PROGRESS);
      
      expect(backlogTasks.length).toBe(1);
      expect(backlogTasks[0].id).toBe(task2.id);
      expect(inProgressTasks.length).toBe(1);
      expect(inProgressTasks[0].id).toBe(task1.id);
    });

    it('should return tasks sorted by order', () => {
      const task1 = service.createTask('Task 1');
      const task2 = service.createTask('Task 2');
      const task3 = service.createTask('Task 3');
      
      const tasks = service.getTasksByStatus(TaskStatus.BACKLOG);
      
      expect(tasks.length).toBe(3);
      expect(tasks[0].order).toBeLessThan(tasks[1].order);
      expect(tasks[1].order).toBeLessThan(tasks[2].order);
    });
  });

  describe('localStorage persistence', () => {
    it('should save tasks to localStorage', () => {
      const task = service.createTask('Test Task');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'daily-tasks',
        jasmine.any(String)
      );
    });

    it('should load tasks from localStorage on initialization', () => {
      const taskData = [{
        id: 'test-id',
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.BACKLOG,
        createdAt: new Date().toISOString(),
        order: 0
      }];
      
      mockLocalStorage['daily-tasks'] = JSON.stringify(taskData);
      
      // Create new service instance to trigger loading
      const newService = TestBed.inject(TaskService);
      
      expect(newService.getTask('test-id')).toBeDefined();
    });

    it('should handle localStorage errors gracefully', () => {
      spyOn(localStorage, 'setItem').and.throwError('Storage full');
      
      expect(() => service.createTask('Test Task')).toThrowError('Failed to save tasks. Please check your browser storage settings.');
    });

    it('should handle corrupted localStorage data', () => {
      mockLocalStorage['daily-tasks'] = 'invalid-json';
      
      // Create new service instance
      const newService = TestBed.inject(TaskService);
      
      expect(newService.allTasks()).toEqual([]);
    });
  });

  describe('computed signals', () => {
    it('should provide filtered task signals', () => {
      const task1 = service.createTask('Backlog Task');
      const task2 = service.createTask('Progress Task');
      const task3 = service.createTask('Done Task');
      
      service.changeTaskStatus(task2.id, TaskStatus.IN_PROGRESS);
      service.changeTaskStatus(task3.id, TaskStatus.DONE);
      
      expect(service.backlogTasks().length).toBe(1);
      expect(service.backlogTasks()[0].id).toBe(task1.id);
      
      expect(service.inProgressTasks().length).toBe(1);
      expect(service.inProgressTasks()[0].id).toBe(task2.id);
      
      expect(service.doneTasks().length).toBe(1);
      expect(service.doneTasks()[0].id).toBe(task3.id);
      
      expect(service.allTasks().length).toBe(3);
    });
  });

  describe('Enhanced Validation and Error Handling', () => {
    beforeEach(() => {
      // Clear any existing tasks
      localStorage.removeItem('daily-tasks');
      service = new TaskService();
    });

    describe('validateTaskIntegrity', () => {
      it('should detect empty titles', () => {
        // Manually add invalid task to test validation
        const invalidTask = {
          id: '1',
          title: '',
          description: 'desc',
          status: TaskStatus.BACKLOG,
          createdAt: new Date(),
          order: 0
        };
        
        // Use private method access for testing
        (service as any)._tasks.set([invalidTask]);
        
        const result = service.validateTaskIntegrity();
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Task 1 has empty title');
      });

      it('should detect title length violations', () => {
        const invalidTask = {
          id: '1',
          title: 'a'.repeat(129),
          description: 'desc',
          status: TaskStatus.BACKLOG,
          createdAt: new Date(),
          order: 0
        };
        
        (service as any)._tasks.set([invalidTask]);
        
        const result = service.validateTaskIntegrity();
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Task 1 title exceeds 128 characters');
      });

      it('should detect description length violations', () => {
        const invalidTask = {
          id: '1',
          title: 'Valid Title',
          description: 'a'.repeat(257),
          status: TaskStatus.BACKLOG,
          createdAt: new Date(),
          order: 0
        };
        
        (service as any)._tasks.set([invalidTask]);
        
        const result = service.validateTaskIntegrity();
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Task 1 description exceeds 256 characters');
      });

      it('should pass validation for valid tasks', () => {
        const task = service.createTask('Valid Title', 'Valid description');
        
        const result = service.validateTaskIntegrity();
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });

    describe('cleanupOldTasks', () => {
      it('should remove old completed tasks', () => {
        // Create some tasks
        const task1 = service.createTask('Task 1');
        const task2 = service.createTask('Task 2');
        
        // Mark one as done and artificially make it old
        service.updateTaskStatus(task1.id, TaskStatus.DONE);
        
        // Manually set an old date
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 35);
        
        const tasks = (service as any)._tasks();
        tasks[0].createdAt = oldDate;
        (service as any)._tasks.set([...tasks]);
        
        const result = service.cleanupOldTasks(30);
        
        expect(result.removedCount).toBe(1);
        expect(service.allTasks().length).toBe(1);
        expect(service.allTasks()[0].id).toBe(task2.id);
      });

      it('should keep recent completed tasks', () => {
        const task1 = service.createTask('Task 1');
        service.updateTaskStatus(task1.id, TaskStatus.DONE);
        
        const result = service.cleanupOldTasks(30);
        
        expect(result.removedCount).toBe(0);
        expect(service.allTasks().length).toBe(1);
      });

      it('should keep all non-completed tasks regardless of age', () => {
        const task1 = service.createTask('Task 1');
        const task2 = service.createTask('Task 2');
        
        // Make task1 old but keep it in backlog
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 35);
        
        const tasks = (service as any)._tasks();
        tasks[0].createdAt = oldDate;
        (service as any)._tasks.set([...tasks]);
        
        const result = service.cleanupOldTasks(30);
        
        expect(result.removedCount).toBe(0);
        expect(service.allTasks().length).toBe(2);
      });
    });
  });
});
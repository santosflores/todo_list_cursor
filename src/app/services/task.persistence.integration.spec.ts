import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus } from '../models/task-status.model';
import { Task } from '../models/task.model';

describe('TaskService - Persistence Integration', () => {
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage for isolated testing
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });
    spyOn(localStorage, 'clear').and.callFake(() => {
      mockLocalStorage = {};
    });

    TestBed.configureTestingModule({
      providers: [TaskService]
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should persist and restore tasks across browser sessions', () => {
      // Simulate first session - create and manage tasks
      let service1 = TestBed.inject(TaskService);
      
      // Create tasks in different statuses
      const task1 = service1.createTask('Important Task', 'This needs to be done');
      const task2 = service1.createTask('Another Task', 'Secondary priority');
      const task3 = service1.createTask('Done Task', 'Already completed');
      
      // Move tasks to different statuses
      service1.changeTaskStatus(task2.id, TaskStatus.IN_PROGRESS);
      service1.changeTaskStatus(task3.id, TaskStatus.DONE);
      
      // Reorder tasks within columns
      service1.reorderTask(task1.id, 1); // Change order in backlog
      
      // Verify initial state
      expect(service1.backlogTasks().length).toBe(1);
      expect(service1.inProgressTasks().length).toBe(1);
      expect(service1.doneTasks().length).toBe(1);
      
      // Simulate browser session end and restart (new service instance)
      const service2 = TestBed.inject(TaskService);
      
      // Verify all data is restored
      expect(service2.backlogTasks().length).toBe(1);
      expect(service2.inProgressTasks().length).toBe(1);
      expect(service2.doneTasks().length).toBe(1);
      
      // Verify specific task data
      const restoredTask1 = service2.getTask(task1.id);
      expect(restoredTask1).toBeDefined();
      expect(restoredTask1!.title).toBe('Important Task');
      expect(restoredTask1!.description).toBe('This needs to be done');
      expect(restoredTask1!.status).toBe(TaskStatus.BACKLOG);
      expect(restoredTask1!.order).toBe(1);
      
      const restoredTask2 = service2.getTask(task2.id);
      expect(restoredTask2!.status).toBe(TaskStatus.IN_PROGRESS);
      
      const restoredTask3 = service2.getTask(task3.id);
      expect(restoredTask3!.status).toBe(TaskStatus.DONE);
    });

    it('should handle complex task operations and persist correctly', () => {
      // First session - create multiple tasks and perform complex operations
      let service = TestBed.inject(TaskService);
      
      // Create 5 tasks
      const tasks = [];
      for (let i = 1; i <= 5; i++) {
        tasks.push(service.createTask(`Task ${i}`, `Description for task ${i}`));
      }
      
      // Perform batch operations
      service.batchUpdateTasks([
        { id: tasks[1].id, updates: { status: TaskStatus.IN_PROGRESS } },
        { id: tasks[2].id, updates: { status: TaskStatus.DONE } },
        { id: tasks[3].id, updates: { title: 'Updated Task 4' } }
      ]);
      
      // Verify state before "browser restart"
      expect(service.allTasks().length).toBe(5);
      expect(service.inProgressTasks().length).toBe(1);
      expect(service.doneTasks().length).toBe(1);
      expect(service.getTask(tasks[3].id)!.title).toBe('Updated Task 4');
      
      // Simulate browser restart
      const service2 = TestBed.inject(TaskService);
      
      // Verify all operations persisted
      expect(service2.allTasks().length).toBe(5);
      expect(service2.inProgressTasks().length).toBe(1);
      expect(service2.doneTasks().length).toBe(1);
      expect(service2.getTask(tasks[3].id)!.title).toBe('Updated Task 4');
    });
    
    it('should maintain task order consistency across sessions', () => {
      // First session
      let service = TestBed.inject(TaskService);
      
      // Create tasks and reorder them
      const task1 = service.createTask('First Task');
      const task2 = service.createTask('Second Task');
      const task3 = service.createTask('Third Task');
      
      // Reorder: move first task to position 2
      service.reorderTask(task1.id, 2);
      
      const orderedTasks = service.backlogTasks();
      const expectedOrder = [task2.id, task3.id, task1.id];
      expect(orderedTasks.map(t => t.id)).toEqual(expectedOrder);
      
      // Simulate browser restart
      const service2 = TestBed.inject(TaskService);
      
      // Verify order is maintained
      const restoredTasks = service2.backlogTasks();
      expect(restoredTasks.map(t => t.id)).toEqual(expectedOrder);
    });
  });

  describe('Migration Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['daily-tasks'] = 'invalid-json-data';
      mockLocalStorage['daily-tasks-version'] = '1.0.0';
      
      spyOn(console, 'error');
      
      // Should not throw error
      expect(() => {
        const service = TestBed.inject(TaskService);
      }).not.toThrow();
      
      // Should start with empty task list
      const service = TestBed.inject(TaskService);
      expect(service.allTasks()).toEqual([]);
    });

    it('should handle localStorage quota exceeded during migration', () => {
      // Setup large legacy data
      const largeLegacyData = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`.repeat(100), // Make it large
        status: 'backlog',
        order: i
      }));
      mockLocalStorage['daily-tasks'] = JSON.stringify(largeLegacyData);
      
      // Mock setItem to throw quota exceeded on migration save
      (localStorage.setItem as jasmine.Spy).and.callFake((key: string, value: string) => {
        if (key === 'daily-tasks' && value.length > 1000) {
          throw new DOMException('QuotaExceededError');
        }
        mockLocalStorage[key] = value;
      });
      
      spyOn(console, 'error');
      
      // Should handle the error gracefully
      expect(() => {
        const service = TestBed.inject(TaskService);
      }).not.toThrow();
    });
  });

  describe('Performance During Persistence', () => {
    it('should maintain good performance during large data persistence', () => {
      const service = TestBed.inject(TaskService);
      
      // Create many tasks
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        service.createTask(`Performance Task ${i}`, `Description ${i}`);
      }
      const creationTime = performance.now() - startTime;
      
      // Verify performance is reasonable (less than 1 second for 100 tasks)
      expect(creationTime).toBeLessThan(1000);
      
      // Test performance metrics
      const metrics = service.getPerformanceMetrics();
      expect(metrics.operations.saveOperations).toBe(100);
      expect(metrics.averagePersistenceTime).toBeLessThan(50); // Less than 50ms per save
    });

    it('should handle rapid operations without data corruption', () => {
      const service = TestBed.inject(TaskService);
      
      // Create base tasks
      const tasks = [];
      for (let i = 0; i < 10; i++) {
        tasks.push(service.createTask(`Rapid Task ${i}`));
      }
      
      // Perform rapid updates
      for (let i = 0; i < 10; i++) {
        service.updateTask(tasks[i].id, { title: `Updated Rapid Task ${i}` });
      }
      
      // Verify data integrity
      const integrity = service.validateTaskIntegrity();
      expect(integrity.isValid).toBe(true);
      
      // Verify all updates persisted
      for (let i = 0; i < 10; i++) {
        const task = service.getTask(tasks[i].id);
        expect(task!.title).toBe(`Updated Rapid Task ${i}`);
      }
    });
  });
});
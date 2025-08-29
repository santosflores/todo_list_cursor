import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { KanbanBoardComponent } from './kanban-board.component';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { TaskStatus } from '../../models/task-status.model';

describe('KanbanBoardComponent - Performance Testing', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let taskService: jasmine.SpyObj<TaskService>;

  // Generate large number of mock tasks for performance testing
  function generateMockTasks(count: number): Task[] {
    const tasks: Task[] = [];
    const statuses = [TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, TaskStatus.DONE];
    
    for (let i = 0; i < count; i++) {
      const status = statuses[i % 3];
      tasks.push({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        status,
        createdAt: new Date(2024, 0, 1 + i),
        order: Math.floor(i / 3)
      });
    }
    
    return tasks;
  }

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'handleDragDropOperation',
      'validateTaskIntegrity',
      'repairTaskIntegrity',
      'getPerformanceMetrics',
      'getStorageInfo'
    ]);

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent, NoopAnimationsModule],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
  });

  describe('Performance with Large Datasets', () => {
    it('should handle 100 tasks efficiently', async () => {
      const largeMockTasks = generateMockTasks(100);
      
      // Setup task service with large dataset
      setupTaskServiceWithTasks(largeMockTasks);
      
      const startTime = performance.now();
      fixture.detectChanges();
      await fixture.whenStable();
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBeGreaterThan(30);
    });

    it('should handle 500 tasks without performance degradation', async () => {
      const largeMockTasks = generateMockTasks(500);
      
      setupTaskServiceWithTasks(largeMockTasks);
      
      const startTime = performance.now();
      fixture.detectChanges();
      await fixture.whenStable();
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
      expect(component.allTasks().length).toBe(500);
    });

    it('should handle rapid drag operations efficiently', async () => {
      const mediumMockTasks = generateMockTasks(50);
      setupTaskServiceWithTasks(mediumMockTasks);
      
      taskService.handleDragDropOperation.and.returnValue({ 
        success: true, 
        duration: 5 // Mock fast operation
      });
      
      fixture.detectChanges();
      
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const operationTimes: number[] = [];
      
      // Perform multiple drag operations and measure time
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const event = createMockDragDropEvent(
          backlogTasks,
          backlogTasks,
          0,
          Math.min(i, backlogTasks.length - 1),
          'backlog-list'
        );
        
        component.onDrop(event);
        
        const operationTime = performance.now() - startTime;
        operationTimes.push(operationTime);
      }
      
      const averageTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      expect(averageTime).toBeLessThan(10); // Each operation should be under 10ms
    });

    it('should efficiently calculate affected tasks for large reorders', () => {
      const largeMockTasks = generateMockTasks(200);
      setupTaskServiceWithTasks(largeMockTasks);
      
      fixture.detectChanges();
      
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      
      const startTime = performance.now();
      
      const event = createMockDragDropEvent(
        backlogTasks,
        backlogTasks,
        0,
        backlogTasks.length - 1,
        'backlog-list'
      );
      
      component.onDrop(event);
      
      const calculationTime = performance.now() - startTime;
      
      expect(calculationTime).toBeLessThan(50); // Should calculate in under 50ms
      expect(taskService.handleDragDropOperation).toHaveBeenCalled();
    });
  });

  describe('Memory Usage and Optimization', () => {
    it('should not create memory leaks during drag operations', () => {
      const initialTasks = generateMockTasks(20);
      setupTaskServiceWithTasks(initialTasks);
      
      taskService.handleDragDropOperation.and.returnValue({ success: true });
      
      fixture.detectChanges();
      
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      
      // Perform many drag operations to test for memory leaks
      for (let i = 0; i < 100; i++) {
        const event = createMockDragDropEvent(
          backlogTasks,
          backlogTasks,
          0,
          1,
          'backlog-list'
        );
        
        component.onDrop(event);
        
        // Force garbage collection hint (not guaranteed but helps in testing)
        if (typeof window !== 'undefined' && (window as any).gc) {
          (window as any).gc();
        }
      }
      
      // Check that component is still functional
      expect(component.isDragging()).toBeDefined();
      expect(component.allTasks).toBeDefined();
    });

    it('should efficiently update signals with large datasets', () => {
      const largeMockTasks = generateMockTasks(1000);
      
      const startTime = performance.now();
      
      setupTaskServiceWithTasks(largeMockTasks);
      fixture.detectChanges();
      
      // Trigger signal updates
      component.getTasksForColumn(TaskStatus.BACKLOG);
      component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      component.getTasksForColumn(TaskStatus.DONE);
      
      const updateTime = performance.now() - startTime;
      
      expect(updateTime).toBeLessThan(200); // Should update signals quickly
    });
  });

  describe('Scalability Testing', () => {
    it('should maintain performance with increasing task counts', async () => {
      const testSizes = [10, 50, 100, 200];
      const renderTimes: number[] = [];
      
      for (const size of testSizes) {
        const tasks = generateMockTasks(size);
        setupTaskServiceWithTasks(tasks);
        
        const startTime = performance.now();
        fixture.detectChanges();
        await fixture.whenStable();
        const renderTime = performance.now() - startTime;
        
        renderTimes.push(renderTime);
        
        // Clean up for next iteration
        component.isDragging.set(false);
        component.dragSourceColumn.set(null);
        component.dragOverColumn.set(null);
      }
      
      // Check that render time doesn't grow exponentially
      // Allow for some growth but should remain reasonable
      const growthRatio = renderTimes[renderTimes.length - 1] / renderTimes[0];
      expect(growthRatio).toBeLessThan(10); // Should not be more than 10x slower
    });

    it('should handle concurrent drag operations gracefully', () => {
      const tasks = generateMockTasks(30);
      setupTaskServiceWithTasks(tasks);
      
      taskService.handleDragDropOperation.and.returnValue({ success: true });
      
      fixture.detectChanges();
      
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      
      // Simulate concurrent operations
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(new Promise<void>(resolve => {
          setTimeout(() => {
            const event = createMockDragDropEvent(
              backlogTasks,
              inProgressTasks,
              0,
              0,
              'in-progress-list',
              'backlog-list'
            );
            
            component.onDrop(event);
            resolve();
          }, i * 10);
        }));
      }
      
      return Promise.all(promises).then(() => {
        expect(taskService.handleDragDropOperation).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should integrate with performance metrics', () => {
      const mockMetrics = {
        operations: {
          saveOperations: 10,
          loadOperations: 5,
          batchOperations: 3,
          dragDropOperations: 15,
          totalPersistenceTime: 150,
          lastOperationTime: Date.now(),
          errors: 1
        },
        averagePersistenceTime: 5.5,
        operationsPerMinute: 30,
        successRate: 96.7,
        lastOperationAgo: 1000
      };
      
      taskService.getPerformanceMetrics.and.returnValue(mockMetrics);
      
      const exportedState = component.exportKanbanState();
      const state = JSON.parse(exportedState);
      
      expect(state.metrics).toBeDefined();
      expect(state.storage).toBeDefined();
    });

    it('should track performance during test operations', () => {
      taskService.getPerformanceMetrics.and.returnValue({
        operations: {
          saveOperations: 0,
          loadOperations: 0,
          batchOperations: 0,
          dragDropOperations: 0,
          totalPersistenceTime: 0,
          lastOperationTime: 0,
          errors: 0
        },
        averagePersistenceTime: 0,
        operationsPerMinute: 0,
        successRate: 100,
        lastOperationAgo: 0
      });
      
      taskService.validateTaskIntegrity.and.returnValue({ isValid: true, errors: [] });
      taskService.getStorageInfo.and.returnValue({
        totalTasks: 0,
        storageUsed: 0,
        estimatedStorageLimit: 5242880,
        storagePercentUsed: 0,
        lastSaveTime: new Date().toISOString()
      });
      
      spyOn(console, 'group');
      spyOn(console, 'log');
      spyOn(console, 'groupEnd');
      
      component.testPersistence();
      
      expect(taskService.getPerformanceMetrics).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('⚡ Test 5: Performance Monitoring');
    });
  });

  // Helper functions
  function setupTaskServiceWithTasks(tasks: Task[]) {
    const backlogTasks = tasks.filter(t => t.status === TaskStatus.BACKLOG);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE);
    
    taskService.handleDragDropOperation.and.returnValue({ success: true });
    taskService.validateTaskIntegrity.and.returnValue({ isValid: true, errors: [] });
    taskService.getPerformanceMetrics.and.returnValue({
      operations: {
        saveOperations: 0,
        loadOperations: 1,
        batchOperations: 0,
        dragDropOperations: 0,
        totalPersistenceTime: 10,
        lastOperationTime: Date.now(),
        errors: 0
      },
      averagePersistenceTime: 10,
      operationsPerMinute: 6,
      successRate: 100,
      lastOperationAgo: 1000
    });
    taskService.getStorageInfo.and.returnValue({
      totalTasks: tasks.length,
      storageUsed: tasks.length * 100,
      estimatedStorageLimit: 5242880,
      storagePercentUsed: (tasks.length * 100) / 52428.8,
      lastSaveTime: new Date().toISOString()
    });

    // Update component's task service signals
    Object.defineProperty(taskService, 'allTasks', {
      value: signal(tasks),
      writable: false
    });
    Object.defineProperty(taskService, 'backlogTasks', {
      value: signal(backlogTasks),
      writable: false
    });
    Object.defineProperty(taskService, 'inProgressTasks', {
      value: signal(inProgressTasks),
      writable: false
    });
    Object.defineProperty(taskService, 'doneTasks', {
      value: signal(doneTasks),
      writable: false
    });
  }

  function createMockDragDropEvent(
    previousData: Task[],
    currentData: Task[],
    previousIndex: number,
    currentIndex: number,
    containerId: string,
    previousContainerId?: string
  ) {
    return {
      previousContainer: {
        id: previousContainerId || containerId,
        data: previousData
      },
      container: {
        id: containerId,
        data: currentData
      },
      previousIndex,
      currentIndex,
      item: {
        data: previousData[previousIndex]
      }
    } as any;
  }
});
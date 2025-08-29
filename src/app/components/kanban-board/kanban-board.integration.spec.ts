import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { KanbanBoardComponent } from './kanban-board.component';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { TaskStatus } from '../../models/task-status.model';

describe('KanbanBoardComponent - Integration Testing', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let taskService: TaskService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent, NoopAnimationsModule],
      providers: [TaskService]
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    
    // Clear localStorage before each test
    localStorage.clear();
    
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  describe('Full Integration with TaskService', () => {
    it('should create tasks and display them in kanban board', () => {
      // Create tasks using the actual service
      const task1 = taskService.createTask('Task 1', 'Description 1');
      const task2 = taskService.createTask('Task 2', 'Description 2');
      const task3 = taskService.createTask('Task 3', 'Description 3');

      fixture.detectChanges();

      // All tasks should start in backlog
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(3);
      expect(component.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(0);
      expect(component.getTasksForColumn(TaskStatus.DONE).length).toBe(0);

      // Verify tasks are displayed correctly
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      expect(backlogTasks.find(t => t.title === 'Task 1')).toBeDefined();
      expect(backlogTasks.find(t => t.title === 'Task 2')).toBeDefined();
      expect(backlogTasks.find(t => t.title === 'Task 3')).toBeDefined();
    });

    it('should persist drag and drop operations across browser sessions', () => {
      // Create initial tasks
      const task1 = taskService.createTask('Persistent Task 1', 'Test persistence');
      const task2 = taskService.createTask('Persistent Task 2', 'Test persistence');

      fixture.detectChanges();

      // Move task from backlog to in-progress
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);

      const moveEvent = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0, // Move first task
        0, // To first position in in-progress
        'in-progress-list',
        'backlog-list'
      );

      component.onDrop(moveEvent);
      fixture.detectChanges();

      // Verify the move worked
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(1);
      expect(component.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(1);

      // Simulate browser restart by creating new component with same service
      const newFixture = TestBed.createComponent(KanbanBoardComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      // Data should be persisted
      expect(newComponent.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(1);
      expect(newComponent.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(1);

      const inProgressTask = newComponent.getTasksForColumn(TaskStatus.IN_PROGRESS)[0];
      expect(inProgressTask.title).toBe('Persistent Task 1');
    });

    it('should handle complex multi-step drag operations with persistence', () => {
      // Create multiple tasks
      const tasks = [
        taskService.createTask('Task A', 'First task'),
        taskService.createTask('Task B', 'Second task'),
        taskService.createTask('Task C', 'Third task'),
        taskService.createTask('Task D', 'Fourth task')
      ];

      fixture.detectChanges();

      let backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      let inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      let doneTasks = component.getTasksForColumn(TaskStatus.DONE);

      // Step 1: Move Task A to In Progress
      let moveEvent = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0,
        0,
        'in-progress-list',
        'backlog-list'
      );
      component.onDrop(moveEvent);
      fixture.detectChanges();

      // Step 2: Move Task B to In Progress
      backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      
      moveEvent = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0,
        1,
        'in-progress-list',
        'backlog-list'
      );
      component.onDrop(moveEvent);
      fixture.detectChanges();

      // Step 3: Move Task A to Done
      inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      doneTasks = component.getTasksForColumn(TaskStatus.DONE);
      
      moveEvent = createMockDragDropEvent(
        inProgressTasks,
        doneTasks,
        0,
        0,
        'done-list',
        'in-progress-list'
      );
      component.onDrop(moveEvent);
      fixture.detectChanges();

      // Step 4: Reorder tasks in backlog
      backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      
      const reorderEvent = createMockDragDropEvent(
        backlogTasks,
        backlogTasks,
        0,
        1,
        'backlog-list'
      );
      component.onDrop(reorderEvent);
      fixture.detectChanges();

      // Verify final state
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(2);
      expect(component.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(1);
      expect(component.getTasksForColumn(TaskStatus.DONE).length).toBe(1);

      // Verify specific task positions
      const finalBacklog = component.getTasksForColumn(TaskStatus.BACKLOG);
      const finalInProgress = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      const finalDone = component.getTasksForColumn(TaskStatus.DONE);

      expect(finalDone[0].title).toBe('Task A');
      expect(finalInProgress[0].title).toBe('Task B');
      expect(finalBacklog.find(t => t.title === 'Task C')).toBeDefined();
      expect(finalBacklog.find(t => t.title === 'Task D')).toBeDefined();
    });

    it('should handle data integrity issues during real operations', () => {
      // Create tasks
      taskService.createTask('Task 1', 'Test task 1');
      taskService.createTask('Task 2', 'Test task 2');

      // Manually corrupt data in localStorage to simulate integrity issues
      const corruptedData = [
        { id: 'task-1', title: 'Task 1', status: 'backlog', order: 0, createdAt: new Date().toISOString() },
        { id: 'task-2', title: 'Task 2', status: 'backlog', order: 0, createdAt: new Date().toISOString() }, // Duplicate order
        { id: 'task-3', title: '', status: 'invalid-status', order: -1, createdAt: new Date().toISOString() } // Invalid data
      ];
      localStorage.setItem('daily-tasks', JSON.stringify(corruptedData));

      // Create new component to load corrupted data
      const newFixture = TestBed.createComponent(KanbanBoardComponent);
      const newComponent = newFixture.componentInstance;
      
      spyOn(console, 'warn');
      spyOn(console, 'log');

      newFixture.detectChanges();

      // Should detect and repair integrity issues
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringMatching(/Data integrity issues found/)
      );
    });

    it('should handle localStorage quota exceeded scenario', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      spyOn(localStorage, 'setItem').and.throwError(new DOMException('QuotaExceededError'));

      // Create a task
      expect(() => {
        taskService.createTask('Test Task', 'This should fail to save');
      }).toThrowError(/Storage quota exceeded/);

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });

    it('should maintain consistent state across multiple rapid operations', () => {
      // Create initial tasks
      for (let i = 0; i < 10; i++) {
        taskService.createTask(`Rapid Task ${i}`, `Description ${i}`);
      }

      fixture.detectChanges();

      let backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);

      // Perform rapid reordering operations
      for (let i = 0; i < 5; i++) {
        backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
        
        const reorderEvent = createMockDragDropEvent(
          backlogTasks,
          backlogTasks,
          0,
          Math.min(i + 1, backlogTasks.length - 1),
          'backlog-list'
        );
        
        component.onDrop(reorderEvent);
        fixture.detectChanges();
      }

      // Perform rapid moves between columns
      for (let i = 0; i < 3; i++) {
        backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
        
        if (backlogTasks.length > 0) {
          const moveEvent = createMockDragDropEvent(
            backlogTasks,
            inProgressTasks,
            0,
            i,
            'in-progress-list',
            'backlog-list'
          );
          
          component.onDrop(moveEvent);
          fixture.detectChanges();
        }
      }

      // Verify data consistency
      const validation = taskService.validateTaskIntegrity();
      expect(validation.isValid).toBe(true);

      // Verify total task count is maintained
      const totalTasks = component.getTasksForColumn(TaskStatus.BACKLOG).length +
                        component.getTasksForColumn(TaskStatus.IN_PROGRESS).length +
                        component.getTasksForColumn(TaskStatus.DONE).length;
      expect(totalTasks).toBe(10);
    });

    it('should export and validate complete application state', () => {
      // Create comprehensive test data
      taskService.createTask('Backlog Task 1', 'In backlog');
      taskService.createTask('Backlog Task 2', 'In backlog');
      
      const task3 = taskService.createTask('InProgress Task', 'Will move to in-progress');
      taskService.updateTaskStatus(task3.id, TaskStatus.IN_PROGRESS);
      
      const task4 = taskService.createTask('Done Task', 'Will move to done');
      taskService.updateTaskStatus(task4.id, TaskStatus.DONE);

      fixture.detectChanges();

      // Export state
      const exportedState = component.exportKanbanState();
      const state = JSON.parse(exportedState);

      // Validate exported state structure
      expect(state.tasks).toBeDefined();
      expect(state.columns).toBeDefined();
      expect(state.metrics).toBeDefined();
      expect(state.integrity).toBeDefined();
      expect(state.storage).toBeDefined();
      expect(state.timestamp).toBeDefined();

      // Validate task distribution
      expect(state.tasks.length).toBe(4);
      expect(state.tasks.filter((t: Task) => t.status === TaskStatus.BACKLOG).length).toBe(2);
      expect(state.tasks.filter((t: Task) => t.status === TaskStatus.IN_PROGRESS).length).toBe(1);
      expect(state.tasks.filter((t: Task) => t.status === TaskStatus.DONE).length).toBe(1);

      // Validate integrity check
      expect(state.integrity.isValid).toBe(true);
      expect(state.integrity.errors.length).toBe(0);

      // Validate metrics
      expect(state.metrics.totalTasks).toBe(4);
      expect(state.metrics.tasksByStatus).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from persistence failures gracefully', () => {
      // Create initial task
      const task = taskService.createTask('Test Task', 'Will test error recovery');
      fixture.detectChanges();

      // Mock service to return failure
      spyOn(taskService, 'handleDragDropOperation').and.returnValue({
        success: false,
        error: 'Simulated persistence failure'
      });

      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);

      // Attempt to move task (should fail)
      const moveEvent = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0,
        0,
        'in-progress-list',
        'backlog-list'
      );

      spyOn(console, 'error');
      component.onDrop(moveEvent);

      // Should log error and maintain state
      expect(console.error).toHaveBeenCalledWith(
        'Error:',
        'Failed to move task: Simulated persistence failure'
      );

      // Task should still be in backlog (no change persisted)
      fixture.detectChanges();
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(1);
      expect(component.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(0);
    });

    it('should maintain UI consistency during concurrent operations', async () => {
      // Create tasks
      for (let i = 0; i < 5; i++) {
        taskService.createTask(`Concurrent Task ${i}`, `Description ${i}`);
      }

      fixture.detectChanges();

      // Simulate concurrent drag operations
      const operations = [];
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);

      for (let i = 0; i < 3; i++) {
        operations.push(new Promise<void>((resolve) => {
          setTimeout(() => {
            const moveEvent = createMockDragDropEvent(
              backlogTasks,
              inProgressTasks,
              i,
              i,
              'in-progress-list',
              'backlog-list'
            );
            component.onDrop(moveEvent);
            resolve();
          }, i * 10);
        }));
      }

      await Promise.all(operations);
      fixture.detectChanges();

      // Verify final state is consistent
      const validation = taskService.validateTaskIntegrity();
      expect(validation.isValid).toBe(true);
    });
  });

  // Helper function to create mock drag drop events
  function createMockDragDropEvent(
    previousData: Task[],
    currentData: Task[],
    previousIndex: number,
    currentIndex: number,
    containerId: string,
    previousContainerId?: string
  ): CdkDragDrop<Task[]> {
    const previousContainer = {
      id: previousContainerId || containerId,
      data: [...previousData] // Create copies to avoid mutation during test
    } as any;

    const currentContainer = {
      id: containerId,
      data: [...currentData]
    } as any;

    return {
      previousContainer,
      container: currentContainer,
      previousIndex,
      currentIndex,
      item: {
        data: previousData[previousIndex]
      }
    } as any;
  }
});
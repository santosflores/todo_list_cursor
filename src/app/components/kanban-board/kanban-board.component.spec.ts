import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';

import { KanbanBoardComponent } from './kanban-board.component';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { TaskStatus, TaskStatusType } from '../../models/task-status.model';

describe('KanbanBoardComponent - Drag and Drop Testing', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let taskService: jasmine.SpyObj<TaskService>;

  // Mock tasks for testing
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Task 1',
      description: 'Description 1',
      status: TaskStatus.BACKLOG,
      createdAt: new Date('2024-01-01'),
      order: 0
    },
    {
      id: 'task-2',
      title: 'Task 2',
      description: 'Description 2',
      status: TaskStatus.BACKLOG,
      createdAt: new Date('2024-01-02'),
      order: 1
    },
    {
      id: 'task-3',
      title: 'Task 3',
      description: 'Description 3',
      status: TaskStatus.IN_PROGRESS,
      createdAt: new Date('2024-01-03'),
      order: 0
    },
    {
      id: 'task-4',
      title: 'Task 4',
      description: 'Description 4',
      status: TaskStatus.DONE,
      createdAt: new Date('2024-01-04'),
      order: 0
    }
  ];

  beforeEach(async () => {
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [
      'handleDragDropOperation',
      'validateTaskIntegrity',
      'repairTaskIntegrity',
      'getPerformanceMetrics',
      'getStorageInfo'
    ], {
      allTasks: signal(mockTasks),
      backlogTasks: signal(mockTasks.filter(t => t.status === TaskStatus.BACKLOG)),
      inProgressTasks: signal(mockTasks.filter(t => t.status === TaskStatus.IN_PROGRESS)),
      doneTasks: signal(mockTasks.filter(t => t.status === TaskStatus.DONE))
    });

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent, NoopAnimationsModule],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KanbanBoardComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
    
    // Setup default spy returns
    taskService.handleDragDropOperation.and.returnValue({ success: true });
    taskService.validateTaskIntegrity.and.returnValue({ isValid: true, errors: [] });
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
    taskService.getStorageInfo.and.returnValue({
      totalTasks: mockTasks.length,
      storageUsed: 1024,
      estimatedStorageLimit: 5242880,
      storagePercentUsed: 0.02,
      lastSaveTime: new Date().toISOString()
    });

    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with correct columns', () => {
      expect(component.columns).toBeDefined();
      expect(component.columns.length).toBe(3);
      expect(component.columns[0].id).toBe(TaskStatus.BACKLOG);
      expect(component.columns[1].id).toBe(TaskStatus.IN_PROGRESS);
      expect(component.columns[2].id).toBe(TaskStatus.DONE);
    });

    it('should validate data integrity on initialization', () => {
      expect(taskService.validateTaskIntegrity).toHaveBeenCalled();
    });

    it('should display tasks in correct columns', () => {
      expect(component.getTasksForColumn(TaskStatus.BACKLOG).length).toBe(2);
      expect(component.getTasksForColumn(TaskStatus.IN_PROGRESS).length).toBe(1);
      expect(component.getTasksForColumn(TaskStatus.DONE).length).toBe(1);
    });
  });

  describe('Drag and Drop - Reordering within Same Column', () => {
    it('should handle reordering tasks within backlog column', () => {
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const event = createMockDragDropEvent(
        backlogTasks,
        backlogTasks,
        0, // from index 0
        1, // to index 1
        'backlog-list'
      );

      component.onDrop(event);

      expect(taskService.handleDragDropOperation).toHaveBeenCalledWith({
        type: 'reorder',
        taskId: 'task-1',
        newOrder: 1,
        affectedTasks: jasmine.any(Array)
      });
    });

    it('should handle reordering in single-task column', () => {
      const doneTasks = component.getTasksForColumn(TaskStatus.DONE);
      const event = createMockDragDropEvent(
        doneTasks,
        doneTasks,
        0,
        0,
        'done-list'
      );

      component.onDrop(event);

      expect(taskService.handleDragDropOperation).toHaveBeenCalledWith({
        type: 'reorder',
        taskId: 'task-4',
        newOrder: 0,
        affectedTasks: jasmine.any(Array)
      });
    });

    it('should calculate correct affected tasks for reordering', () => {
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const event = createMockDragDropEvent(
        backlogTasks,
        backlogTasks,
        0,
        1,
        'backlog-list'
      );

      component.onDrop(event);

      const call = taskService.handleDragDropOperation.calls.mostRecent();
      const affectedTasks = call.args[0].affectedTasks;
      
      expect(affectedTasks.length).toBe(2);
      expect(affectedTasks).toContain({ id: 'task-1', newOrder: 1 });
      expect(affectedTasks).toContain({ id: 'task-2', newOrder: 0 });
    });
  });

  describe('Drag and Drop - Moving Between Columns', () => {
    it('should handle moving task from backlog to in-progress', () => {
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      
      const event = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0, // task-1 from backlog
        1, // to position 1 in in-progress
        'in-progress-list',
        'backlog-list'
      );

      component.onDrop(event);

      expect(taskService.handleDragDropOperation).toHaveBeenCalledWith({
        type: 'move',
        taskId: 'task-1',
        newStatus: TaskStatus.IN_PROGRESS,
        newOrder: 1,
        affectedTasks: jasmine.any(Array)
      });
    });

    it('should handle moving task to empty column', () => {
      // Mock empty done column for this test
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const emptyDoneTasks: Task[] = [];
      
      const event = createMockDragDropEvent(
        backlogTasks,
        emptyDoneTasks,
        0,
        0,
        'done-list',
        'backlog-list'
      );

      component.onDrop(event);

      expect(taskService.handleDragDropOperation).toHaveBeenCalledWith({
        type: 'move',
        taskId: 'task-1',
        newStatus: TaskStatus.DONE,
        newOrder: 0,
        affectedTasks: jasmine.any(Array)
      });
    });

    it('should calculate correct affected tasks for column move', () => {
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const inProgressTasks = component.getTasksForColumn(TaskStatus.IN_PROGRESS);
      
      const event = createMockDragDropEvent(
        backlogTasks,
        inProgressTasks,
        0,
        0,
        'in-progress-list',
        'backlog-list'
      );

      component.onDrop(event);

      const call = taskService.handleDragDropOperation.calls.mostRecent();
      const affectedTasks = call.args[0].affectedTasks;
      
      // Should include tasks from both columns
      expect(affectedTasks.length).toBeGreaterThan(1);
      
      // Should have reordered tasks from source column
      const backlogTask = affectedTasks.find(t => t.id === 'task-2');
      expect(backlogTask).toBeDefined();
      expect(backlogTask?.newOrder).toBe(0);
    });
  });

  describe('Drag and Drop Status Mapping', () => {
    it('should correctly map container IDs to task statuses', () => {
      expect(component.getDropListId(TaskStatus.BACKLOG)).toBe('backlog-list');
      expect(component.getDropListId(TaskStatus.IN_PROGRESS)).toBe('in-progress-list');
      expect(component.getDropListId(TaskStatus.DONE)).toBe('done-list');
    });

    it('should correctly identify source and target columns during drag', () => {
      component.isDragging.set(true);
      component.dragSourceColumn.set('backlog-list');
      component.dragOverColumn.set('in-progress-list');

      expect(component.isSourceColumn(TaskStatus.BACKLOG)).toBe(true);
      expect(component.isSourceColumn(TaskStatus.IN_PROGRESS)).toBe(false);
      expect(component.isDragOverColumn(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(component.isDragOverColumn(TaskStatus.DONE)).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle persistence failure gracefully', () => {
      taskService.handleDragDropOperation.and.returnValue({ 
        success: false, 
        error: 'Storage quota exceeded' 
      });

      spyOn(component, 'showErrorMessage' as any);
      spyOn(component, 'revertDropOperation' as any);

      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      const event = createMockDragDropEvent(
        backlogTasks,
        backlogTasks,
        0,
        1,
        'backlog-list'
      );

      component.onDrop(event);

      expect((component as any).showErrorMessage).toHaveBeenCalledWith('Failed to reorder task: Storage quota exceeded');
      expect((component as any).revertDropOperation).toHaveBeenCalled();
    });

    it('should handle data integrity issues', () => {
      taskService.validateTaskIntegrity.and.returnValue({ 
        isValid: false, 
        errors: ['Task order inconsistency'] 
      });
      taskService.repairTaskIntegrity.and.returnValue(true);

      spyOn(component, 'showSuccessMessage' as any);

      (component as any).validateDataIntegrity();

      expect(taskService.repairTaskIntegrity).toHaveBeenCalled();
      expect((component as any).showSuccessMessage).toHaveBeenCalledWith('Data integrity issues were automatically repaired');
    });

    it('should handle repair failure', () => {
      taskService.validateTaskIntegrity.and.returnValue({ 
        isValid: false, 
        errors: ['Critical error'] 
      });
      taskService.repairTaskIntegrity.and.returnValue(false);

      spyOn(component, 'showErrorMessage' as any);

      (component as any).validateDataIntegrity();

      expect((component as any).showErrorMessage).toHaveBeenCalledWith('Critical data integrity issues detected. Please refresh the page.');
    });
  });

  describe('Visual Feedback and State Management', () => {
    it('should update drag state on drag start', () => {
      const mockDragStart = {
        source: {
          data: mockTasks[0]
        }
      } as any;

      component.onDragStart(mockDragStart);

      expect(component.isDragging()).toBe(true);
      expect(component.dragSourceColumn()).toBe('backlog-list');
    });

    it('should clean up state on drag end', () => {
      // Set initial drag state
      component.isDragging.set(true);
      component.dragSourceColumn.set('backlog-list');
      component.dragOverColumn.set('in-progress-list');

      const mockDragEnd = {} as any;
      component.onDragEnd(mockDragEnd);

      expect(component.isDragging()).toBe(false);
      expect(component.dragSourceColumn()).toBe(null);
      expect(component.dragOverColumn()).toBe(null);
    });

    it('should handle drag enter and exit events', () => {
      const mockDragEnter = {
        container: { id: 'in-progress-list' }
      } as any;

      component.onDragEnter(mockDragEnter);
      expect(component.dragOverColumn()).toBe('in-progress-list');

      const mockDragExit = {
        container: { id: 'in-progress-list' }
      } as any;

      component.onDragExit(mockDragExit);
      expect(component.dragOverColumn()).toBe(null);
    });
  });

  describe('Performance and Metrics', () => {
    it('should export kanban state correctly', () => {
      const stateJson = component.exportKanbanState();
      const state = JSON.parse(stateJson);

      expect(state.tasks).toBeDefined();
      expect(state.columns).toBeDefined();
      expect(state.metrics).toBeDefined();
      expect(state.integrity).toBeDefined();
      expect(state.storage).toBeDefined();
      expect(state.timestamp).toBeDefined();
    });

    it('should get drag drop metrics', () => {
      const metrics = component.getDragDropMetrics();

      expect(metrics.totalTasks).toBe(mockTasks.length);
      expect(metrics.tasksByStatus).toBeDefined();
      expect(metrics.tasksByStatus[TaskStatus.BACKLOG]).toBe(2);
      expect(metrics.tasksByStatus[TaskStatus.IN_PROGRESS]).toBe(1);
      expect(metrics.tasksByStatus[TaskStatus.DONE]).toBe(1);
      expect(metrics.lastUpdateTime).toBeDefined();
    });

    it('should run persistence tests without errors', () => {
      spyOn(console, 'log');
      spyOn(console, 'group');
      spyOn(console, 'groupEnd');

      expect(() => component.testPersistence()).not.toThrow();
      expect(console.group).toHaveBeenCalledWith('🧪 Testing Kanban Persistence & State Management');
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty task arrays', () => {
      const emptyTasks: Task[] = [];
      const event = createMockDragDropEvent(
        emptyTasks,
        emptyTasks,
        0,
        0,
        'backlog-list'
      );

      expect(() => component.onDrop(event)).not.toThrow();
    });

    it('should handle invalid container IDs gracefully', () => {
      const result = (component as any).getStatusFromContainerId('invalid-list');
      expect(result).toBe(TaskStatus.BACKLOG); // Should default to backlog
    });

    it('should handle drag operations with null or undefined data', () => {
      const event = createMockDragDropEvent(
        [null as any],
        [null as any],
        0,
        0,
        'backlog-list'
      );

      expect(() => component.onDrop(event)).not.toThrow();
    });

    it('should handle rapid successive drag operations', () => {
      const backlogTasks = component.getTasksForColumn(TaskStatus.BACKLOG);
      
      // Simulate rapid drag operations
      for (let i = 0; i < 5; i++) {
        const event = createMockDragDropEvent(
          backlogTasks,
          backlogTasks,
          0,
          1,
          'backlog-list'
        );
        component.onDrop(event);
      }

      expect(taskService.handleDragDropOperation).toHaveBeenCalledTimes(5);
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
      data: previousData
    } as any;

    const currentContainer = {
      id: containerId,
      data: currentData
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
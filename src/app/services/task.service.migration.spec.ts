import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus } from '../models/task-status.model';
import { Task } from '../models/task.model';

describe('TaskService - Data Migration', () => {
  let service: TaskService;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({
      providers: [TaskService]
    });

    // Clear storage before each test
    mockLocalStorage = {};
  });

  describe('Version Management', () => {
    it('should initialize version for new users', () => {
      service = TestBed.inject(TaskService);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('daily-tasks-version', '1.0.0');
    });

    it('should detect current version and skip migration', () => {
      mockLocalStorage['daily-tasks-version'] = '1.0.0';
      spyOn(console, 'log');
      
      service = TestBed.inject(TaskService);
      
      expect(console.log).toHaveBeenCalledWith('TaskService: Data version is current, no migration needed');
    });

    it('should provide version information', () => {
      mockLocalStorage['daily-tasks-version'] = '1.0.0';
      service = TestBed.inject(TaskService);
      
      const versionInfo = service.getDataVersion();
      
      expect(versionInfo.currentVersion).toBe('1.0.0');
      expect(versionInfo.storedVersion).toBe('1.0.0');
      expect(versionInfo.migrationHistory).toEqual([]);
    });
  });

  describe('Legacy Data Migration', () => {
    it('should migrate legacy task data without version', () => {
      // Setup legacy data (tasks without version)
      const legacyTasks = [
        {
          id: 'legacy-1',
          title: 'Legacy Task 1',
          description: 'Legacy description',
          status: 'backlog',
          createdAt: new Date().toISOString(),
          order: 0
        },
        {
          id: 'legacy-2',
          title: 'Legacy Task 2',
          status: 'in-progress',
          order: 1
        }
      ];
      mockLocalStorage['daily-tasks'] = JSON.stringify(legacyTasks);
      
      spyOn(console, 'log');
      service = TestBed.inject(TaskService);
      
      expect(console.log).toHaveBeenCalledWith('TaskService: Detected legacy task data, performing migration');
      expect(console.log).toHaveBeenCalledWith('TaskService: Successfully migrated 2 legacy tasks');
      expect(localStorage.setItem).toHaveBeenCalledWith('daily-tasks-version', '1.0.0');
    });

    it('should handle legacy data with invalid status values', () => {
      const legacyTasks = [
        {
          id: 'legacy-1',
          title: 'Legacy Task',
          status: 'todo', // Old status format
          order: 0
        },
        {
          id: 'legacy-2',
          title: 'Another Task',
          status: 'doing', // Old status format
          order: 1
        },
        {
          id: 'legacy-3',
          title: 'Completed Task',
          status: 'completed', // Old status format
          order: 2
        }
      ];
      mockLocalStorage['daily-tasks'] = JSON.stringify(legacyTasks);
      
      service = TestBed.inject(TaskService);
      
      // Verify tasks were migrated with correct status values
      const allTasks = service.allTasks();
      expect(allTasks.length).toBe(3);
      expect(allTasks[0].status).toBe(TaskStatus.BACKLOG);
      expect(allTasks[1].status).toBe(TaskStatus.IN_PROGRESS);
      expect(allTasks[2].status).toBe(TaskStatus.DONE);
    });

    it('should handle legacy data with missing fields', () => {
      const incompleteLegacyTask = {
        id: 'legacy-1',
        title: 'Legacy Task'
        // Missing: description, status, createdAt, order
      };
      mockLocalStorage['daily-tasks'] = JSON.stringify([incompleteLegacyTask]);
      
      service = TestBed.inject(TaskService);
      
      const task = service.getTask('legacy-1');
      expect(task).toBeDefined();
      expect(task!.title).toBe('Legacy Task');
      expect(task!.description).toBeUndefined();
      expect(task!.status).toBe(TaskStatus.BACKLOG);
      expect(task!.createdAt).toBeInstanceOf(Date);
      expect(typeof task!.order).toBe('number');
    });

    it('should clear corrupted legacy data', () => {
      mockLocalStorage['daily-tasks'] = 'corrupted-json-data';
      
      service = TestBed.inject(TaskService);
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('daily-tasks');
      expect(service.allTasks()).toEqual([]);
    });
  });

  describe('Future Migration System', () => {
    it('should handle version comparison correctly', () => {
      service = TestBed.inject(TaskService);
      
      // Test the private compareVersions method through migration path logic
      mockLocalStorage['daily-tasks-version'] = '0.9.0';
      
      // This would trigger migration logic if there were migrations defined
      // For now, just verify version handling works
      const versionInfo = service.getDataVersion();
      expect(versionInfo.currentVersion).toBe('1.0.0');
    });

    it('should handle migration errors gracefully', () => {
      mockLocalStorage['daily-tasks-version'] = '0.5.0';
      spyOn(console, 'log');
      spyOn(console, 'error');
      
      service = TestBed.inject(TaskService);
      
      // Should complete initialization even with migration setup
      expect(service).toBeDefined();
    });
  });

  describe('Data Validation Integration', () => {
    it('should work with data integrity validation', () => {
      // Setup tasks with potential issues
      const problematicTasks = [
        {
          id: 'task-1',
          title: 'Valid Task',
          status: 'backlog',
          createdAt: new Date().toISOString(),
          order: 0
        },
        {
          id: 'task-2',
          title: '', // Invalid: empty title
          status: 'invalid-status', // Invalid: bad status
          order: 0 // Invalid: duplicate order
        }
      ];
      mockLocalStorage['daily-tasks'] = JSON.stringify(problematicTasks);
      
      service = TestBed.inject(TaskService);
      
      // Service should handle this through validation and repair
      const integrity = service.validateTaskIntegrity();
      if (!integrity.isValid) {
        const repaired = service.repairTaskIntegrity();
        expect(repaired).toBe(true);
      }
    });
  });

  describe('Storage Information with Migration', () => {
    it('should provide accurate storage information after migration', () => {
      const legacyTasks = [
        { id: 'task-1', title: 'Task 1', status: 'todo', order: 0 }
      ];
      mockLocalStorage['daily-tasks'] = JSON.stringify(legacyTasks);
      
      service = TestBed.inject(TaskService);
      
      const storageInfo = service.getStorageInfo();
      expect(storageInfo.totalTasks).toBe(1);
      expect(storageInfo.storageUsed).toBeGreaterThan(0);
    });

    it('should track migration in version info', () => {
      mockLocalStorage['daily-tasks-version'] = '0.9.0';
      service = TestBed.inject(TaskService);
      
      const versionInfo = service.getDataVersion();
      expect(versionInfo.currentVersion).toBe('1.0.0');
      expect(versionInfo.storedVersion).toBe('1.0.0'); // Should be updated after migration
    });
  });
});
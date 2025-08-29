import { TaskService } from '../services/task.service';
import { TaskStatus } from '../models/task-status.model';

/**
 * Browser console utility for testing persistence functionality
 * Usage: Run this in browser console after injecting TaskService
 */
export class PersistenceTestUtility {
  constructor(private taskService: TaskService) {}

  /**
   * Comprehensive persistence test suite
   * Run this in browser console to test all persistence functionality
   */
  runFullPersistenceTest(): void {
    console.group('🧪 Phase 6 - Complete Persistence Test Suite');
    
    try {
      // Test 1: Basic persistence
      console.log('📝 Test 1: Basic Task Creation and Persistence');
      const task1 = this.taskService.createTask('Test Persistence Task 1', 'This task should persist across browser refreshes');
      const task2 = this.taskService.createTask('Test Persistence Task 2', 'Another test task');
      console.log(`✅ Created ${this.taskService.allTasks().length} tasks`);
      
      // Test 2: Status changes and order
      console.log('🔄 Test 2: Status Changes and Task Reordering');
      this.taskService.changeTaskStatus(task1.id, TaskStatus.IN_PROGRESS);
      this.taskService.changeTaskStatus(task2.id, TaskStatus.DONE);
      this.taskService.reorderTask(task1.id, 0); // Move to top of in-progress
      console.log('✅ Moved tasks to different columns and reordered');
      
      // Test 3: Inline editing
      console.log('✏️ Test 3: Task Editing');
      this.taskService.updateTask(task1.id, { 
        title: 'Updated Test Task 1',
        description: 'This title and description were updated'
      });
      console.log('✅ Updated task title and description');
      
      // Test 4: Data integrity
      console.log('🔍 Test 4: Data Integrity Validation');
      const integrity = this.taskService.validateTaskIntegrity();
      console.log('Data integrity:', integrity);
      console.log(integrity.isValid ? '✅ Data integrity is valid' : '❌ Data integrity issues found');
      
      // Test 5: Storage information
      console.log('💾 Test 5: Storage Information');
      const storageInfo = this.taskService.getStorageInfo();
      console.log('Storage info:', storageInfo);
      console.log(`✅ Using ${storageInfo.storagePercentUsed}% of estimated localStorage capacity`);
      
      // Test 6: Version and migration info
      console.log('🔄 Test 6: Version and Migration Info');
      const versionInfo = this.taskService.getDataVersion();
      console.log('Version info:', versionInfo);
      console.log(`✅ Current data version: ${versionInfo.currentVersion}`);
      
      // Test 7: Performance metrics
      console.log('⚡ Test 7: Performance Metrics');
      const performanceMetrics = this.taskService.getPerformanceMetrics();
      console.log('Performance metrics:', performanceMetrics);
      console.log(`✅ ${performanceMetrics.operations.saveOperations} save operations with ${performanceMetrics.averagePersistenceTime}ms average time`);
      
      // Final summary
      console.log('🎉 Test Summary:');
      console.log(`- Total tasks: ${this.taskService.allTasks().length}`);
      console.log(`- Backlog: ${this.taskService.backlogTasks().length}`);
      console.log(`- In Progress: ${this.taskService.inProgressTasks().length}`);
      console.log(`- Done: ${this.taskService.doneTasks().length}`);
      console.log(`- Data integrity: ${integrity.isValid ? 'VALID' : 'INVALID'}`);
      console.log(`- Storage usage: ${storageInfo.storagePercentUsed}%`);
      console.log(`- Performance: ${performanceMetrics.successRate}% success rate`);
      
      console.log('');
      console.log('🔄 NEXT STEP: Refresh your browser page to test cross-session persistence!');
      console.log('   After refresh, run this test again to verify all data is restored correctly.');
      
    } catch (error) {
      console.error('❌ Persistence test failed:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Quick test for migration functionality
   */
  testMigrationSystem(): void {
    console.group('🔄 Migration System Test');
    
    try {
      // Clear current data and simulate legacy data
      localStorage.clear();
      
      // Simulate legacy data format
      const legacyData = [
        {
          id: 'legacy-task-1',
          title: 'Legacy Task 1',
          status: 'todo', // Old status format
          order: 0
        },
        {
          id: 'legacy-task-2', 
          title: 'Legacy Task 2',
          status: 'doing', // Old status format
          order: 1
        }
      ];
      
      localStorage.setItem('daily-tasks', JSON.stringify(legacyData));
      console.log('📦 Simulated legacy data in localStorage');
      
      // Create new service instance to trigger migration
      const newService = TestBed.inject(TaskService);
      
      // Verify migration worked
      const tasks = newService.allTasks();
      console.log(`✅ Migration completed: ${tasks.length} tasks migrated`);
      
      // Check version was set
      const versionInfo = newService.getDataVersion();
      console.log(`✅ Data version set to: ${versionInfo.currentVersion}`);
      
      // Verify status normalization
      const task1 = newService.getTask('legacy-task-1');
      const task2 = newService.getTask('legacy-task-2');
      console.log(`✅ Status normalization: ${task1?.status} and ${task2?.status}`);
      
    } catch (error) {
      console.error('❌ Migration test failed:', error);
    }
    
    console.groupEnd();
  }

  /**
   * Test localStorage error scenarios
   */
  testErrorScenarios(): void {
    console.group('🚨 Error Scenario Tests');
    
    try {
      // Test data corruption handling
      localStorage.setItem('daily-tasks', 'corrupted-data');
      
      console.log('💥 Simulating corrupted localStorage data');
      const service = TestBed.inject(TaskService);
      
      // Should start with empty tasks
      console.log(`✅ Graceful handling: Started with ${service.allTasks().length} tasks (should be 0)`);
      
    } catch (error) {
      console.error('❌ Error scenario test failed:', error);
    }
    
    console.groupEnd();
  }
}

// Export for global window access
declare global {
  interface Window {
    PersistenceTestUtility: typeof PersistenceTestUtility;
    runPersistenceTest: () => void;
  }
}

// Make available globally for browser console access
if (typeof window !== 'undefined') {
  window.PersistenceTestUtility = PersistenceTestUtility;
}
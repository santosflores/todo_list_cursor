# Kanban Board Drag & Drop Testing Guide

This guide explains how to test the drag-and-drop functionality of the kanban board component comprehensively.

## 🧪 Testing Overview

The kanban board includes comprehensive testing capabilities covering:
- ✅ **Unit Tests** - Individual component and service functionality
- ✅ **Integration Tests** - End-to-end drag-and-drop workflows
- ✅ **Performance Tests** - Scalability and efficiency testing
- ✅ **Error Scenario Tests** - Edge cases and error handling
- ✅ **Manual Testing Tools** - Browser console utilities

## 🚀 Quick Start

### 1. Running Automated Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test -- --include="**/kanban-board.component.spec.ts"
npm test -- --include="**/kanban-board.performance.spec.ts"
npm test -- --include="**/kanban-board.integration.spec.ts"
```

### 2. Manual Testing in Browser Console

Open the browser console and use these commands:

```javascript
// Quick smoke test
document.querySelector('app-kanban-board').quickDragDropTest()

// Comprehensive test suite
window.dragDropTestRunner.runAllTests()

// Create test data
document.querySelector('app-kanban-board').createTestTasks(10)

// Clear all tasks
document.querySelector('app-kanban-board').clearAllTasks()

// Export current state
document.querySelector('app-kanban-board').exportKanbanState()

// Test persistence
document.querySelector('app-kanban-board').testPersistence()
```

## 📋 Test Categories

### 1. Basic Functionality Tests

**What's tested:**
- ✅ Intra-column task reordering
- ✅ Inter-column task movement
- ✅ Status mapping accuracy
- ✅ Visual feedback states
- ✅ Multiple task operations

**How to run:**
```javascript
// Manual test
const component = document.querySelector('app-kanban-board');
component.quickDragDropTest();

// Automated test
npm test -- --include="**/kanban-board.component.spec.ts"
```

### 2. Performance Tests

**What's tested:**
- ⚡ Operation speed with large datasets
- 💾 Memory usage optimization
- 📈 Scalability with increasing task counts
- 🔄 Concurrent operation handling

**Benchmarks:**
- Single operation: < 10ms
- 100 tasks rendering: < 100ms
- 500 tasks rendering: < 500ms
- Memory: No leaks during 100+ operations

**How to run:**
```javascript
// Performance test suite
npm test -- --include="**/kanban-board.performance.spec.ts"

// Manual performance check
window.dragDropTestRunner.runAllTests().then(results => {
  const perfSuite = results.find(s => s.name === 'Performance');
  console.log('Performance Results:', perfSuite);
});
```

### 3. Integration Tests

**What's tested:**
- 🔄 Full TaskService integration
- 💾 Persistence across browser sessions
- 🏗️ Complex multi-step operations
- 🛡️ Data integrity maintenance

**How to run:**
```javascript
// Integration tests
npm test -- --include="**/kanban-board.integration.spec.ts"

// Manual integration test
const component = document.querySelector('app-kanban-board');
component.createTestTasks(5);
// Perform drag operations manually
component.testPersistence();
```

### 4. Error Scenario Tests

**What's tested:**
- ❌ Persistence failures
- 🚨 Data corruption recovery
- 📦 Storage quota exceeded
- 🔧 Service error handling

**How to run:**
```javascript
// Error scenario testing
const component = document.querySelector('app-kanban-board');
component.simulateErrorScenarios();

// Test specific error scenarios
window.dragDropTestRunner.runAllTests().then(results => {
  const errorSuite = results.find(s => s.name === 'Error Scenarios');
  console.log('Error Handling Results:', errorSuite);
});
```

## 🎯 Specific Test Scenarios

### Scenario 1: Large Dataset Performance

```javascript
// Create large dataset
const component = document.querySelector('app-kanban-board');
component.clearAllTasks();

// Create 200 tasks
for (let i = 0; i < 200; i++) {
  component.taskService.createTask(`Task ${i}`, `Description ${i}`);
}

// Test performance
console.time('Large Dataset Render');
// Perform drag operations
console.timeEnd('Large Dataset Render');
```

### Scenario 2: Rapid Operations Test

```javascript
// Test rapid successive operations
const backlogTasks = component.getTasksForColumn('backlog');
const startTime = performance.now();

for (let i = 0; i < 10; i++) {
  // Simulate rapid reordering
  setTimeout(() => {
    // Manual drag simulation would go here
    console.log(`Operation ${i} completed`);
  }, i * 100);
}

setTimeout(() => {
  const duration = performance.now() - startTime;
  console.log(`Rapid operations completed in ${duration}ms`);
}, 1100);
```

### Scenario 3: Error Recovery Test

```javascript
// Test error recovery
const component = document.querySelector('app-kanban-board');

// Simulate storage failure
const originalHandleDragDrop = component.taskService.handleDragDropOperation;
component.taskService.handleDragDropOperation = () => ({ 
  success: false, 
  error: 'Simulated failure' 
});

// Attempt operation (should fail gracefully)
// ... perform drag operation ...

// Restore functionality
component.taskService.handleDragDropOperation = originalHandleDragDrop;
```

## 📊 Test Results Analysis

### Understanding Test Output

```javascript
// Run comprehensive tests
const results = await window.dragDropTestRunner.runAllTests();

// Analyze results
results.forEach(suite => {
  console.log(`Suite: ${suite.name}`);
  console.log(`Success Rate: ${suite.successRate}%`);
  console.log(`Duration: ${suite.totalDuration}ms`);
  
  // Check failed tests
  const failedTests = suite.tests.filter(t => !t.success);
  if (failedTests.length > 0) {
    console.warn('Failed tests:', failedTests);
  }
});

// Export results for analysis
const exportedResults = window.dragDropTestRunner.exportTestResults();
console.log('Detailed Results:', JSON.parse(exportedResults));
```

### Performance Metrics

```javascript
// Get performance metrics
const component = document.querySelector('app-kanban-board');
const metrics = component.taskService.getPerformanceMetrics();

console.log('Performance Metrics:');
console.log(`- Average operation time: ${metrics.averagePersistenceTime}ms`);
console.log(`- Success rate: ${metrics.successRate}%`);
console.log(`- Operations per minute: ${metrics.operationsPerMinute}`);
console.log(`- Total operations: ${Object.values(metrics.operations).reduce((a, b) => a + b, 0)}`);
```

## 🔧 Debugging Tools

### State Inspection

```javascript
// Inspect current state
const component = document.querySelector('app-kanban-board');

// Export full state
const state = JSON.parse(component.exportKanbanState());
console.log('Current State:', state);

// Check data integrity
const integrity = component.taskService.validateTaskIntegrity();
console.log('Data Integrity:', integrity);

// Storage information
const storage = component.taskService.getStorageInfo();
console.log('Storage Info:', storage);
```

### Visual Debugging

```javascript
// Monitor drag state changes
const component = document.querySelector('app-kanban-board');

// Watch drag state
const originalSetDragging = component.isDragging.set;
component.isDragging.set = function(value) {
  console.log('Drag state changed:', value);
  return originalSetDragging.call(this, value);
};

// Watch column changes
const originalSetSourceColumn = component.dragSourceColumn.set;
component.dragSourceColumn.set = function(value) {
  console.log('Source column changed:', value);
  return originalSetSourceColumn.call(this, value);
};
```

## 🏅 Best Practices

### 1. Test Data Management

```javascript
// Always clean up test data
beforeEach(() => {
  document.querySelector('app-kanban-board').clearAllTasks();
});

// Use consistent test data
const createStandardTestData = () => {
  const component = document.querySelector('app-kanban-board');
  component.createTestTasks(6); // Creates standard set
};
```

### 2. Performance Testing

```javascript
// Always measure performance
const measureOperation = (operation, name) => {
  const start = performance.now();
  operation();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return duration;
};

// Example usage
measureOperation(() => {
  // Drag operation here
}, 'Task Reorder Operation');
```

### 3. Error Testing

```javascript
// Test error scenarios systematically
const testErrorScenario = async (scenarioName, errorSimulation) => {
  console.group(`Testing: ${scenarioName}`);
  
  try {
    await errorSimulation();
    console.log('✅ Error handled gracefully');
  } catch (error) {
    console.error('❌ Unhandled error:', error);
  }
  
  console.groupEnd();
};
```

## 📈 Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Single drag operation | < 10ms | `performance.now()` timing |
| 100 tasks render | < 100ms | Component initialization |
| 500 tasks render | < 500ms | Large dataset test |
| Memory usage | No leaks | Manual GC monitoring |
| Success rate | > 99% | Operation success tracking |
| Storage efficiency | < 1MB/1000 tasks | localStorage analysis |

### Running Benchmarks

```javascript
// Automated benchmark suite
const runBenchmarks = async () => {
  const results = await window.dragDropTestRunner.runAllTests();
  const perfSuite = results.find(s => s.name === 'Performance');
  
  perfSuite.tests.forEach(test => {
    const status = test.duration < 50 ? '✅' : '⚠️';
    console.log(`${status} ${test.testName}: ${test.duration.toFixed(2)}ms`);
  });
};

runBenchmarks();
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests failing in CI/CD**
   ```javascript
   // Increase timeouts for slower environments
   jest.setTimeout(30000);
   ```

2. **Memory leaks detected**
   ```javascript
   // Check for proper cleanup
   afterEach(() => {
     component.isDragging.set(false);
     component.dragSourceColumn.set(null);
     component.dragOverColumn.set(null);
   });
   ```

3. **Performance degradation**
   ```javascript
   // Monitor performance metrics
   const metrics = component.taskService.getPerformanceMetrics();
   if (metrics.averagePersistenceTime > 50) {
     console.warn('Performance degradation detected');
   }
   ```

### Debug Mode

```javascript
// Enable debug mode
window.KANBAN_DEBUG = true;

// This will log all drag operations
const component = document.querySelector('app-kanban-board');
component.enableDebugMode?.();
```

---

## 📝 Contributing to Tests

When adding new drag-and-drop features:

1. **Add unit tests** to `kanban-board.component.spec.ts`
2. **Add integration tests** to `kanban-board.integration.spec.ts`
3. **Add performance tests** to `kanban-board.performance.spec.ts`
4. **Update test runner** with new scenarios
5. **Document new testing procedures** in this file

---

**Happy Testing! 🎉**

For questions or issues, please check the component documentation or create an issue in the project repository.
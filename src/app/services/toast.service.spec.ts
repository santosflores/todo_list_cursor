import { TestBed } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showSuccess', () => {
    it('should add a success toast', () => {
      service.showSuccess('Success message');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Success message');
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].duration).toBe(5000);
    });

    it('should auto-dismiss after specified duration', () => {
      service.showSuccess('Success message', 1000);
      
      expect(service.toasts().length).toBe(1);
      
      jasmine.clock().tick(1001);
      
      expect(service.toasts().length).toBe(0);
    });

    it('should allow custom duration', () => {
      service.showSuccess('Success message', 3000);
      
      const toast = service.toasts()[0];
      expect(toast.duration).toBe(3000);
    });
  });

  describe('showError', () => {
    it('should add an error toast', () => {
      service.showError('Error message');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Error message');
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].duration).toBe(0); // No auto-dismiss by default
    });

    it('should not auto-dismiss by default', () => {
      service.showError('Error message');
      
      expect(service.toasts().length).toBe(1);
      
      jasmine.clock().tick(10000);
      
      expect(service.toasts().length).toBe(1);
    });

    it('should auto-dismiss when duration is specified', () => {
      service.showError('Error message', 2000);
      
      expect(service.toasts().length).toBe(1);
      
      jasmine.clock().tick(2001);
      
      expect(service.toasts().length).toBe(0);
    });
  });

  describe('showWarning', () => {
    it('should add a warning toast', () => {
      service.showWarning('Warning message');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Warning message');
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].duration).toBe(5000);
    });
  });

  describe('showInfo', () => {
    it('should add an info toast', () => {
      service.showInfo('Info message');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Info message');
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].duration).toBe(5000);
    });
  });

  describe('removeToast', () => {
    it('should remove toast by ID', () => {
      service.showSuccess('Message 1');
      service.showError('Message 2');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(2);
      
      service.removeToast(toasts[0].id);
      
      const remainingToasts = service.toasts();
      expect(remainingToasts.length).toBe(1);
      expect(remainingToasts[0].message).toBe('Message 2');
    });

    it('should do nothing if toast ID does not exist', () => {
      service.showSuccess('Message 1');
      
      service.removeToast('non-existent-id');
      
      expect(service.toasts().length).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all toasts', () => {
      service.showSuccess('Message 1');
      service.showError('Message 2');
      service.showWarning('Message 3');
      
      expect(service.toasts().length).toBe(3);
      
      service.clearAll();
      
      expect(service.toasts().length).toBe(0);
    });
  });

  describe('toast properties', () => {
    it('should create toast with unique ID', () => {
      service.showSuccess('Message 1');
      service.showSuccess('Message 2');
      
      const toasts = service.toasts();
      expect(toasts[0].id).not.toBe(toasts[1].id);
      expect(toasts[0].id).toBeTruthy();
      expect(toasts[1].id).toBeTruthy();
    });

    it('should trim whitespace from messages', () => {
      service.showSuccess('  Message with spaces  ');
      
      const toast = service.toasts()[0];
      expect(toast.message).toBe('Message with spaces');
    });

    it('should set creation timestamp', () => {
      const beforeTime = new Date();
      service.showSuccess('Message');
      const afterTime = new Date();
      
      const toast = service.toasts()[0];
      expect(toast.createdAt).toBeInstanceOf(Date);
      expect(toast.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(toast.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('multiple toasts', () => {
    it('should maintain order of toasts', () => {
      service.showSuccess('First');
      service.showError('Second');
      service.showWarning('Third');
      
      const toasts = service.toasts();
      expect(toasts.length).toBe(3);
      expect(toasts[0].message).toBe('First');
      expect(toasts[1].message).toBe('Second');
      expect(toasts[2].message).toBe('Third');
    });

    it('should handle multiple auto-dismiss timers', () => {
      service.showSuccess('Message 1', 1000);
      service.showSuccess('Message 2', 2000);
      service.showSuccess('Message 3', 3000);
      
      expect(service.toasts().length).toBe(3);
      
      jasmine.clock().tick(1001);
      expect(service.toasts().length).toBe(2);
      
      jasmine.clock().tick(1000);
      expect(service.toasts().length).toBe(1);
      
      jasmine.clock().tick(1000);
      expect(service.toasts().length).toBe(0);
    });
  });

  describe('toast interface', () => {
    it('should create toast with all required properties', () => {
      service.showInfo('Test message', 1500);
      
      const toast: Toast = service.toasts()[0];
      
      expect(toast.id).toBeDefined();
      expect(typeof toast.id).toBe('string');
      expect(toast.message).toBe('Test message');
      expect(toast.type).toBe('info');
      expect(toast.duration).toBe(1500);
      expect(toast.createdAt).toBeInstanceOf(Date);
    });
  });
});
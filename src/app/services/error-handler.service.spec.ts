import { TestBed } from '@angular/core/testing';
import { ErrorHandlerService } from './error-handler.service';
import { ToastService } from './toast.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let mockToastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['showError', 'showInfo', 'showSuccess']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: ToastService, useValue: toastSpy }
      ]
    });
    
    service = TestBed.inject(ErrorHandlerService);
    mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateTaskInput', () => {
    it('should validate title is required', () => {
      expect(() => service.validateTaskInput('')).toThrowError('Task title is required and cannot be empty');
      expect(() => service.validateTaskInput('   ')).toThrowError('Task title is required and cannot be empty');
    });

    it('should validate title length limit', () => {
      const longTitle = 'a'.repeat(129);
      expect(() => service.validateTaskInput(longTitle)).toThrowError('Task title cannot exceed 128 characters');
    });

    it('should validate description length limit', () => {
      const longDescription = 'a'.repeat(257);
      expect(() => service.validateTaskInput('Valid Title', longDescription))
        .toThrowError('Task description cannot exceed 256 characters');
    });

    it('should pass validation for valid inputs', () => {
      expect(() => service.validateTaskInput('Valid Title', 'Valid description')).not.toThrow();
    });

    it('should pass validation for valid title without description', () => {
      expect(() => service.validateTaskInput('Valid Title')).not.toThrow();
    });

    it('should pass validation for exact limit lengths', () => {
      const exactTitle = 'a'.repeat(128);
      const exactDescription = 'b'.repeat(256);
      expect(() => service.validateTaskInput(exactTitle, exactDescription)).not.toThrow();
    });
  });

  describe('handleError', () => {
    it('should handle storage quota errors', () => {
      const quotaError = new Error('quota exceeded');
      service.handleError(quotaError, 'test context');
      
      expect(mockToastService.showError).toHaveBeenCalledWith(
        jasmine.stringContaining('Storage space is full'),
        6000
      );
    });

    it('should handle validation errors', () => {
      const validationError = new Error('Title cannot exceed 128 characters');
      service.handleError(validationError, 'test context');
      
      expect(mockToastService.showError).toHaveBeenCalledWith(
        'Title cannot exceed 128 characters',
        6000
      );
    });

    it('should handle not found errors', () => {
      const notFoundError = new Error('Task not found');
      service.handleError(notFoundError, 'test context');
      
      expect(mockToastService.showError).toHaveBeenCalledWith(
        jasmine.stringContaining('Data synchronization issue'),
        6000
      );
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong');
      service.handleError(genericError, 'test context');
      
      expect(mockToastService.showError).toHaveBeenCalledWith(
        jasmine.stringContaining('Something went wrong in test context'),
        6000
      );
    });

    it('should not show toast when showToast is false', () => {
      const error = new Error('Test error');
      service.handleError(error, 'test context', false);
      
      expect(mockToastService.showError).not.toHaveBeenCalled();
    });
  });

  describe('handleStorageError', () => {
    it('should handle quota exceeded error', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      expect(() => service.handleStorageError(quotaError))
        .toThrowError('Storage quota exceeded. Please clear some browser data and try again.');
    });

    it('should handle localStorage unavailable', () => {
      const storageError = new Error('localStorage is not available');
      
      expect(() => service.handleStorageError(storageError))
        .toThrowError('Browser storage is not available. Please check your browser settings.');
    });

    it('should handle generic storage errors', () => {
      const storageError = new Error('Generic storage error');
      
      expect(() => service.handleStorageError(storageError))
        .toThrowError('Failed to access browser storage. Please check your browser settings and try again.');
    });
  });
});
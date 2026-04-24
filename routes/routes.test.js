/**
 * Jest Test Suite for User Registration Routes
 * Tests the POST /add endpoint for user creation with comprehensive coverage of
 * success scenarios, edge cases, and error handling.
 */

// Mock the User model completely before requiring the router
jest.mock('../models/users');

const User = require('../models/users');
const router = require('./routes');

/**
 * Utility function to extract the POST /add handler from the router
 * This is necessary because the handler is wrapped in middleware (multer)
 */
function getPostAddHandler() {
  const layer = router.stack.find(
    (layer) => layer.route && layer.route.path === '/add' && layer.route.methods.post
  );

  if (!layer) {
    throw new Error('POST /add route not found');
  }

  // The actual handler is after the multer middleware
  const handlers = layer.route.stack.map((stackLayer) => stackLayer.handle);
  return handlers[1];
}

describe('POST /add - User Creation Route', () => {
  let createUserHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    createUserHandler = getPostAddHandler();
  });

  describe('Success Scenarios', () => {
    test('should create a new user successfully without image', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Alice Example',
          email: 'alice@example.com',
          phone: '123-456-7890'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      // Verify User constructor was called with correct data
      expect(User).toHaveBeenCalledTimes(1);
      expect(User).toHaveBeenCalledWith({
        name: 'Alice Example',
        email: 'alice@example.com',
        phone: '123-456-7890',
        image: 'user_unknown.png' // Default image when no file is uploaded
      });

      // Verify save was called
      expect(saveMock).toHaveBeenCalledTimes(1);

      // Verify session message for success
      expect(req.session.message).toEqual({
        type: 'success',
        message: 'User added successfully'
      });

      // Verify redirect to home page
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should create a new user successfully with uploaded image', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Bob Example',
          email: 'bob@example.com',
          phone: '987-654-3210'
        },
        session: {},
        file: { filename: 'bob-avatar.png' }
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      // Verify User was created with the uploaded image filename
      expect(User).toHaveBeenCalledWith({
        name: 'Bob Example',
        email: 'bob@example.com',
        phone: '987-654-3210',
        image: 'bob-avatar.png'
      });

      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(req.session.message).toEqual({
        type: 'success',
        message: 'User added successfully'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should create a user with special characters in name and email', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: "José García-López",
          email: 'jose.garcia+test@example.co.uk',
          phone: '+1-800-555-1234'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(User).toHaveBeenCalledWith({
        name: "José García-López",
        email: 'jose.garcia+test@example.co.uk',
        phone: '+1-800-555-1234',
        image: 'user_unknown.png'
      });
      expect(req.session.message.type).toBe('success');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases - Missing Required Fields', () => {
    test('should handle missing email field with validation error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: email: Path `email` is required.'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'No Email User',
          phone: '555-555-5555'
          // email is missing
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      // Verify User was still instantiated even with missing email
      expect(User).toHaveBeenCalledWith({
        name: 'No Email User',
        email: undefined,
        phone: '555-555-5555',
        image: 'user_unknown.png'
      });

      // Verify error was caught and stored in session
      expect(req.session.message).toEqual({
        type: 'danger',
        message: 'User validation failed: email: Path `email` is required.'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle missing phone field with validation error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: phone: Path `phone` is required.'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'No Phone User',
          email: 'nophone@example.com'
          // phone is missing
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(User).toHaveBeenCalledWith({
        name: 'No Phone User',
        email: 'nophone@example.com',
        phone: undefined,
        image: 'user_unknown.png'
      });

      expect(req.session.message).toEqual({
        type: 'danger',
        message: 'User validation failed: phone: Path `phone` is required.'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle missing name field with validation error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: name: Path `name` is required.'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          email: 'noname@example.com',
          phone: '555-555-5555'
          // name is missing
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message).toEqual({
        type: 'danger',
        message: 'User validation failed: name: Path `name` is required.'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle all fields missing', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: Multiple paths required'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {},
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases - Empty Field Values', () => {
    test('should handle empty string name field', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: name cannot be empty'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: '',
          email: 'test@example.com',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle empty string email field', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: email cannot be empty'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Test User',
          email: '',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle whitespace-only phone field', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('User validation failed: phone cannot be empty'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '   '
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases - Duplicate User', () => {
    test('should handle duplicate user error when user already exists', async () => {
      const saveMock = jest.fn().mockRejectedValue(new Error('E11000 duplicate key error collection'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Existing User',
          email: 'existing@example.com',
          phone: '111-222-3333'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(req.session.message).toEqual({
        type: 'danger',
        message: 'E11000 duplicate key error collection'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle duplicate email with detailed MongoDB error', async () => {
      const mongoError = new Error(
        'E11000 duplicate key error dup key: { email: "duplicate@example.com" }'
      );
      const saveMock = jest.fn().mockRejectedValue(mongoError);
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Another User',
          email: 'duplicate@example.com',
          phone: '999-888-7777'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(req.session.message.message).toContain('E11000');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases - Database Errors', () => {
    test('should handle general database connection error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('Connection failed: ECONNREFUSED'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message).toEqual({
        type: 'danger',
        message: 'Connection failed: ECONNREFUSED'
      });
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle database timeout error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('Database query timed out after 30000ms'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(req.session.message.message).toContain('timed out');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should handle unexpected database error', async () => {
      const saveMock = jest
        .fn()
        .mockRejectedValue(new Error('Unexpected error: Database operation failed'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message.type).toBe('danger');
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('Edge Cases - Whitespace and Data Trimming', () => {
    test('should accept user data with leading/trailing whitespace', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: {
          name: '  John Doe  ',
          email: '  john@example.com  ',
          phone: '  555-1234  '
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      // The route passes the data as-is; trimming would be handled by validation
      expect(User).toHaveBeenCalledWith({
        name: '  John Doe  ',
        email: '  john@example.com  ',
        phone: '  555-1234  ',
        image: 'user_unknown.png'
      });
      expect(req.session.message.type).toBe('success');
    });
  });

  describe('Edge Cases - Large Data Values', () => {
    test('should handle very long name field', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const longName = 'A'.repeat(500);
      const req = {
        body: {
          name: longName,
          email: 'test@example.com',
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(User).toHaveBeenCalledWith({
        name: longName,
        email: 'test@example.com',
        phone: '555-555-5555',
        image: 'user_unknown.png'
      });
    });

    test('should handle very long email field', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const longEmail = 'a'.repeat(100) + '@example.com';
      const req = {
        body: {
          name: 'Test User',
          email: longEmail,
          phone: '555-555-5555'
        },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(User).toHaveBeenCalledWith({
        name: 'Test User',
        email: longEmail,
        phone: '555-555-5555',
        image: 'user_unknown.png'
      });
    });
  });

  describe('Request/Response Verification', () => {
    test('should always redirect to home page regardless of success or failure', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: { name: 'Test', email: 'test@example.com', phone: '555-5555' },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    test('should always set session.message on success', async () => {
      const saveMock = jest.fn().mockResolvedValue({});
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: { name: 'Test', email: 'test@example.com', phone: '555-5555' },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message).toBeDefined();
      expect(req.session.message.type).toBe('success');
      expect(req.session.message.message).toBeDefined();
    });

    test('should always set session.message on error', async () => {
      const saveMock = jest.fn().mockRejectedValue(new Error('Test error'));
      User.mockImplementation(function (data) {
        this.save = saveMock;
      });

      const req = {
        body: { name: 'Test', email: 'test@example.com', phone: '555-5555' },
        session: {},
        file: null
      };
      const res = {
        redirect: jest.fn()
      };

      await createUserHandler(req, res);

      expect(req.session.message).toBeDefined();
      expect(req.session.message.type).toBe('danger');
      expect(req.session.message.message).toBe('Test error');
    });
  });
});

jest.mock('../models/users', () => jest.fn());

const router = require('./routes');
const User = require('../models/users');

function getAddUserHandler() {
  const addRouteLayer = router.stack.find(
    (layer) => layer.route && layer.route.path === '/add' && layer.route.methods.post
  );

  if (!addRouteLayer) {
    throw new Error('POST /add route was not found');
  }

  return addRouteLayer.route.stack[addRouteLayer.route.stack.length - 1].handle;
}

describe('POST /add handler', () => {
  const addUserHandler = getAddUserHandler();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user successfully', async () => {
    const saveMock = jest.fn().mockResolvedValue({ _id: 'new-id' });
    User.mockImplementation((userData) => ({
      ...userData,
      save: saveMock,
    }));

    const req = {
      body: {
        name: 'Alice',
        email: 'alice@example.com',
        phone: '1234567890',
      },
      file: { filename: 'alice.png' },
      session: {},
    };
    const res = {
      redirect: jest.fn(),
    };

    await addUserHandler(req, res);

    expect(User).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '1234567890',
      image: 'alice.png',
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(req.session.message).toEqual({
      type: 'success',
    //   message: 'User added successfully',
    message: 'User added successfully!', // Intentional error
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('handles duplicate user errors (user already exists)', async () => {
    const duplicateError = Object.assign(new Error('E11000 duplicate key error collection: users'), {
      code: 11000,
    });
    const saveMock = jest.fn().mockRejectedValue(duplicateError);
    User.mockImplementation((userData) => ({
      ...userData,
      save: saveMock,
    }));

    const req = {
      body: {
        name: 'Bob',
        email: 'bob@example.com',
        phone: '9999999999',
      },
      file: { filename: 'bob.png' },
      session: {},
    };
    const res = {
      redirect: jest.fn(),
    };

    await addUserHandler(req, res);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(req.session.message).toEqual({
      type: 'danger',
      message: duplicateError.message,
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  it('handles missing required form fields', async () => {
    const validationError = new Error('users validation failed: name: Path `name` is required.');
    const saveMock = jest.fn().mockRejectedValue(validationError);
    User.mockImplementation((userData) => ({
      ...userData,
      save: saveMock,
    }));

    const req = {
      body: {
        name: '',
        email: 'no-name@example.com',
        phone: '1112223333',
      },
      file: undefined,
      session: {},
    };
    const res = {
      redirect: jest.fn(),
    };

    await addUserHandler(req, res);

    expect(User).toHaveBeenCalledWith({
      name: '',
      email: 'no-name@example.com',
      phone: '1112223333',
      image: 'user_unknown.png',
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(req.session.message).toEqual({
      type: 'danger',
      message: validationError.message,
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

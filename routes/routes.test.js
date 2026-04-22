jest.mock('../models/users');

const User = require('../models/users');
const router = require('./routes');

function getPostAddHandler() {
  const layer = router.stack.find(
    (layer) => layer.route && layer.route.path === '/add' && layer.route.methods.post
  );

  if (!layer) {
    throw new Error('POST /add route not found');
  }

  const handlers = layer.route.stack.map((stackLayer) => stackLayer.handle);
  return handlers[1];
}

describe('POST /add user creation route', () => {
  let createUserHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    createUserHandler = getPostAddHandler();
  });

  test('creates a new user successfully', async () => {
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

    expect(User).toHaveBeenCalledTimes(1);
    expect(User).toHaveBeenCalledWith({
      name: 'Alice Example',
      email: 'alice@example.com',
      phone: '123-456-7890',
      image: 'user_unknown.png'
    });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(req.session.message).toEqual({
      type: 'success',
      message: 'User added successfully'
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  test('creates a new user successfully with uploaded image filename', async () => {
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

    expect(User).toHaveBeenCalledWith({
      name: 'Bob Example',
      email: 'bob@example.com',
      phone: '987-654-3210',
      image: 'bob-avatar.png'
    });
    expect(saveMock).toHaveBeenCalled();
    expect(req.session.message).toEqual({
      type: 'success',
      message: 'User added successfully'
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });

  test('handles duplicate user creation errors when user already exists', async () => {
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

  test('handles missing required form fields by propagating validation errors', async () => {
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
      },
      session: {},
      file: null
    };
    const res = {
      redirect: jest.fn()
    };

    await createUserHandler(req, res);

    expect(User).toHaveBeenCalledWith({
      name: 'No Email User',
      email: undefined,
      phone: '555-555-5555',
      image: 'user_unknown.png'
    });
    expect(req.session.message).toEqual({
      type: 'danger',
      message: 'User validation failed: email: Path `email` is required.'
    });
    expect(res.redirect).toHaveBeenCalledWith('/');
  });
});

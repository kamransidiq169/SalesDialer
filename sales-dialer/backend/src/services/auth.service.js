const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Auth service - handles business logic for authentication
 */
class AuthService {
  /**
   * Login user and generate JWT token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: Object}>}
   */
  static async login(email, password) {
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (user.isActive === false) {
      throw ApiError.unauthorized('Account has been deactivated');
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ fields: ['lastLoginAt'] });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      token,
      user: user.toJSON(),
    };
  }

  /**
   * Get current user by ID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} User object without password
   */
  static async getMe(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user.toJSON();
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<{token: string, user: Object}>}
   */
  static async register(userData) {
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'agent',
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      token,
      user: user.toJSON(),
    };
  }
}

module.exports = AuthService;

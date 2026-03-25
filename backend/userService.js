const db = require('./database');
const bcrypt = require('bcryptjs');

// Hash password
function hashPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Verify password
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/**
 * Register a new user with two passwords:
 * 1. Master Password (for real data)
 * 2. Recovery Password (for decoy data)
 */
function registerUser(username, password, recoveryPassword, email = '') {
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return { success: false, message: 'Username already exists' };

    // We hash both separately. Even if they were the same word, 
    // the hashes would look totally different in the DB.
    const hashedPassword = hashPassword(password);
    const hashedRecovery = hashPassword(recoveryPassword);
    
    const stmt = db.prepare(`
      INSERT INTO users (username, password, recovery_password, email)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(username, hashedPassword, hashedRecovery, email);
    
    return { success: true, message: 'User registered successfully' };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Registration failed' };
  }
}

/**
 * The "Fork" Logic:
 * Checks which password was used and returns a flag to the frontend.
 */
function loginUser(username, inputPassword) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return { success: false, message: 'User not found' };

    // Path 1: Check against Master Password
    if (verifyPassword(inputPassword, user.password)) {
        // Remove sensitive fields before sending user object to frontend
        const safeUser = { id: user.id, username: user.username, email: user.email };
        return { success: true, isDecoy: false, user: safeUser };
    }
    
    // Path 2: Check against Recovery (Decoy) Password
    if (verifyPassword(inputPassword, user.recovery_password)) {
        const safeUser = { id: user.id, username: user.username, email: user.email };
        return { success: true, isDecoy: true, user: safeUser };
    }
    
    return { success: false, message: 'Invalid password' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Login failed' };
  }
}

// Get user info
function getUserInfo(userId) {
  try {
    const user = db.prepare(`
      SELECT id, username, email, storage_used, storage_total, created_at
      FROM users WHERE id = ?
    `).get(userId);
    
    return user || null;
  } catch (error) {
    console.error('Get user info error:', error);
    return null;
  }
}

// Update storage used
function updateStorageUsed(userId, bytes) {
  try {
    const stmt = db.prepare(`
      UPDATE users SET storage_used = storage_used + ? WHERE id = ?
    `);
    stmt.run(bytes, userId);
    return true;
  } catch (error) {
    console.error('Update storage error:', error);
    return false;
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUserInfo,
  updateStorageUsed
};
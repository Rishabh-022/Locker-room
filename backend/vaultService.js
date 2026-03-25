require('dotenv').config();
const db = require('./database');
const CryptoJS = require('crypto-js');

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate that encryption key exists
if (!ENCRYPTION_KEY) {
    console.error('❌ CRITICAL: ENCRYPTION_KEY not found in environment variables!');
    console.error('Please create a .env file with ENCRYPTION_KEY=your-secret-key');
    process.exit(1); // Exit if no encryption key
}

// Encrypt data
function encrypt(text) {
    if (!text) return '';
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Decrypt data
function decrypt(encryptedText) {
    if (!encryptedText) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        return '[Encrypted Content]';
    }
}

// Helper function to get the correct table name
function getTableName(baseName, isDecoy) {
    return isDecoy ? `decoy_${baseName}` : baseName;
}

// ========== PASSWORD OPERATIONS ==========

// Add password (with decoy support)
function addPassword(userId, site, username, password, notes = '', isDecoy = false) {
    try {
        const tableName = getTableName('passwords', isDecoy);
        const encryptedPassword = encrypt(password);
        const encryptedNotes = notes ? encrypt(notes) : '';
        
        const stmt = db.prepare(`
            INSERT INTO ${tableName} (user_id, site, username, password, notes)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(userId, site, username, encryptedPassword, encryptedNotes);
        
        return { 
            success: true, 
            message: 'Password saved successfully',
            id: result.lastInsertRowid 
        };
    } catch (error) {
        console.error('Add password error:', error);
        return { success: false, message: 'Failed to save password' };
    }
}

// Get all passwords for user (with decoy support)
function getPasswords(userId, isDecoy = false, showDeleted = false) {
    try {
        const tableName = getTableName('passwords', isDecoy);
        
        let query = `SELECT * FROM ${tableName} WHERE user_id = ?`;
        if (!showDeleted) {
            query += ` AND is_deleted = 0`;
        }
        query += ` ORDER BY is_favorite DESC, created_at DESC`;
        
        const passwords = db.prepare(query).all(userId);
        
        // Decrypt passwords and notes
        return passwords.map(p => ({
            ...p,
            password: decrypt(p.password),
            notes: p.notes ? decrypt(p.notes) : ''
        }));
    } catch (error) {
        console.error('Get passwords error:', error);
        return [];
    }
}

// Update password (with decoy support)
function updatePassword(id, userId, site, username, password, notes, isDecoy = false) {
    try {
        const tableName = getTableName('passwords', isDecoy);
        const encryptedPassword = encrypt(password);
        const encryptedNotes = notes ? encrypt(notes) : '';
        
        const stmt = db.prepare(`
            UPDATE ${tableName} 
            SET site = ?, username = ?, password = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ? AND is_deleted = 0
        `);
        
        const result = stmt.run(site, username, encryptedPassword, encryptedNotes, id, userId);
        
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'Password updated' : 'Password not found'
        };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, message: 'Update failed' };
    }
}

// ========== TRASH AND FAVORITE OPERATIONS ==========

// Move to trash (soft delete)
function moveToTrash(type, id, userId, isDecoy = false) {
    try {
        const tableName = getTableName(type, isDecoy);
        // Use direct table name since 'type' is passed as 'passwords', 'notes', etc.
        const stmt = db.prepare(`UPDATE ${tableName} SET is_deleted = 1 WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        return { 
            success: result.changes > 0, 
            message: result.changes > 0 ? 'Item moved to trash' : 'Item not found' 
        };
    } catch (error) {
        console.error('Move to trash error:', error);
        return { success: false, message: 'Database error' };
    }
}

// Restore from trash
function restoreFromTrash(type, id, userId, isDecoy = false) {
    try {
        const tableName = getTableName(type, isDecoy);
        const stmt = db.prepare(`UPDATE ${tableName} SET is_deleted = 0 WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'Item restored' : 'Item not found'
        };
    } catch (error) {
        console.error('Restore from trash error:', error);
        return { success: false, message: 'Failed to restore' };
    }
}

// Permanently delete from database
function permanentDelete(type, id, userId, isDecoy = false) {
    try {
        const tableName = getTableName(type, isDecoy);
        const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'Item permanently deleted' : 'Item not found'
        };
    } catch (error) {
        console.error('Permanent delete error:', error);
        return { success: false, message: 'Delete failed' };
    }
}

// Mark as favorite
function toggleFavorite(type, id, userId, status, isDecoy = false) {
    try {
        const tableName = getTableName(type, isDecoy);
        const stmt = db.prepare(`UPDATE ${tableName} SET is_favorite = ? WHERE id = ? AND user_id = ?`);
        const result = stmt.run(status ? 1 : 0, id, userId);
        return { 
            success: result.changes > 0, 
            message: result.changes > 0 ? (status ? 'Added to favorites' : 'Removed from favorites') : 'Item not found' 
        };
    } catch (error) {
        console.error('Toggle favorite error:', error);
        return { success: false, message: 'Database error' };
    }
}

// Legacy delete function (now uses soft delete)
function deletePassword(id, userId, isDecoy = false) {
    return moveToTrash('passwords', id, userId, isDecoy);
}

// Get trash items
function getTrashItems(userId, isDecoy = false) {
    try {
        const passwordsTable = getTableName('passwords', isDecoy);
        const passwords = db.prepare(`
            SELECT *, 'password' as item_type FROM ${passwordsTable} 
            WHERE user_id = ? AND is_deleted = 1 
            ORDER BY updated_at DESC
        `).all(userId);
        
        const notesTable = getTableName('notes', isDecoy);
        const notes = db.prepare(`
            SELECT *, 'note' as item_type FROM ${notesTable} 
            WHERE user_id = ? AND is_deleted = 1 
            ORDER BY updated_at DESC
        `).all(userId);
        
        const filesTable = getTableName('files', isDecoy);
        const files = db.prepare(`
            SELECT *, 'file' as item_type FROM ${filesTable} 
            WHERE user_id = ? AND is_deleted = 1 
            ORDER BY updated_at DESC
        `).all(userId);
        
        return { passwords, notes, files };
    } catch (error) {
        console.error('Get trash items error:', error);
        return { passwords: [], notes: [], files: [] };
    }
}

// ========== NOTE OPERATIONS ==========

// Add note (with decoy support)
function addNote(userId, title, content, isDecoy = false) {
    try {
        const tableName = getTableName('notes', isDecoy);
        const encryptedContent = encrypt(content);
        
        const stmt = db.prepare(`
            INSERT INTO ${tableName} (user_id, title, content)
            VALUES (?, ?, ?)
        `);
        
        const result = stmt.run(userId, title, encryptedContent);
        
        return { 
            success: true, 
            message: 'Note saved successfully',
            id: result.lastInsertRowid 
        };
    } catch (error) {
        console.error('Add note error:', error);
        return { success: false, message: 'Failed to save note' };
    }
}

// Get all notes for user (with decoy support)
function getNotes(userId, isDecoy = false, showDeleted = false) {
    try {
        const tableName = getTableName('notes', isDecoy);
        
        let query = `SELECT * FROM ${tableName} WHERE user_id = ?`;
        if (!showDeleted) {
            query += ` AND is_deleted = 0`;
        }
        query += ` ORDER BY is_favorite DESC, created_at DESC`;
        
        const notes = db.prepare(query).all(userId);
        
        // Decrypt content
        return notes.map(n => ({
            ...n,
            content: decrypt(n.content)
        }));
    } catch (error) {
        console.error('Get notes error:', error);
        return [];
    }
}

// Update note (with decoy support)
function updateNote(id, userId, title, content, isDecoy = false) {
    try {
        const tableName = getTableName('notes', isDecoy);
        const encryptedContent = encrypt(content);
        
        const stmt = db.prepare(`
            UPDATE ${tableName} 
            SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ? AND is_deleted = 0
        `);
        
        const result = stmt.run(title, encryptedContent, id, userId);
        
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'Note updated' : 'Note not found'
        };
    } catch (error) {
        console.error('Update note error:', error);
        return { success: false, message: 'Update failed' };
    }
}

// Legacy delete note function (now uses soft delete)
function deleteNote(id, userId, isDecoy = false) {
    return moveToTrash('notes', id, userId, isDecoy);
}

// Optional: Function to change encryption key (for future use)
function changeEncryptionKey(newKey) {
    // This would require re-encrypting all data
    // Not implemented for simplicity
    console.log('Key change functionality would require re-encryption');
}

module.exports = {
    addPassword,
    getPasswords,
    updatePassword,
    deletePassword,
    addNote,
    getNotes,
    updateNote,
    deleteNote,
    // New functions
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    toggleFavorite,
    getTrashItems
};
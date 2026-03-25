const db = require('./database');

// Helper to get table name
function getTableName(baseName, isDecoy) {
    return isDecoy ? `decoy_${baseName}` : baseName;
}

// Save file record
function saveFileRecord(userId, name, size, type, filePath, isDecoy = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        const stmt = db.prepare(`INSERT INTO ${tableName} (user_id, name, size, type, path) VALUES (?, ?, ?, ?, ?)`);
        const result = stmt.run(userId, name, size, type, filePath);
        if (!isDecoy) {
            db.prepare(`UPDATE users SET storage_used = storage_used + ? WHERE id = ?`).run(size, userId);
        }
        return { 
            success: true, 
            id: result.lastInsertRowid,
            message: 'File saved successfully'
        };
    } catch (error) {
        console.error('Save error:', error);
        return { success: false, message: 'Failed to save file' };
    }
}

// Get files
function getFiles(userId, isDecoy = false, showDeleted = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        let query = `SELECT * FROM ${tableName} WHERE user_id = ?`;
        if (!showDeleted) query += ` AND is_deleted = 0`;
        query += ` ORDER BY is_favorite DESC, created_at DESC`;
        return db.prepare(query).all(userId);
    } catch (error) {
        console.error('Get files error:', error);
        return [];
    }
}

// Move to trash (Soft Delete)
function moveToTrash(id, userId, isDecoy = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        const stmt = db.prepare(`UPDATE ${tableName} SET is_deleted = 1 WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'File moved to trash' : 'File not found'
        };
    } catch (error) {
        console.error('Move to trash error:', error);
        return { success: false, message: 'Failed to move to trash' };
    }
}

// Restore from trash
function restoreFromTrash(id, userId, isDecoy = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        const stmt = db.prepare(`UPDATE ${tableName} SET is_deleted = 0 WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'File restored from trash' : 'File not found'
        };
    } catch (error) {
        console.error('Restore from trash error:', error);
        return { success: false, message: 'Failed to restore' };
    }
}

// Permanent Delete
function permanentDelete(id, userId, isDecoy = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        const file = db.prepare(`SELECT size FROM ${tableName} WHERE id = ? AND user_id = ?`).get(id, userId);
        const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`);
        const result = stmt.run(id, userId);
        if (result.changes > 0 && !isDecoy && file) {
            db.prepare(`UPDATE users SET storage_used = storage_used - ? WHERE id = ?`).run(file.size, userId);
        }
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? 'File permanently deleted' : 'File not found'
        };
    } catch (error) {
        console.error('Permanent delete error:', error);
        return { success: false, message: 'Failed to delete' };
    }
}

// Toggle Favorite
function toggleFavorite(id, userId, status, isDecoy = false) {
    try {
        const tableName = getTableName('files', isDecoy);
        const stmt = db.prepare(`UPDATE ${tableName} SET is_favorite = ? WHERE id = ? AND user_id = ?`);
        const result = stmt.run(status ? 1 : 0, id, userId);
        return { 
            success: result.changes > 0,
            message: result.changes > 0 ? (status ? 'Added to favorites' : 'Removed from favorites') : 'File not found'
        };
    } catch (error) {
        console.error('Toggle favorite error:', error);
        return { success: false, message: 'Failed to update favorite status' };
    }
}

// Get total storage used (only active files)
function getTotalStorageUsed(userId, isDecoy) {
    try {
        const tableName = getTableName('files', isDecoy);
        const result = db.prepare(`SELECT SUM(size) as total FROM ${tableName} WHERE user_id = ? AND is_deleted = 0`).get(userId);
        return result.total || 0;
    } catch (error) {
        console.error('Error calculating storage:', error);
        return 0;
    }
}

// Legacy delete function (now uses soft delete)
function deleteFileRecord(id, userId, isDecoy = false) {
    return moveToTrash(id, userId, isDecoy);
}

module.exports = {
    saveFileRecord,
    getFiles,
    deleteFileRecord,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    toggleFavorite,
    getTotalStorageUsed
};
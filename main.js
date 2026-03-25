const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. PERFORMANCE: MUST BE AT THE TOP for 4GB RAM laptops
app.disableHardwareAcceleration();

require('dotenv').config();

// Import services
const userService = require('./backend/userService');
const vaultService = require('./backend/vaultService');
const fileService = require('./backend/fileService');

let mainWindow;
let currentUser = null;
let currentSessionIsDecoy = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    
    // --- PROFESSIONAL UI SETTINGS ---
    frame: false, // Removes the default Windows white bar
    icon: path.join(__dirname, 'assets/icon.ico'), // Sets your taskbar/desktop logo
    
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    currentUser = null;
    currentSessionIsDecoy = false;
  });
}

// --- APP LIFECYCLE ---
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== WINDOW CONTROL HANDLERS (FOR CHROME BUTTONS) ==========

// Minimize Button Logic
ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

// Maximize/Restore Button Logic
ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// ========== IPC HANDLERS ==========

// Navigation
ipcMain.handle('navigate-to-dashboard', () => {
  if (mainWindow) {
    mainWindow.loadFile('dashboard.html');
  }
});

ipcMain.handle('navigate-to-login', () => {
  if (mainWindow) {
    currentUser = null;
    currentSessionIsDecoy = false;
    mainWindow.loadFile('index.html');
  }
});

// User registration and login
ipcMain.handle('register-user', async (event, username, password, recoveryPassword) => {
  return userService.registerUser(username, password, recoveryPassword);
});

ipcMain.handle('login-user', async (event, username, password) => {
  const result = userService.loginUser(username, password);
  if (result.success) {
    currentUser = result.user;
    currentSessionIsDecoy = result.isDecoy || false;
    
    // Add the isDecoy flag to the result so frontend knows
    result.isDecoy = currentSessionIsDecoy;
  }
  return result;
});

ipcMain.handle('get-user-info', () => {
  return currentUser;
});

ipcMain.handle('get-session-mode', () => {
  return { isDecoy: currentSessionIsDecoy };
});

ipcMain.handle('update-storage-used', (event, bytes) => {
  if (currentUser) {
    return userService.updateStorageUsed(currentUser.id, bytes);
  }
  return false;
});

// ===== PASSWORD OPERATIONS (with decoy support) =====
ipcMain.handle('add-password', (event, site, username, password, notes, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  // Use the passed isDecoy flag or fall back to session mode
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.addPassword(currentUser.id, site, username, password, notes, useDecoy);
});

ipcMain.handle('get-passwords', (event, isDecoy) => {
  if (!currentUser) return [];
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.getPasswords(currentUser.id, useDecoy);
});

ipcMain.handle('update-password', (event, id, site, username, password, notes, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.updatePassword(id, currentUser.id, site, username, password, notes, useDecoy);
});

ipcMain.handle('delete-password', (event, id, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.deletePassword(id, currentUser.id, useDecoy);
});

// ===== NOTE OPERATIONS (with decoy support) =====
ipcMain.handle('add-note', (event, title, content, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.addNote(currentUser.id, title, content, useDecoy);
});

ipcMain.handle('get-notes', (event, isDecoy) => {
  if (!currentUser) return [];
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.getNotes(currentUser.id, useDecoy);
});

ipcMain.handle('update-note', (event, id, title, content, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.updateNote(id, currentUser.id, title, content, useDecoy);
});

ipcMain.handle('delete-note', (event, id, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return vaultService.deleteNote(id, currentUser.id, useDecoy);
});

// ===== FILE OPERATIONS =====
ipcMain.handle('save-file-record', async (event, name, size, type, filePath, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  
  // Safety check: ensure filePath is a string
  if (!filePath || typeof filePath !== 'string') {
    console.error("Save Error: filePath is undefined or not a string");
    return { success: false, message: 'File path missing' };
  }

  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return fileService.saveFileRecord(currentUser.id, name, size, type, filePath, useDecoy);
});

ipcMain.handle('get-files', (event, isDecoy) => {
  if (!currentUser) return [];
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return fileService.getFiles(currentUser.id, useDecoy);
});

ipcMain.handle('delete-file-record', (event, id, isDecoy) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return fileService.deleteFileRecord(id, currentUser.id, useDecoy);
});

// File picker dialog
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    const files = [];
    
    for (const filePath of result.filePaths) {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath).toLowerCase();
      
      // Determine file type
      let fileType = 'other';
      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExt)) fileType = 'image';
      else if (['.pdf'].includes(fileExt)) fileType = 'pdf';
      else if (['.doc', '.docx'].includes(fileExt)) fileType = 'document';
      else if (['.xls', '.xlsx'].includes(fileExt)) fileType = 'spreadsheet';
      else if (['.zip', '.rar', '.7z'].includes(fileExt)) fileType = 'archive';
      else if (['.mp3', '.wav'].includes(fileExt)) fileType = 'audio';
      else if (['.mp4', '.avi'].includes(fileExt)) fileType = 'video';
      
      files.push({
        name: fileName,
        size: stats.size,
        type: fileType,
        path: filePath
      });
    }
    
    return files;
  }
  
  return [];
});

// Get decoy status for UI
ipcMain.handle('get-decoy-status', () => {
  return { 
    isDecoy: currentSessionIsDecoy,
    message: currentSessionIsDecoy ? 'You are in DECOY mode' : 'You are in REAL mode'
  };
});

// Get total storage used (with decoy support)
ipcMain.handle('get-total-storage-used', (event, isDecoy) => {
  if (!currentUser) return 0;
  const useDecoy = isDecoy !== undefined ? isDecoy : currentSessionIsDecoy;
  return fileService.getTotalStorageUsed(currentUser.id, useDecoy);
});

// ===== TRASH AND FAVORITE HANDLERS (with proper file handling) =====

// Move to trash
ipcMain.handle('move-to-trash', async (event, type, id) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  
  // Handle files separately (they have their own service)
  if (type === 'file') {
    return fileService.moveToTrash(id, currentUser.id, currentSessionIsDecoy);
  }
  
  // For passwords and notes, ensure plural form for table names
  const tableType = type.endsWith('s') ? type : type + 's';
  return vaultService.moveToTrash(tableType, id, currentUser.id, currentSessionIsDecoy);
});

// Restore from trash
ipcMain.handle('restore-from-trash', async (event, type, id) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  
  // Handle files separately
  if (type === 'file') {
    return fileService.restoreFromTrash(id, currentUser.id, currentSessionIsDecoy);
  }
  
  // For passwords and notes
  const tableType = type.endsWith('s') ? type : type + 's';
  return vaultService.restoreFromTrash(tableType, id, currentUser.id, currentSessionIsDecoy);
});

// Permanent delete
ipcMain.handle('permanent-delete', async (event, type, id) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  
  // Handle files separately
  if (type === 'file') {
    return fileService.permanentDelete(id, currentUser.id, currentSessionIsDecoy);
  }
  
  // For passwords and notes
  const tableType = type.endsWith('s') ? type : type + 's';
  return vaultService.permanentDelete(tableType, id, currentUser.id, currentSessionIsDecoy);
});

// Toggle favorite
ipcMain.handle('toggle-favorite', async (event, type, id, status) => {
  if (!currentUser) return { success: false, message: 'Not logged in' };
  
  // Handle files separately
  if (type === 'file') {
    return fileService.toggleFavorite(id, currentUser.id, status, currentSessionIsDecoy);
  }
  
  // For passwords and notes
  const tableType = type.endsWith('s') ? type : type + 's';
  return vaultService.toggleFavorite(tableType, id, currentUser.id, status, currentSessionIsDecoy);
});

// Get trash items
ipcMain.handle('get-trash-items', async (event) => {
  if (!currentUser) return { passwords: [], notes: [], files: [] };
  const useDecoy = currentSessionIsDecoy;
  
  const passwords = await vaultService.getPasswords(currentUser.id, useDecoy, true);
  const notes = await vaultService.getNotes(currentUser.id, useDecoy, true);
  const files = await fileService.getFiles(currentUser.id, useDecoy, true);
  
  return { passwords, notes, files };
});

// ===== OPEN FILE HANDLER =====
ipcMain.handle('open-file', async (event, filePath) => {
  if (!filePath) return { success: false, message: "No path provided" };
  
  try {
    // Resolve path to handle Windows backslashes correctly
    const cleanPath = path.resolve(filePath);
    
    // Check if file still exists on the computer before trying to open
    if (!fs.existsSync(cleanPath)) {
      return { success: false, message: "File not found at: " + cleanPath };
    }

    // shell.openPath returns an empty string on success, or an error message on failure
    const error = await shell.openPath(cleanPath);
    
    if (error) {
      console.error("Shell open error:", error);
      return { success: false, message: error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Open file crash:", error);
    return { success: false, message: error.message };
  }
});

console.log('✅ Main process started with dual-vault support');
console.log('   - Hardware acceleration disabled');
console.log('   - Frameless window enabled');
console.log('   - File picker and opener ready');
console.log('   - Trash and favorite system enabled');
console.log('   - Window controls (minimize/maximize) ready');
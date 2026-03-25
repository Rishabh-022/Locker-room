const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  navigateToDashboard: () => ipcRenderer.invoke('navigate-to-dashboard'),
  navigateToLogin: () => ipcRenderer.invoke('navigate-to-login'),
  
  // ADD THESE TWO LINES HERE FOR WINDOW CONTROLS:
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window')
});

// Expose database operations to frontend
contextBridge.exposeInMainWorld('vaultAPI', {
  // User operations
  registerUser: (username, password, recoveryPassword) => 
    ipcRenderer.invoke('register-user', username, password, recoveryPassword),
  loginUser: (username, password) => 
    ipcRenderer.invoke('login-user', username, password),
  
  // Password operations (with decoy flag)
  addPassword: (site, username, password, notes, isDecoy) => 
    ipcRenderer.invoke('add-password', site, username, password, notes, isDecoy),
  getPasswords: (isDecoy) => 
    ipcRenderer.invoke('get-passwords', isDecoy),
  updatePassword: (id, site, username, password, notes, isDecoy) => 
    ipcRenderer.invoke('update-password', id, site, username, password, notes, isDecoy),
  deletePassword: (id, isDecoy) => 
    ipcRenderer.invoke('delete-password', id, isDecoy),
  
  // Note operations (with decoy flag)
  addNote: (title, content, isDecoy) => 
    ipcRenderer.invoke('add-note', title, content, isDecoy),
  getNotes: (isDecoy) => 
    ipcRenderer.invoke('get-notes', isDecoy),
  updateNote: (id, title, content, isDecoy) => 
    ipcRenderer.invoke('update-note', id, title, content, isDecoy),
  deleteNote: (id, isDecoy) => 
    ipcRenderer.invoke('delete-note', id, isDecoy),
  
  // File operations (with decoy flag)
  saveFileRecord: (name, size, type, path, isDecoy) => 
    ipcRenderer.invoke('save-file-record', name, size, type, path, isDecoy),
  getFiles: (isDecoy) => 
    ipcRenderer.invoke('get-files', isDecoy),
  deleteFileRecord: (id, isDecoy) => 
    ipcRenderer.invoke('delete-file-record', id, isDecoy),
  selectFiles: () => 
    ipcRenderer.invoke('select-files'),
  
  // Open file with default application
  openFile: (path) => 
    ipcRenderer.invoke('open-file', path),
  
  // Storage operations
  getTotalStorageUsed: (isDecoy) => 
    ipcRenderer.invoke('get-total-storage-used', isDecoy),
  
  // User data
  getUserInfo: () => 
    ipcRenderer.invoke('get-user-info'),
  getSessionMode: () => 
    ipcRenderer.invoke('get-session-mode'),
  updateStorageUsed: (bytes) => 
    ipcRenderer.invoke('update-storage-used', bytes),
  
  // ===== TRASH AND FAVORITE OPERATIONS =====
  // Move item to trash
  moveToTrash: (type, id) => 
    ipcRenderer.invoke('move-to-trash', type, id),
  
  // Restore item from trash
  restoreFromTrash: (type, id) => 
    ipcRenderer.invoke('restore-from-trash', type, id),
  
  // Permanently delete item
  permanentDelete: (type, id) => 
    ipcRenderer.invoke('permanent-delete', type, id),
  
  // Toggle favorite status
  toggleFavorite: (type, id, status) => 
    ipcRenderer.invoke('toggle-favorite', type, id, status),
  
  // Get all trash items
  getTrashItems: () => 
    ipcRenderer.invoke('get-trash-items')
});

console.log('✅ Preload script loaded with dual-vault support');
console.log('   - Trash and favorite functions exposed');
console.log('   - Window controls (minimize/maximize) exposed');
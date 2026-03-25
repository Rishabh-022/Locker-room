// ========== SECURITY CHECK ==========
// Check if user is logged in
if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
}

// ========== DECOY MODE DETECTION ==========
let isDecoyMode = localStorage.getItem("isDecoy") === "true";

// ========== USER DATA ==========
// Load user info from login
let currentUser = {
    name: localStorage.getItem("username") || "User",
    email: localStorage.getItem("userEmail") || "Admin@lockerroom.ac.in",
    id: localStorage.getItem("userId")

};

// ========== THEME TOGGLE ==========
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    body.className = savedTheme;
}

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light-mode');
    }
});

// ========== UI ELEMENTS ==========
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const quickAddBtn = document.getElementById('quickAddBtn');
const quickAddMenu = document.getElementById('quickAddMenu');
const logoutBtn = document.getElementById('logout');
const searchInput = document.getElementById('globalSearch');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

// Modals
const passwordModal = document.getElementById('addPasswordModal');
const noteModal = document.getElementById('addNoteModal');
const fileModal = document.getElementById('uploadFileModal');

// ========== SEARCH UI ==========
const searchResultsContainer = document.createElement('div');
searchResultsContainer.className = 'search-results';
searchResultsContainer.style.display = 'none';
searchResultsContainer.style.zIndex = '10000';

document.querySelector('.search-container').appendChild(searchResultsContainer);

// ========== CLOSE MODAL BUTTONS ==========
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        passwordModal.classList.remove('show');
        noteModal.classList.remove('show');
        fileModal.classList.remove('show');
        searchResultsContainer.style.display = 'none';
    });
});

// Click outside to close modal
window.addEventListener('click', (e) => {
    if (e.target === passwordModal) passwordModal.classList.remove('show');
    if (e.target === noteModal) noteModal.classList.remove('show');
    if (e.target === fileModal) fileModal.classList.remove('show');
    
    // Close search results if clicking outside
    if (!e.target.closest('.search-container')) {
        searchResultsContainer.style.display = 'none';
    }
});

// ========== MENU TOGGLE ==========
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

// ========== QUICK ADD MENU ==========
quickAddBtn.addEventListener('click', () => {
    quickAddMenu.classList.toggle('show');
});

document.querySelector('.close-btn').addEventListener('click', () => {
    quickAddMenu.classList.remove('show');
});

// Quick Add Options
document.querySelectorAll('.quick-option').forEach(option => {
    option.addEventListener('click', function() {
        const type = this.dataset.type;
        quickAddMenu.classList.remove('show');
        
        if (type === 'password') {
            passwordModal.classList.add('show');
        } else if (type === 'file') {
            fileModal.classList.add('show');
        } else if (type === 'note') {
            noteModal.classList.add('show');
        }
    });
});

// Quick Action Items
document.querySelectorAll('.quick-action-item').forEach(item => {
    item.addEventListener('click', function() {
        const action = this.dataset.action;
        
        if (action === 'password') {
            passwordModal.classList.add('show');
        } else if (action === 'file') {
            fileModal.classList.add('show');
        } else if (action === 'note') {
            noteModal.classList.add('show');
        }
    });
});

// Empty state buttons
document.getElementById('emptyAddPassword')?.addEventListener('click', () => {
    passwordModal.classList.add('show');
});

document.getElementById('emptyUploadFile')?.addEventListener('click', () => {
    fileModal.classList.add('show');
});

document.getElementById('emptyAddNote')?.addEventListener('click', () => {
    noteModal.classList.add('show');
});

// ========== PAGE NAVIGATION (UPDATED) ==========
navItems.forEach(item => {
    item.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Update active class
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        const pageName = this.dataset.page;
        const pageId = pageName + '-page';
        
        // Hide all pages
        pages.forEach(page => page.classList.remove('active'));
        
        // Show the selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // ADD THIS SWITCH: Load specific data for favorites and trash pages
        if (pageName === 'favorites') {
            await updateFavoritesList();
        } else if (pageName === 'trash') {
            await updateTrashList();
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// ========== DATABASE CONNECTED FUNCTIONS ==========

// Load all data on startup
async function loadAllData() {
    try {
        await Promise.all([
            updatePasswordList(),
            updateNoteList(),
            updateFileList(),
            updateDashboardStats(),
            updateStorageBar(),
            updateRecentActivity()
        ]);
        console.log(`✅ Data loaded from SQLite in ${isDecoyMode ? 'DECOY' : 'REAL'} mode`);
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load data', 'error');
    }
}

// ========== PASSWORD OPERATIONS ==========

// Update password list from database
async function updatePasswordList() {
    const container = document.getElementById('passwordsList');
    
    try {
        // FETCH: Get data from SQLite via the API - PASS THE DECOY FLAG
        const passwords = await window.vaultAPI.getPasswords(isDecoyMode);
        
        // ONLY show items that are NOT deleted (is_deleted === 0)
        const activePasswords = (passwords || []).filter(p => p.is_deleted === 0);
        
        if (activePasswords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-key"></i>
                    <p>No passwords saved yet</p>
                    <button class="primary-btn" onclick="document.getElementById('addPasswordModal').classList.add('show')">
                        Add your first password
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        activePasswords.forEach(p => {
            // Add favorite star if applicable
            const favoriteStar = p.is_favorite === 1 ? '<i class="fas fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'password\', ' + p.id + ', false)"></i>' : 
                                 '<i class="far fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'password\', ' + p.id + ', true)"></i>';
            
            html += `
                <div class="password-card" data-id="${p.id}" data-favorite="${p.is_favorite}">
                    <div class="card-header">
                        <div class="service-icon">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div class="service-info">
                            <h3>${escapeHtml(p.site)} ${favoriteStar}</h3>
                            <p>${escapeHtml(p.username)}</p>
                        </div>
                        <button class="card-menu" onclick="deleteItem('password', ${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="card-password">
                        <input type="password" value="${escapeHtml(p.password)}" readonly>
                        <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(p.password)}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="toggle-visibility">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                    <div class="card-footer">
                        <span class="date">Added: ${formatDate(p.createdAt)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        attachPasswordListeners();
    } catch (error) {
        console.error('Error loading passwords:', error);
        container.innerHTML = '<div class="empty-state error">Failed to load passwords</div>';
    }
}

// Add new password to database
document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const site = document.getElementById('serviceName').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const notes = document.getElementById('passwordNotes').value;
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        // Save to database - PASS THE DECOY FLAG
        const result = await window.vaultAPI.addPassword(site, username, password, notes, isDecoyMode);
        
        if (result.success) {
            this.reset();
            passwordModal.classList.remove('show');
            showNotification('Password saved successfully!', 'success');
            
            // Refresh data
            await Promise.all([
                updatePasswordList(),
                updateDashboardStats(),
                updateRecentActivity()
            ]);
        } else {
            showNotification(result.message || 'Failed to save password', 'error');
        }
    } catch (error) {
        console.error('Error saving password:', error);
        showNotification('Failed to save password', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// ========== NOTE OPERATIONS ==========

// Update note list from database
async function updateNoteList() {
    const container = document.getElementById('notesList');
    
    try {
        // FETCH: Get notes from SQLite - PASS THE DECOY FLAG
        const notes = await window.vaultAPI.getNotes(isDecoyMode);
        
        // ONLY show items that are NOT deleted (is_deleted === 0)
        const activeNotes = (notes || []).filter(n => n.is_deleted === 0);
        
        if (activeNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <p>No notes created yet</p>
                    <button class="primary-btn" onclick="document.getElementById('addNoteModal').classList.add('show')">
                        Create your first note
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        activeNotes.forEach(n => {
            // Create a short preview
            const preview = n.content.substring(0, 80) + (n.content.length > 80 ? '...' : '');
            
            // Add favorite star if applicable
            const favoriteStar = n.is_favorite === 1 ? '<i class="fas fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'note\', ' + n.id + ', false)"></i>' : 
                                 '<i class="far fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'note\', ' + n.id + ', true)"></i>';
            
            html += `
                <div class="note-card" data-id="${n.id}" onclick="viewNote(${n.id})">
                    <div class="note-header">
                        <h3>${escapeHtml(n.title)} ${favoriteStar}</h3>
                        <button class="note-menu" onclick="event.stopPropagation(); deleteItem('note', ${n.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <p class="note-preview">${escapeHtml(preview)}</p>
                    <div class="note-footer">
                        <span class="note-date">${formatDate(n.createdAt)}</span>
                        <span class="note-lock"><i class="fas fa-lock"></i> Encrypted</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading notes:', error);
        container.innerHTML = '<div class="empty-state error">Failed to load notes</div>';
    }
}

// Add new note to database
document.getElementById('noteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        // Save to database - PASS THE DECOY FLAG
        const result = await window.vaultAPI.addNote(title, content, isDecoyMode);
        
        if (result.success) {
            this.reset();
            noteModal.classList.remove('show');
            showNotification('Note saved successfully!', 'success');
            
            // Refresh data
            await Promise.all([
                updateNoteList(),
                updateDashboardStats(),
                updateRecentActivity()
            ]);
        } else {
            showNotification(result.message || 'Failed to save note', 'error');
        }
    } catch (error) {
        console.error('Error saving note:', error);
        showNotification('Failed to save note', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// View full note
window.viewNote = async function(noteId) {
    try {
        // Fetch fresh data - PASS THE DECOY FLAG
        const notes = await window.vaultAPI.getNotes(isDecoyMode);
        const note = notes.find(n => n.id === noteId);
        
        if (!note) return;
        
        // Create a modal to show full note
        const noteViewModal = document.createElement('div');
        noteViewModal.className = 'modal show';
        noteViewModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${escapeHtml(note.title)}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="note-content" style="white-space: pre-wrap; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    ${escapeHtml(note.content)}
                </div>
                <button class="submit-btn" onclick="copyToClipboard('${escapeHtml(note.content)}')">
                    <i class="fas fa-copy"></i> Copy Content
                </button>
            </div>
        `;
        
        document.body.appendChild(noteViewModal);
    } catch (error) {
        console.error('Error viewing note:', error);
        showNotification('Error loading note', 'error');
    }
};

// ========== FILE OPERATIONS ==========

// Update file list from database
async function updateFileList() {
    const container = document.getElementById('filesList');
    
    try {
        // FETCH: Get files from SQLite - PASS THE DECOY FLAG
        const files = await window.vaultAPI.getFiles(isDecoyMode);
        
        // ONLY show items that are NOT deleted (is_deleted === 0)
        const activeFiles = (files || []).filter(f => f.is_deleted === 0);
        
        if (activeFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <p>No files uploaded yet</p>
                    <button class="primary-btn" onclick="document.getElementById('uploadFileModal').classList.add('show')">
                        Upload your first file
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        activeFiles.forEach(f => {
            const icon = getFileIcon(f.type);
            
            // Add favorite star if applicable
            const favoriteStar = f.is_favorite === 1 ? '<i class="fas fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'file\', ' + f.id + ', false)"></i>' : 
                                 '<i class="far fa-star favorite-star" onclick="event.stopPropagation(); toggleFavorite(\'file\', ' + f.id + ', true)"></i>';
            
            html += `
                <div class="file-item" data-id="${f.id}">
                    <div class="file-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="file-info">
                        <h4>${escapeHtml(f.name)} ${favoriteStar}</h4>
                        <p>${formatFileSize(f.size)} • ${formatDate(f.createdAt)}</p>
                    </div>
                    <div class="file-actions">
                        <button onclick="downloadFile(${f.id})"><i class="fas fa-download"></i></button>
                        <button onclick="deleteItem('file', ${f.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading files:', error);
        container.innerHTML = '<div class="empty-state error">Failed to load files</div>';
    }
}

// ========== FAVORITE FUNCTION ==========
window.toggleFavorite = async function(type, id, setFavorite) {
    try {
        const result = await window.vaultAPI.toggleFavorite(type, id, setFavorite);
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Refresh the affected list
            if (type === 'password') {
                await updatePasswordList();
            } else if (type === 'note') {
                await updateNoteList();
            } else if (type === 'file') {
                await updateFileList();
            }
            await updateDashboardStats();
            await updateRecentActivity();
        } else {
            showNotification(result.message || 'Failed to update favorite', 'error');
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        showNotification('Failed to update favorite', 'error');
    }
};

// ========== FAVORITES PAGE UPDATE ==========
async function updateFavoritesList() {
    const [passwords, notes, files] = await Promise.all([
        window.vaultAPI.getPasswords(isDecoyMode),
        window.vaultAPI.getNotes(isDecoyMode),
        window.vaultAPI.getFiles(isDecoyMode)
    ]);
    
    const favorites = [
        ...(passwords || []).filter(p => p.is_favorite === 1 && p.is_deleted === 0),
        ...(notes || []).filter(n => n.is_favorite === 1 && n.is_deleted === 0),
        ...(files || []).filter(f => f.is_favorite === 1 && f.is_deleted === 0)
    ];
    
    // Sort favorites by date (newest first)
    favorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const container = document.getElementById('favoritesList');
    if (container) {
        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>No favorites yet</p>
                    <p>Click the star icon on any item to add it to favorites</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        favorites.forEach(item => {
            let icon = 'fa-key';
            let typeText = 'Password';
            let details = '';
            
            if (item.username) {
                // It's a password
                icon = 'fa-key';
                typeText = 'Password';
                details = `${escapeHtml(item.site)} • ${escapeHtml(item.username)}`;
            } else if (item.content !== undefined) {
                // It's a note
                icon = 'fa-sticky-note';
                typeText = 'Note';
                details = escapeHtml(item.title);
            } else if (item.name) {
                // It's a file
                icon = getFileIcon(item.type);
                typeText = 'File';
                details = escapeHtml(item.name);
            }
            
            html += `
                <div class="favorite-item" onclick="navigateToItem('${item.username ? 'passwords' : item.name ? 'files' : 'notes'}', ${item.id})">
                    <div class="favorite-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="favorite-info">
                        <strong>${details}</strong>
                        <small>${typeText} • Added ${formatDate(item.createdAt)}</small>
                    </div>
                    <button class="remove-favorite" onclick="event.stopPropagation(); toggleFavorite('${item.username ? 'password' : item.name ? 'file' : 'note'}', ${item.id}, false)">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
}

// ========== TRASH LIST UPDATE ==========
async function updateTrashList() {
    const container = document.getElementById('trashList');
    if (!container) return;
    
    try {
        // Fetch items specifically marked as is_deleted = 1
        const trashData = await window.vaultAPI.getTrashItems();
        
        const allItems = [
            ...(trashData.passwords || []).map(p => ({...p, type: 'password', display: p.site})),
            ...(trashData.notes || []).map(n => ({...n, type: 'note', display: n.title})),
            ...(trashData.files || []).map(f => ({...f, type: 'file', display: f.name}))
        ];

        if (allItems.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-trash-alt"></i><p>Trash is empty</p></div>';
            return;
        }

        let html = '';
        allItems.forEach(item => {
            let icon = '';
            if (item.type === 'password') icon = 'fa-key';
            else if (item.type === 'note') icon = 'fa-sticky-note';
            else icon = 'fa-file';
            
            html += `
                <div class="trash-item">
                    <div class="file-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="file-info">
                        <h4>${escapeHtml(item.display)}</h4>
                        <p>${item.type.toUpperCase()} • Deleted: ${formatDate(item.updated_at || item.createdAt)}</p>
                    </div>
                    <div class="file-actions">
                        <button onclick="restoreItem('${item.type}', ${item.id})" title="Restore">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button onclick="permanentlyDeleteItem('${item.type}', ${item.id})" title="Permanently Delete" style="color: #dc3545;">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error("Trash update error:", error);
        container.innerHTML = '<div class="empty-state error">Failed to load trash</div>';
    }
}

// ========== RESTORE AND PERMANENT DELETE FUNCTIONS ==========
window.restoreItem = async function(type, id) {
    try {
        const result = await window.vaultAPI.restoreFromTrash(type, id);
        if (result.success) {
            showNotification("Item restored successfully!", "success");
            await updateTrashList();
            await loadAllData(); // Refresh main counts and lists
            await updateDashboardStats();
        } else {
            showNotification(result.message || "Failed to restore item", "error");
        }
    } catch (error) {
        console.error('Restore error:', error);
        showNotification("Failed to restore item", "error");
    }
};

window.permanentlyDeleteItem = async function(type, id) {
    if (confirm("⚠️ Permanently delete this item? This action cannot be undone.")) {
        try {
            const result = await window.vaultAPI.permanentDelete(type, id);
            if (result.success) {
                showNotification("Item permanently deleted.", "info");
                await updateTrashList();
                await loadAllData();
                await updateDashboardStats();
            } else {
                showNotification(result.message || "Failed to delete item", "error");
            }
        } catch (error) {
            console.error('Permanent delete error:', error);
            showNotification("Failed to delete item", "error");
        }
    }
};

// File upload using Electron's native file picker (works correctly with paths)
document.getElementById('selectFileBtn').addEventListener('click', async () => {
    try {
        // This opens the real Windows File Explorer using Electron's dialog
        const files = await window.vaultAPI.selectFiles();
        
        if (files && files.length > 0) {
            await handleFileUpload(files);
        }
    } catch (err) {
        console.error("Picker error:", err);
        showNotification("Failed to open file picker", "error");
    }
});

// ========== DISABLED: HTML file input (removed because it doesn't provide file paths) ==========
// The HTML file input doesn't provide the actual file path for security reasons.
// We only use the Electron native file picker above which gives us the full path.
// document.getElementById('fileInput') listener is REMOVED to prevent "undefined path" errors.

// Drag and Drop Upload
const uploadArea = document.getElementById('uploadArea');
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4a6cf7';
        uploadArea.style.background = '#f8f9fa';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = 'transparent';
    });

    uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = 'transparent';
        
        showNotification("Please use the 'Select Files' button for secure uploads.", "info");
    });
}

async function handleFileUpload(files) {
    let successCount = 0;
    let failedCount = 0;
    
    for (const file of files) {
        // CRITICAL: Check if path exists (only Electron dialog provides this)
        if (!file.path) {
            console.error("Missing path for:", file.name);
            showNotification(`Cannot upload ${file.name}: File path not accessible. Please use the Select Files button.`, "error");
            failedCount++;
            continue;
        }
        
        // Check file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            showNotification(`${file.name} is too large (max 100MB)`, 'error');
            failedCount++;
            continue;
        }
        
        // Save file record to database - PASS THE DECOY FLAG
        const result = await window.vaultAPI.saveFileRecord(
            file.name,
            file.size,
            file.type,
            file.path, // The actual string path from Electron dialog
            isDecoyMode
        );
        
        if (result.success) {
            successCount++;
        } else {
            failedCount++;
        }
    }
    
    if (successCount > 0) {
        await Promise.all([
            updateFileList(),
            updateDashboardStats(),
            updateStorageBar(),
            updateRecentActivity()
        ]);
        fileModal.classList.remove('show');
        showNotification(`${successCount} file(s) uploaded successfully!`, 'success');
    }
    
    if (failedCount > 0) {
        showNotification(`${failedCount} file(s) failed to upload.`, 'error');
    }
}

// ========== DASHBOARD STATS ==========

async function updateDashboardStats() {
    try {
        // Fetch fresh data from the database - PASS THE DECOY FLAG
        const [passwords, notes, files] = await Promise.all([
            window.vaultAPI.getPasswords(isDecoyMode),
            window.vaultAPI.getNotes(isDecoyMode),
            window.vaultAPI.getFiles(isDecoyMode)
        ]);
        
        // Count only active (non-deleted) items
        const activePasswords = (passwords || []).filter(p => p.is_deleted === 0);
        const activeNotes = (notes || []).filter(n => n.is_deleted === 0);
        const activeFiles = (files || []).filter(f => f.is_deleted === 0);
        
        // Update the UI numbers
        document.getElementById('totalPasswords').textContent = activePasswords.length;
        document.getElementById('totalFiles').textContent = activeFiles.length;
        document.getElementById('totalNotes').textContent = activeNotes.length;
        
        // These are your sidebar or sub-menu counts
        document.getElementById('passwordCount').textContent = activePasswords.length;
        document.getElementById('fileCount').textContent = activeFiles.length;
        document.getElementById('noteCount').textContent = activeNotes.length;

        return { passwords: activePasswords, notes: activeNotes, files: activeFiles };
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function updateStorageBar() {
    try {
        // 1. Fetch the actual sum of file sizes from the current vault (only active files)
        const usedBytes = await window.vaultAPI.getTotalStorageUsed(isDecoyMode);
        
        // 2. Define the total limit (e.g., 5GB)
        const totalBytes = 5 * 1024 * 1024 * 1024; 

        // 3. Calculate formats
        const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
        const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(0);
        const percentage = (usedBytes / totalBytes) * 100;

        // 4. Update UI
        const progressBar = document.getElementById('storageProgress');
        const storageText = document.getElementById('storageUsed');
        const storageTotalText = document.getElementById('storageTotal');

        if (progressBar) progressBar.style.width = Math.min(percentage, 100) + '%';
        if (storageText) storageText.textContent = usedMB + ' MB';
        if (storageTotalText) storageTotalText.textContent = '/ ' + totalGB + ' GB';

        // Optional: Change color if storage is almost full
        if (percentage > 90) {
            progressBar.style.backgroundColor = '#e74c3c'; // Red
        } else {
            progressBar.style.backgroundColor = isDecoyMode ? '#e74c3c' : '#4a6cf7'; 
        }

    } catch (error) {
        console.error('Error updating storage bar:', error);
    }
}

async function updateRecentActivity() {
    const container = document.getElementById('recentList');
    
    try {
        // 1. Fetch all data in one parallel call - PASS THE DECOY FLAG
        const [passwords, notes, files] = await Promise.all([
            window.vaultAPI.getPasswords(isDecoyMode),
            window.vaultAPI.getNotes(isDecoyMode),
            window.vaultAPI.getFiles(isDecoyMode)
        ]);
        
        // 2. Filter only active (non-deleted) items
        const activePasswords = (passwords || []).filter(p => p.is_deleted === 0);
        const activeNotes = (notes || []).filter(n => n.is_deleted === 0);
        const activeFiles = (files || []).filter(f => f.is_deleted === 0);
        
        // 3. Combine and sort everything by the 'createdAt' date
        const allItems = [
            ...(activePasswords || []).map(p => ({ 
                ...p, 
                type: 'password', 
                date: p.createdAt,
                title: p.site, // Using site (consistent with database)
                subtitle: p.username 
            })),
            ...(activeFiles || []).map(f => ({ 
                ...f, 
                type: 'file', 
                date: f.createdAt,
                title: f.name,
                subtitle: formatFileSize(f.size) 
            })),
            ...(activeNotes || []).map(n => ({ 
                ...n, 
                type: 'note', 
                date: n.createdAt,
                title: n.title,
                subtitle: 'Private note' 
            }))
        ]
        // Sort: Newest items first
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        // Take only the 10 most recent actions
        .slice(0, 10);
        
        // 4. Handle Empty State
        if (allItems.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent activity</p>';
            return;
        }
        
        // 5. Generate HTML
        let html = '';
        allItems.forEach(item => {
            let icon = 'fa-key';
            let iconClass = 'blue';
            
            if (item.type === 'file') {
                icon = getFileIcon(item.type);
                iconClass = 'green';
            } else if (item.type === 'note') {
                icon = 'fa-sticky-note';
                iconClass = 'purple';
            }
            
            html += `
                <div class="recent-item" onclick="navigateToItem('${item.type}', ${item.id})">
                    <div class="item-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="item-details">
                        <h4>${escapeHtml(item.title)} ${item.is_favorite === 1 ? '<i class="fas fa-star" style="color: #f1c40f; font-size: 0.7rem;"></i>' : ''}</h4>
                        <p>${escapeHtml(item.subtitle)} • ${formatDate(item.date)}</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error updating recent activity:', error);
        container.innerHTML = '<p class="empty-state error">Failed to load activity</p>';
    }
}

// ========== GENERATE PASSWORD ==========
document.getElementById('generatePassword').addEventListener('click', function() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    document.getElementById('password').value = password;
});

// ========== SEARCH LOGIC (STABLE VERSION) ==========
let searchTimeout;
searchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm.length < 1) {
        searchResultsContainer.style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const [passwords, notes, files] = await Promise.all([
                window.vaultAPI.getPasswords(isDecoyMode),
                window.vaultAPI.getNotes(isDecoyMode),
                window.vaultAPI.getFiles(isDecoyMode)
            ]);
            
            // Only search active (non-deleted) items
            const mPasswords = (passwords || []).filter(p => p.is_deleted === 0 && (p.site || '').toLowerCase().includes(searchTerm));
            const mNotes = (notes || []).filter(n => n.is_deleted === 0 && (n.title || '').toLowerCase().includes(searchTerm));
            const mFiles = (files || []).filter(f => f.is_deleted === 0 && (f.name || '').toLowerCase().includes(searchTerm));
            
            renderSearch(searchTerm, mPasswords, mNotes, mFiles);
        } catch (err) { 
            console.error(err); 
        }
    }, 300);
});

function renderSearch(term, passwords, notes, files) {
    const total = passwords.length + notes.length + files.length;
    searchResultsContainer.style.display = 'block'; 
    searchResultsContainer.style.visibility = 'visible';
    searchResultsContainer.style.opacity = '1';
    
    if (total === 0) {
        searchResultsContainer.innerHTML = `<div class="search-result-item empty">No results for "${term}"</div>`;
        return;
    }

    let html = `<div class="search-result-header">Found ${total} results</div>`;
    
    passwords.forEach(p => {
        html += `<div class="search-result-item" onclick="navigateToItem('passwords', ${p.id})">
            <i class="fas fa-key"></i>
            <div class="result-info"><strong>${escapeHtml(p.site)}</strong><small>${escapeHtml(p.username)}</small></div>
        </div>`;
    });

    notes.forEach(n => {
        html += `<div class="search-result-item" onclick="navigateToItem('notes', ${n.id})">
            <i class="fas fa-sticky-note"></i>
            <div class="result-info"><strong>${escapeHtml(n.title)}</strong></div>
        </div>`;
    });

    files.forEach(f => {
        html += `<div class="search-result-item" onclick="navigateToItem('files', ${f.id})">
            <i class="fas fa-file"></i>
            <div class="result-info"><strong>${escapeHtml(f.name)}</strong></div>
        </div>`;
    });

    searchResultsContainer.innerHTML = html;
}

// Add this to make clicking results actually move the page
window.navigateToItem = function(page, id) {
    const navLink = document.querySelector(`[data-page="${page}"]`);
    if (navLink) navLink.click();
    searchResultsContainer.style.display = 'none';
    searchInput.value = '';
};

// ========== DELETE OPERATIONS ==========

window.deleteItem = async function(type, id) {
    if (confirm('Are you sure you want to delete this item? It will be moved to trash.')) {
        try {
            let result;
            
            if (type === 'password') {
                result = await window.vaultAPI.moveToTrash('passwords', id);
            } else if (type === 'note') {
                result = await window.vaultAPI.moveToTrash('notes', id);
            } else if (type === 'file') {
                result = await window.vaultAPI.moveToTrash('file', id);
            }
            
            if (result?.success) {
                showNotification(`Item moved to trash`, 'success');
                
                // Refresh all data
                await Promise.all([
                    updatePasswordList(),
                    updateNoteList(),
                    updateFileList(),
                    updateDashboardStats(),
                    updateStorageBar(),
                    updateRecentActivity()
                ]);
                
                // Update favorites list if on that page
                if (document.getElementById('favoritesList')) {
                    await updateFavoritesList();
                }
            } else {
                showNotification(`Failed to delete ${type}`, 'error');
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showNotification(`Failed to delete ${type}`, 'error');
        }
    }
};

window.downloadFile = async function(id) {
    try {
        const files = await window.vaultAPI.getFiles(isDecoyMode);
        const file = files.find(f => f.id === id);
        
        if (file && file.path && file.is_deleted === 0) {
            // Call the backend
            const result = await window.vaultAPI.openFile(file.path);
            
            if (result.success) {
                showNotification(`Opened: ${file.name}`, 'success');
            } else {
                // This will tell you if the file was moved/deleted
                showNotification(result.message, 'error');
            }
        } else {
            showNotification("File not found or has been deleted.", "error");
        }
    } catch (error) {
        console.error('Download click error:', error);
        showNotification('System error trying to open file', 'error');
    }
};

// ========== HELPER FUNCTIONS ==========

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 24 hours
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diff < 172800000) { // Less than 48 hours
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type) {
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    if (type.includes('excel') || type.includes('sheet')) return 'fa-file-excel';
    if (type.includes('zip') || type.includes('archive')) return 'fa-file-archive';
    if (type.includes('audio')) return 'fa-file-audio';
    if (type.includes('video')) return 'fa-file-video';
    return 'fa-file-alt';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Copied to clipboard!', 'success');
    });
}

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Add styles dynamically if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 25px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
            }
            
            body.dark-mode .notification {
                background: #232538;
                color: white;
            }
            
            .notification.success {
                border-left-color: #28a745;
            }
            
            .notification.success i {
                color: #28a745;
            }
            
            .notification.error {
                border-left-color: #dc3545;
            }
            
            .notification.error i {
                color: #dc3545;
            }
            
            .notification.info {
                border-left-color: #4a6cf7;
            }
            
            .notification.info i {
                color: #4a6cf7;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function attachPasswordListeners() {
    // Toggle password visibility
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.closest('.card-password').querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Copy button functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.closest('.card-password').querySelector('input');
            copyToClipboard(input.value);
            
            // Visual feedback
            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                this.innerHTML = originalIcon;
            }, 2000);
        });
    });
}

// ========== LOGOUT ==========
logoutBtn.addEventListener('click', function() {
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    
    // Clear login status
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('isDecoy');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    if (e.key === 'Escape') {
        quickAddMenu.classList.remove('show');
        passwordModal.classList.remove('show');
        noteModal.classList.remove('show');
        fileModal.classList.remove('show');
        searchResultsContainer.style.display = 'none';
        sidebar.classList.remove('active');
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Secret Signal: If in decoy mode, add a tiny dot to the logo
    if (isDecoyMode) {
        const logoText = document.querySelector('.logo span');
        if (logoText) logoText.textContent = "Locker Room."; // Notice the dot!
    }
    
    // Clean user profile - no badges, just normal display
    document.getElementById('userInfo').innerHTML = `
        <div class="user-avatar">
            <i class="fas fa-user-circle" style="font-size: 2rem; color: #4a6cf7;"></i>
        </div>
        <div class="user-details">
            <p class="user-name">${escapeHtml(currentUser.name)}</p>
            <p class="user-email">${escapeHtml(currentUser.email)}</p>
        </div>
    `;
    
    // Load all data from database
    await loadAllData();
    
    // Initialize favorites list if page exists
    if (document.getElementById('favoritesList')) {
        await updateFavoritesList();
    }
    
    // Initialize trash list if page exists
    if (document.getElementById('trashList')) {
        await updateTrashList();
    }
    
    console.log(`🚀 Dashboard initialized and connected to SQLite in ${isDecoyMode ? 'DECOY 🔴' : 'REAL 🟢'} mode`);
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
});

// ========== WINDOW CONTROL LOGIC ==========
// These functions control the Electron window
document.getElementById('closeBtn').onclick = () => window.close();
document.getElementById('minBtn').onclick = () => {
    if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
    } else {
        console.warn('minimize function not available');
    }
};
document.getElementById('maxBtn').onclick = () => {
    if (window.electronAPI && window.electronAPI.maximize) {
        window.electronAPI.maximize();
    } else {
        console.warn('maximize function not available');
    }
};
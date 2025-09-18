// Prevent multiple executions
if (window.nestifyScriptLoaded) {
    console.log('Script already loaded, skipping initialization');
} else {
    window.nestifyScriptLoaded = true;

    // Firebase configuration and initialization
    window.firebaseConfig = {
      apiKey: "AIzaSyC3Zbnm-_ghWQiFiDZcQCE4MkR_4WeDAr8",
      authDomain: "nestify-af7a6.firebaseapp.com",
      projectId: "nestify-af7a6",
      storageBucket: "nestify-af7a6.appspot.com",
      messagingSenderId: "462014928709",
      appId: "1:462014928709:web:91a79060ea330c5bba902c",
      measurementId: "G-4K8X9LM211"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }

    // Initialize database
    window.db = firebase.firestore();

// Helper functions
window.requireAuth = function() {
  if (!localStorage.getItem('apartmentCollection')) {
    window.location.href = "login.html";
  }
};

window.logout = function() {
  localStorage.clear();
  window.location.href = "login.html";
};

// Helper to get the correct base Firestore reference for requests
window.getRequestsBase = function() {
  const apartmentCollection = localStorage.getItem('apartmentCollection');
  if (!apartmentCollection) {
    throw new Error('Apartment collection not set in localStorage');
  }
  // Correct Firestore path: requests (root collection) with apartmentId filter
  return window.db.collection('requests');
};

// Initialize Firebase when needed
function initializeFirebase() {
    console.log('=== INITIALIZING FIREBASE ===');
    console.log('Firebase object:', typeof firebase);
    console.log('Firebase apps:', firebase.apps.length);
    console.log('Database object available:', typeof window.db !== 'undefined');
    console.log('getRequestsBase function available:', typeof getRequestsBase === 'function');
    
    console.log('Firebase and database are ready');
}

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.navbar')) {
            const navMenu = document.querySelector('.nav-menu');
            const navToggle = document.querySelector('.nav-toggle');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        }
    });
});

// Utility function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Utility function to format time
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// ========================================
// REQUESTS MANAGEMENT FUNCTIONALITY
// ========================================

// Global variables for requests
let currentRequests = [];
let filteredRequests = [];
let currentApartmentId = '';
let currentRequestId = '';
let requestsListener = null;

// Initialize requests page
function initializeRequestsPage() {
    // Initialize Firebase first
    initializeFirebase();
    
    currentApartmentId = localStorage.getItem('apartmentCollection');
    if (!currentApartmentId) {
        showMessage('Error: No apartment data found. Please login again.', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }

    // Set current user
    const username = localStorage.getItem('username');
    const currentUserElement = document.getElementById('current-user');
    if (currentUserElement) {
        currentUserElement.textContent = username || 'Admin';
    }

    // Load requests
    loadRequests();

    // Set up real-time listener
    setupRealtimeListener();

    // Set up event listeners
    setupRequestsEventListeners();
    
    // Add test button for debugging (remove in production)
    addTestButton();
    
    // Test database connection
    testDatabaseConnection();
}

// Add test button for debugging
function addTestButton() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('test-btn')) {
        const testBtn = document.createElement('button');
        testBtn.id = 'test-btn';
        testBtn.className = 'btn btn-secondary';
        testBtn.innerHTML = '<i class="fas fa-plus"></i> Test Request';
        testBtn.onclick = createTestRequest;
        headerActions.appendChild(testBtn);
    }
}

// Create a test request for debugging
async function createTestRequest() {
    try {
        const testRequest = {
            ticketId: 'REQ-' + Date.now(),
            apartmentId: currentApartmentId,
            residentId: 'test-resident',
            residentName: 'Test Resident',
            apartmentRoom: 'A-101',
            category: 'PLUMBING',
            priority: 'MEDIUM',
            description: 'This is a test request created from the website for debugging purposes.',
            status: 'PENDING',
            createdAtEpochMs: Date.now(),
            createdAt: new Date().toISOString(),
            createdAtDisplay: new Date().toLocaleString(),
            sriLankaTime: new Date().toLocaleString('en-US', {timeZone: 'Asia/Colombo'})
        };
        
        // Save to main path
        const requestsRef = getRequestsBase();
        await requestsRef.doc(testRequest.ticketId).set(testRequest);
        
        // Also save to backup path
        const backupRef = db.collection('requests');
        await backupRef.doc(testRequest.ticketId).set(testRequest);
        
        showMessage('Test request created successfully!', 'success');
        
        // Reload requests
        loadRequests();
        
    } catch (error) {
        console.error('Error creating test request:', error);
        showMessage('Error creating test request: ' + error.message, 'error');
    }
}

// Test database connection
async function testDatabaseConnection() {
    try {
        console.log('=== TESTING DATABASE CONNECTION ===');
        
        // Test 1: Check if we can access the apartment collection
        const apartmentCollection = localStorage.getItem('apartmentCollection');
        console.log('Apartment collection:', apartmentCollection);
        
        // Test 2: Try to read from the apartment collection
        const apartmentRef = window.db.collection(apartmentCollection);
        const apartmentSnapshot = await apartmentRef.limit(1).get();
        console.log('Apartment collection accessible:', !apartmentSnapshot.empty);
        
        // Test 3: Try to read from the specific document
        const docRef = apartmentRef.doc('1HgCK9tLiQnkOURHXBtM');
        const docSnapshot = await docRef.get();
        console.log('Document 1HgCK9tLiQnkOURHXBtM exists:', docSnapshot.exists);
        
        // Test 4: Try to read from the requests subcollection
        const requestsRef = docRef.collection('requests');
        const requestsSnapshot = await requestsRef.limit(5).get();
        console.log('Requests subcollection accessible:', true);
        console.log('Number of requests found:', requestsSnapshot.size);
        
        if (requestsSnapshot.size > 0) {
            console.log('Sample request data:', requestsSnapshot.docs[0].data());
        }
        
        console.log('=== DATABASE CONNECTION TEST COMPLETE ===');
        
    } catch (error) {
        console.error('Database connection test failed:', error);
    }
}

// Set up event listeners for requests
function setupRequestsEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    if (clearSearch) {
        clearSearch.addEventListener('click', clearSearch);
    }

    // Filter functionality
    const statusFilter = document.getElementById('status-filter');
    const priorityFilter = document.getElementById('priority-filter');
    const categoryFilter = document.getElementById('category-filter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyFilters);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadRequests);
    }

    // Modal functionality
    const updateStatusBtn = document.getElementById('update-status-btn');
    const addCommentBtn = document.getElementById('add-comment-btn');
    
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', updateRequestStatus);
    }
    if (addCommentBtn) {
        addCommentBtn.addEventListener('click', addComment);
    }

    // Close modal on outside click
    const requestModal = document.getElementById('request-modal');
    if (requestModal) {
        requestModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeRequestModal();
            }
        });
    }
}

// Set up real-time listener for requests
function setupRealtimeListener() {
    try {
        // Check if database is available
        if (typeof window.db === 'undefined') {
            throw new Error('Database not initialized. Please refresh the page.');
        }
        
        const requestsRef = getRequestsBase();
        
        requestsListener = requestsRef.where('apartmentId', '==', currentApartmentId).onSnapshot(
            (snapshot) => {
                console.log('Real-time update received for requests');
                
                currentRequests = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    currentRequests.push({
                        id: doc.id,
                        ...data
                    });
                });

                // Sort by creation date (newest first)
                currentRequests.sort((a, b) => {
                    const dateA = a.createdAtEpochMs || 0;
                    const dateB = b.createdAtEpochMs || 0;
                    return dateB - dateA;
                });

                applyFilters();
                updateStatistics();
                
                // Update modal if it's open and showing the updated request
                if (currentRequestId) {
                    const request = currentRequests.find(r => r.id === currentRequestId);
                    if (request) {
                        updateModalData(request);
                    }
                }
            },
            (error) => {
                console.error('Real-time listener error:', error);
                showMessage('Connection error. Some updates may not be visible.', 'error');
            }
        );
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
        showMessage('Error setting up real-time updates: ' + error.message, 'error');
    }
}

// Update modal data when request changes
function updateModalData(request) {
    const elements = {
        'modal-ticket-number': request.ticketId || '-',
        'modal-resident-name': request.residentName || '-',
        'modal-apartment-room': request.apartmentRoom || '-',
        'modal-category': getCategoryLabel(request.category),
        'modal-priority': getPriorityLabel(request.priority),
        'modal-date-submitted': formatDate(request.createdAtEpochMs),
        'modal-current-status': getStatusLabel(request.status),
        'modal-description': request.description || 'No description provided.'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Set current status in select
    const statusSelect = document.getElementById('status-select');
    if (statusSelect) {
        statusSelect.value = request.status || 'PENDING';
    }
    
    // Reload comments
    loadComments(request.id);
}

// Load requests from Firebase
async function loadRequests() {
    try {
        showLoading(true);
        
        console.log('=== LOADING REQUESTS DEBUG ===');
        console.log('Current apartment ID:', currentApartmentId);
        console.log('Database object available:', typeof window.db !== 'undefined');
        console.log('getRequestsBase function available:', typeof getRequestsBase === 'function');
        
        // Check if database is available
        if (typeof window.db === 'undefined') {
            throw new Error('Database not initialized. Please refresh the page.');
        }
        
        // Query requests from the root collection, filtered by apartment ID
        const requestsRef = getRequestsBase();
        console.log('Requests reference path:', requestsRef.path);
        console.log('Requests reference type:', typeof requestsRef);
        console.log('Requests reference methods:', Object.getOwnPropertyNames(requestsRef));

        const snapshot = await requestsRef.where('apartmentId', '==', currentApartmentId).get();
        console.log('Snapshot received:', snapshot);
        console.log('Snapshot size:', snapshot.size);
        console.log('Snapshot empty:', snapshot.empty);
        console.log('Snapshot docs:', snapshot.docs.length);
        
        currentRequests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            currentRequests.push({
                id: doc.id,
                ...data
            });
        });

        console.log('Loaded requests from main path:', currentRequests.length);
        
        // If no requests found in main path, try backup path
        if (currentRequests.length === 0) {
            console.log('No requests found in main path, trying backup path...');
            try {
                const backupRef = window.db.collection('requests');
                const backupSnapshot = await backupRef.get();
                console.log('Backup snapshot size:', backupSnapshot.size);
                
                backupSnapshot.forEach(doc => {
                    const data = doc.data();
                    // Only include requests from current apartment
                    if (data.apartmentId === currentApartmentId) {
                        currentRequests.push({
                            id: doc.id,
                            ...data
                        });
                    }
                });
                console.log('Loaded requests from backup path:', currentRequests.length);
            } catch (backupError) {
                console.log('Backup path also failed:', backupError);
            }
        }
        
        // Sort by creation date (newest first)
        currentRequests.sort((a, b) => {
            const dateA = a.createdAtEpochMs || 0;
            const dateB = b.createdAtEpochMs || 0;
            return dateB - dateA;
        });

        applyFilters();
        updateStatistics();
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading requests:', error);
        showMessage('Error loading requests: ' + error.message, 'error');
        showLoading(false);
    }
}

// Apply filters and search
function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const priorityFilter = document.getElementById('priority-filter')?.value || '';
    const categoryFilter = document.getElementById('category-filter')?.value || '';

    filteredRequests = currentRequests.filter(request => {
        // Search filter
        const matchesSearch = !searchTerm || 
            request.ticketId?.toLowerCase().includes(searchTerm) ||
            request.residentName?.toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStatus = !statusFilter || request.status === statusFilter;

        // Priority filter
        const matchesPriority = !priorityFilter || request.priority === priorityFilter;

        // Category filter
        const matchesCategory = !categoryFilter || request.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    renderRequestsTable();
    updateResultsCount();
}

// Handle search input
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput && clearBtn) {
        if (searchInput.value.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    }
    
    applyFilters();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.value = '';
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    applyFilters();
}

// Render requests table
function renderRequestsTable() {
    const tbody = document.getElementById('requests-tbody');
    const emptyState = document.getElementById('empty-state');
    
    if (!tbody) return;
    
    if (filteredRequests.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    tbody.innerHTML = filteredRequests.map(request => `
        <tr class="request-row" onclick="openRequestModal('${request.id}')">
            <td class="ticket-number">${request.ticketId || '-'}</td>
            <td class="resident-name">${request.residentName || '-'}</td>
            <td class="apartment-room">${request.apartmentRoom || '-'}</td>
            <td class="category">
                <span class="category-badge ${getCategoryClass(request.category)}">
                    ${getCategoryLabel(request.category)}
                </span>
            </td>
            <td class="priority">
                <span class="priority-badge ${getPriorityClass(request.priority)}">
                    ${getPriorityLabel(request.priority)}
                </span>
            </td>
            <td class="description">
                <div class="description-text">
                    ${truncateText(request.description || 'No description', 50)}
                </div>
            </td>
            <td class="date-submitted">${formatDate(request.createdAtEpochMs)}</td>
            <td class="status">
                <span class="status-badge ${getStatusClass(request.status)}">
                    ${getStatusLabel(request.status)}
                </span>
            </td>
            <td class="actions">
                <button class="action-btn" onclick="event.stopPropagation(); openRequestModal('${request.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Open request modal
function openRequestModal(requestId) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;

    currentRequestId = requestId;
    
    // Populate modal with request data
    const elements = {
        'modal-ticket-number': request.ticketId || '-',
        'modal-resident-name': request.residentName || '-',
        'modal-apartment-room': request.apartmentRoom || '-',
        'modal-category': getCategoryLabel(request.category),
        'modal-priority': getPriorityLabel(request.priority),
        'modal-date-submitted': formatDate(request.createdAtEpochMs),
        'modal-current-status': getStatusLabel(request.status),
        'modal-description': request.description || 'No description provided.'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Set current status in select
    const statusSelect = document.getElementById('status-select');
    if (statusSelect) {
        statusSelect.value = request.status || 'PENDING';
    }
    
    // Load comments
    loadComments(requestId);
    
    // Show modal
    const modal = document.getElementById('request-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close request modal
function closeRequestModal() {
    const modal = document.getElementById('request-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentRequestId = '';
}

// Update request status
async function updateRequestStatus() {
    if (!currentRequestId) return;

    const statusSelect = document.getElementById('status-select');
    if (!statusSelect) return;
    
    const newStatus = statusSelect.value;
    const request = currentRequests.find(r => r.id === currentRequestId);
    
    if (!request) return;

    try {
        // Update in Firebase
        const requestRef = getRequestsBase().doc(currentRequestId);

        await requestRef.update({
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedAtEpochMs: Date.now()
        });

        // Update local data
        request.status = newStatus;
        request.updatedAt = new Date().toISOString();
        request.updatedAtEpochMs = Date.now();

        // Refresh display
        applyFilters();
        updateStatistics();
        
        // Update modal
        const modalStatus = document.getElementById('modal-current-status');
        if (modalStatus) {
            modalStatus.textContent = getStatusLabel(newStatus);
        }
        
        showMessage('Request status updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating status:', error);
        showMessage('Error updating status: ' + error.message, 'error');
    }
}

// Add comment
async function addComment() {
    const commentInput = document.getElementById('comment-input');
    if (!commentInput) return;
    
    const commentText = commentInput.value.trim();
    if (!commentText || !currentRequestId) return;

    try {
        const comment = {
            text: commentText,
            addedBy: localStorage.getItem('username') || 'Admin',
            addedAt: new Date().toISOString(),
            addedAtEpochMs: Date.now()
        };

        // Add comment to Firebase
        const requestRef = getRequestsBase().doc(currentRequestId);

        await requestRef.update({
            comments: firebase.firestore.FieldValue.arrayUnion(comment)
        });

        // Clear input
        commentInput.value = '';
        
        // Reload comments
        loadComments(currentRequestId);
        
        showMessage('Comment added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding comment:', error);
        showMessage('Error adding comment: ' + error.message, 'error');
    }
}

// Load comments
async function loadComments(requestId) {
    try {
        const request = currentRequests.find(r => r.id === requestId);
        const commentsList = document.getElementById('comments-list');
        
        if (!commentsList) return;
        
        if (!request || !request.comments) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet.</p>';
            return;
        }

        const commentsHtml = request.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <strong>${comment.addedBy}</strong>
                    <span class="comment-date">${formatDate(comment.addedAtEpochMs)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `).join('');

        commentsList.innerHTML = commentsHtml || '<p class="no-comments">No comments yet.</p>';
        
    } catch (error) {
        console.error('Error loading comments:', error);
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.innerHTML = '<p class="no-comments">Error loading comments.</p>';
        }
    }
}

// Update statistics
function updateStatistics() {
    const pending = currentRequests.filter(r => r.status === 'PENDING').length;
    const inProgress = currentRequests.filter(r => r.status === 'IN_PROGRESS').length;
    const completed = currentRequests.filter(r => r.status === 'COMPLETED').length;
    const total = currentRequests.length;

    const elements = {
        'pending-count': pending,
        'in-progress-count': inProgress,
        'completed-count': completed,
        'total-count': total
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Update results count
function updateResultsCount() {
    const count = filteredRequests.length;
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        resultsCount.textContent = `${count} request${count !== 1 ? 's' : ''} found`;
    }
}

// Show/hide loading state
function showLoading(show) {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
        loadingState.style.display = show ? 'flex' : 'none';
    }
}

// Show message
function showMessage(message, type) {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    container.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

// Utility functions for requests
function getCategoryClass(category) {
    const classes = {
        'PLUMBING': 'plumbing',
        'ELECTRICAL': 'electrical',
        'CLEANING': 'cleaning',
        'COMPLAINT': 'complaint',
        'OTHER': 'other'
    };
    return classes[category] || 'other';
}

function getCategoryLabel(category) {
    const labels = {
        'PLUMBING': 'Plumbing',
        'ELECTRICAL': 'Electrical',
        'CLEANING': 'Cleaning',
        'COMPLAINT': 'Complaint',
        'OTHER': 'Other'
    };
    return labels[category] || 'Other';
}

function getPriorityClass(priority) {
    const classes = {
        'LOW': 'low',
        'MEDIUM': 'medium',
        'HIGH': 'high'
    };
    return classes[priority] || 'medium';
}

function getPriorityLabel(priority) {
    const labels = {
        'LOW': 'Low',
        'MEDIUM': 'Medium',
        'HIGH': 'High'
    };
    return labels[priority] || 'Medium';
}

function getStatusClass(status) {
    const classes = {
        'PENDING': 'pending',
        'IN_PROGRESS': 'in-progress',
        'COMPLETED': 'completed'
    };
    return classes[status] || 'pending';
}

function getStatusLabel(status) {
    const labels = {
        'PENDING': 'Pending',
        'IN_PROGRESS': 'In Progress',
        'COMPLETED': 'Completed'
    };
    return labels[status] || 'Pending';
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Enhanced formatDate function for requests
function formatDate(epochMs) {
    if (!epochMs) return '-';
    const date = new Date(epochMs);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Cleanup when page is unloaded
window.addEventListener('beforeunload', function() {
    if (requestsListener) {
        requestsListener();
        requestsListener = null;
    }
});

// Fallback function if getRequestsBase is not available
function getRequestsBaseFallback() {
    console.log('=== USING FALLBACK getRequestsBase ===');
    const apartmentCollection = localStorage.getItem('apartmentCollection');
    console.log('Apartment collection from localStorage:', apartmentCollection);
    
    if (!apartmentCollection) {
        throw new Error('Apartment collection not set in localStorage');
    }
    
    // Check if db is available, if not wait for it
    if (typeof window.db === 'undefined') {
        throw new Error('Database not initialized. Please wait and try again.');
    }
    
    const path = window.db
        .collection(apartmentCollection)
        .doc('1HgCK9tLiQnkOURHXBtM')
        .collection('requests');
    
    console.log('Fallback path created:', path.path);
    return path;
}

// Wait for Firebase and database to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
        if (typeof firebase !== 'undefined' && 
            typeof window.db !== 'undefined' && 
            typeof getRequestsBase === 'function') {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize requests page when DOM is loaded and we're on the requests page
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the requests page
    if (window.location.pathname.includes('requests.html') || 
        document.querySelector('.requests-table') || 
        document.getElementById('requests-tbody')) {
        
        console.log('=== DOM CONTENT LOADED ===');
        console.log('Firebase available:', typeof firebase !== 'undefined');
        console.log('DB available:', typeof window.db !== 'undefined');
        console.log('getRequestsBase available:', typeof getRequestsBase === 'function');
        
        // Always try to initialize Firebase first
        try {
            initializeFirebase();
            console.log('After Firebase init - DB available:', typeof window.db !== 'undefined');
            console.log('After Firebase init - getRequestsBase available:', typeof getRequestsBase === 'function');
            
            if (typeof window.db !== 'undefined' && typeof getRequestsBase === 'function') {
                console.log('Initializing requests page...');
                initializeRequestsPage();
            } else {
                console.log('Firebase initialization failed, using fallback...');
                // Use fallback if getRequestsBase is not available
                if (typeof getRequestsBase !== 'function') {
                    window.getRequestsBase = getRequestsBaseFallback;
                }
                console.log('Initializing with fallback...');
                initializeRequestsPage();
            }
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            showMessage('Error initializing database. Please refresh the page.', 'error');
        }
    }
});

// Utility function to format date and time
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Utility function to get status color
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'confirmed':
            return 'status-confirmed';
        case 'pending':
            return 'status-pending';
        case 'cancelled':
            return 'status-cancelled';
        default:
            return 'status-pending';
    }
}

// Utility function to show loading
function showLoading(element, message = 'Loading...') {
    element.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

// Utility function to hide loading
function hideLoading(element) {
    const loadingElement = element.querySelector('.loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Utility function to show error message
function showError(element, message) {
    element.innerHTML = `
        <div class="no-bookings">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Utility function to show no data message
function showNoData(element, message = 'No bookings found') {
    element.innerHTML = `
        <div class="no-bookings">
            <i class="fas fa-calendar-times"></i>
            <p>${message}</p>
        </div>
    `;
}

} // End of the if statement that prevents multiple executions 

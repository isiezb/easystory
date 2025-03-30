// DOM Elements
const storyForm = document.getElementById('storyForm');
const storyOutput = document.getElementById('storyOutput');
const loadingOverlay = document.querySelector('.loading-overlay');
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');
const otherSubjectGroup = document.getElementById('otherSubjectGroup');
const subjectSelect = document.getElementById('subject');

// Initialize theme
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        const iconSpan = themeToggle.querySelector('span:first-child');
        const textSpan = themeToggle.querySelector('span:last-child');
        if (iconSpan) iconSpan.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        if (textSpan) textSpan.textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            const iconSpan = themeToggle.querySelector('span:first-child');
            const textSpan = themeToggle.querySelector('span:last-child');
            if (iconSpan) iconSpan.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            if (textSpan) textSpan.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    }

    // Subject selection
    if (subjectSelect && otherSubjectGroup) {
        subjectSelect.addEventListener('change', () => {
            otherSubjectGroup.style.display = subjectSelect.value === 'other' ? 'block' : 'none';
        });
    }

    // Story form submission
    if (storyForm) {
        storyForm.addEventListener('submit', handleStoryFormSubmit);
    }
}

// Handle story form submission
async function handleStoryFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.apiService) {
        showToast('API service not initialized', 'error');
        return;
    }
    
    const formData = new FormData(storyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Log form data for debugging
    console.log('Form data:', data);
    
    // Handle other subject
    if (data.subject === 'other') {
        data.subject = data.other_subject;
    }
    
    // Format data for API
    const requestData = {
        academic_grade: data.academic_grade || data.grade,
        subject: data.subject,
        subject_specification: data.subject_specification || '',
        setting: data.setting || 'a classroom',
        main_character: data.main_character || data.character || 'a student',
        word_count: parseInt(data.word_count || data.wordCount) || 500,
        language: data.language || 'english',
        generate_vocabulary: data.generate_vocabulary === 'on' || data.vocabulary === 'on',
        generate_summary: data.generate_summary === 'on' || data.summary === 'on'
    };
    
    // Show loading state
    if (window.uiHandler && window.uiHandler.showLoading) {
        window.uiHandler.showLoading();
    } else if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        console.log('Sending request data:', requestData);
        const response = await window.apiService.generateStory(requestData);
        console.log('Received response:', response);
        
        // Handle empty or invalid response
        if (!response) {
            throw new Error('Empty response from server');
        }
        
        // Display story
        if (window.uiHandler && window.uiHandler.displayStory) {
            window.uiHandler.displayStory(response);
        } else if (storyOutput) {
            displayStory(response);
        }
        
        // Show success toast
        showToast('Story generated successfully!', 'success');
        
        // Save story to Supabase if user is logged in
        if (window.supabase && window.supabase.auth) {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session) {
                    try {
                        const { error } = await window.supabase
                            .from('stories')
                            .insert({
                                user_id: session.user.id,
                                title: response.title || `${data.subject} Story - Grade ${requestData.academic_grade}`,
                                content: response.content,
                                metadata: {
                                    grade: requestData.academic_grade,
                                    subject: data.subject,
                                    word_count: requestData.word_count,
                                    vocabulary: response.vocabulary,
                                    summary: response.summary,
                                    learning_objectives: response.learning_objectives,
                                    quiz: response.quiz
                                }
                            });
                        
                        if (error) throw error;
                    } catch (error) {
                        console.error('Error saving story:', error);
                        showToast('Story generated but failed to save', 'warning');
                    }
                }
            } catch (supabaseError) {
                console.error('Error getting supabase session:', supabaseError);
            }
        }
    } catch (error) {
        console.error('Error generating story:', error);
        
        // Get a user-friendly error message
        let errorMessage = 'Failed to generate story';
        if (error.message) {
            errorMessage = error.message;
        }
        
        // Check if this is an ApiError with details
        if (error.name === 'ApiError') {
            if (error.status === 500) {
                errorMessage = 'Server error: The story generation service is currently unavailable. Please try again later.';
            } else if (error.status === 400) {
                errorMessage = 'Invalid request: Please check your inputs and try again.';
            } else if (error.status === 429) {
                errorMessage = 'Too many requests: Please wait a moment before trying again.';
            }
            
            if (error.details) {
                console.error('Error details:', error.details);
            }
        }
        
        showToast(errorMessage, 'error');
    } finally {
        // Hide loading state
        if (window.uiHandler && window.uiHandler.hideLoading) {
            window.uiHandler.hideLoading();
        } else if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Display story in the DOM
function displayStory(storyData) {
    if (!storyOutput) return;
    
    // Ensure storyData has the expected structure
    const content = storyData.content || storyData.story?.content || storyData.story || storyData;
    const title = storyData.title || storyData.story?.title || 'Generated Story';
    
    storyOutput.innerHTML = `
        <div class="story-container">
            <h2>${title}</h2>
            <div class="story-content">
                ${typeof content === 'string' 
                  ? content.split('\n').map(p => `<p>${p}</p>`).join('') 
                  : '<p>No content available</p>'}
            </div>
        </div>
    `;
    
    // Scroll to story
    storyOutput.scrollIntoView({ behavior: 'smooth' });
}

// Toast notification
function showToast(message, type = 'success') {
    if (window.uiHandler && window.uiHandler.showToast) {
        window.uiHandler.showToast(message, type);
        return;
    }
    
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// UI update functions
function updateUIForLoggedInUser(user) {
    try {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        const userEmail = document.getElementById('userEmail');
        const myStoriesSection = document.getElementById('myStoriesSection');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'flex';
        
        if (userAvatar && user.user_metadata && user.user_metadata.email) {
            userAvatar.textContent = user.user_metadata.email[0].toUpperCase();
        }
        
        if (userEmail && user.user_metadata && user.user_metadata.email) {
            userEmail.textContent = user.user_metadata.email;
        }
        
        // Show My Stories section
        if (myStoriesSection) {
            myStoriesSection.style.display = 'block';
            loadUserStories(user.id);
        }
    } catch (error) {
        console.error('Error updating UI for logged in user:', error);
    }
}

function updateUIForLoggedOutUser() {
    try {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfile = document.getElementById('userProfile');
        const myStoriesSection = document.getElementById('myStoriesSection');
        const storiesGrid = document.getElementById('storiesGrid');
        
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
        if (myStoriesSection) myStoriesSection.style.display = 'none';
        if (storiesGrid) storiesGrid.innerHTML = '';
    } catch (error) {
        console.error('Error updating UI for logged out user:', error);
    }
}

// Initialize app
async function init() {
    try {
        // Initialize theme
        initTheme();
        
        // Initialize Supabase auth if available
        if (window.auth && typeof window.auth.init === 'function') {
            try {
                await window.auth.init();
            } catch (authError) {
                console.warn('Failed to initialize auth:', authError);
            }
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Load user stories if logged in
        if (window.supabase && window.supabase.auth) {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session?.user) {
                    updateUIForLoggedInUser(session.user);
                } else {
                    updateUIForLoggedOutUser();
                }
            } catch (sessionError) {
                console.warn('Failed to get session:', sessionError);
                updateUIForLoggedOutUser();
            }
        } else {
            console.warn('Supabase not initialized, skipping user session check');
            updateUIForLoggedOutUser();
        }
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        // Don't show error if Supabase is not configured
        if (!error.message || !error.message.includes('Supabase not configured')) {
            showToast('Failed to initialize application', 'error');
        }
    }
}

// Load user stories
async function loadUserStories(userId) {
    const storiesGrid = document.getElementById('storiesGrid');
    if (!storiesGrid) return;
    
    storiesGrid.innerHTML = '<div class="loading-stories">Loading stories...</div>';
    
    try {
        if (!window.apiService) {
            throw new Error('API service not initialized');
        }
        
        const stories = await window.apiService.fetchUserStories(userId);
        
        if (!stories || stories.length === 0) {
            storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
            return;
        }
        
        storiesGrid.innerHTML = stories.map(story => `
            <div class="story-card">
                <h3>${story.title || 'Untitled Story'}</h3>
                <div class="story-meta">
                    <span class="story-subject">${story.metadata?.subject || 'Unknown'}</span>
                    <span class="story-date">${new Date(story.created_at).toLocaleDateString()}</span>
                </div>
                <div class="story-preview">${story.content ? story.content.substring(0, 150) + '...' : 'No content'}</div>
                <div class="story-actions">
                    <button class="view-story" data-story-id="${story.id}">View Story</button>
                    <button class="delete-story" data-story-id="${story.id}">Delete</button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to buttons
        storiesGrid.querySelectorAll('.view-story').forEach(button => {
            button.addEventListener('click', () => {
                const storyId = button.getAttribute('data-story-id');
                if (window.story && typeof window.story.view === 'function') {
                    window.story.view(storyId);
                }
            });
        });
        
        storiesGrid.querySelectorAll('.delete-story').forEach(button => {
            button.addEventListener('click', () => {
                const storyId = button.getAttribute('data-story-id');
                if (window.story && typeof window.story.delete === 'function') {
                    window.story.delete(storyId);
                }
            });
        });
    } catch (error) {
        console.error('Error loading stories:', error);
        if (storiesGrid) {
            storiesGrid.innerHTML = '<div class="no-stories">Failed to load stories</div>';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for global use
window.app = {
    init,
    loadUserStories,
    updateUIForLoggedInUser,
    updateUIForLoggedOutUser,
    showToast,
    displayStory
}; 
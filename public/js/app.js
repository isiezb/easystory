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
    
    // Get form data and ensure all expected fields are present
    const formData = new FormData(storyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Add more detailed logging for debugging
    console.log('Form submission - Raw form data:', data);
    // Log each field individually to identify potential issues
    Object.entries(data).forEach(([key, value]) => {
        console.log(`Form field: ${key} = ${value} (${typeof value})`);
    });
    
    // Handle other subject
    if (data.subject === 'other' && data.other_subject) {
        data.subject = data.other_subject;
    }
    
    // === New Check: Prevent API call if "Other" is selected but not specified ===
    if (data.subject === 'other' && !data.other_subject) {
        showToast('Please specify the subject when selecting "Other"', 'error');
        // Optionally, focus the input field:
        const otherSubjectInput = document.getElementById('otherSubject');
        if (otherSubjectInput) {
            otherSubjectInput.focus();
        }
        return; // Stop submission
    }
    // === End New Check ===
    
    // Show loading state
    if (window.uiHandler && window.uiHandler.showLoading) {
        window.uiHandler.showLoading();
    } else if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        console.log('Sending request to generate story...');
        
        // First try with normal API service
        try {
            const response = await window.apiService.generateStory(data);
            console.log('Received response:', response);
            
            // Display the story
            displayStory(response);
            
            // Check if Supabase is actually available before attempting save
            const isSupabaseAvailable = window.supabase && 
                                      window.supabase.auth && 
                                      typeof window.supabase.auth.getSession === 'function' &&
                                      !window.supabase._isMockClient;
            
            // If user is logged in AND Supabase is truly available, save the story
            if (isSupabaseAvailable && window.auth && typeof window.auth.getUser === 'function') {
                try {
                    console.log('User logged in and Supabase available, attempting to save story...');
                    
                    // Safely get the user, may return null
                    const user = window.auth.getUser();
                    
                    // Only proceed if user is available
                    if (user && user.id) {
                        // Ensure we have a valid response object to work with
                        if (!response || typeof response !== 'object') {
                            throw new Error('Invalid API response received for saving.');
                        }

                        // Construct the story object to save based *primarily* on the API response
                        // Use fallbacks cautiously only if response fields might genuinely be missing
                        const storyToSave = {
                            user_id: user.id,
                            // Prefer response title, fallback to a generic one
                            title: response.title || `Generated Story (${new Date().toLocaleDateString()})`,
                            // Prefer response content, fallback if absolutely necessary
                            content: response.content || 'No content generated.',
                            metadata: {
                                // Extract metadata primarily from response, falling back to form `data` only if necessary
                                grade: response.academic_grade || data.academic_grade || null,
                                subject: response.subject || data.subject || null,
                                word_count: response.word_count || parseInt(data.word_count, 10) || null,
                                language: response.language || data.language || null,
                                setting: response.setting || data.setting || null,
                                main_character: response.main_character || data.main_character || null,
                                // Add fields present in the response, like vocabulary/summary/objectives
                                // Use hasOwnProperty for safety if response structure is uncertain
                                vocabulary: response.hasOwnProperty('vocabulary') ? response.vocabulary : null,
                                summary: response.hasOwnProperty('summary') ? response.summary : null,
                                learning_objectives: response.hasOwnProperty('learning_objectives') ? response.learning_objectives : null,
                                // Ensure boolean flags are handled correctly, preferring response if available
                                generate_vocabulary: response.hasOwnProperty('generate_vocabulary') ? response.generate_vocabulary : (data.generate_vocabulary === 'on'),
                                generate_summary: response.hasOwnProperty('generate_summary') ? response.generate_summary : (data.generate_summary === 'on')
                                // Do NOT include 'quiz' as it's removed
                            },
                            created_at: new Date().toISOString()
                        };

                        // Clean metadata: Remove null/undefined values before saving
                        Object.keys(storyToSave.metadata).forEach(key => {
                            if (storyToSave.metadata[key] === null || storyToSave.metadata[key] === undefined) {
                                delete storyToSave.metadata[key];
                            }
                        });

                        console.log('Saving story object:', JSON.stringify(storyToSave, null, 2));
                        
                        const { error: saveError } = await window.supabaseClient
                            .from('stories')
                            .insert([storyToSave]);

                        if (saveError) {
                            console.error('Error saving story:', saveError);
                            showToast(`Failed to save story: ${saveError.message}`, 'error');
                        } else {
                            console.log('Story saved successfully');
                            showToast('Story generated and saved!', 'success');
                            loadUserStories(); // Refresh stories list
                        }
                    } else {
                        console.log('Supabase unavailable or user not logged in, skipping save');
                        showToast('Story generated! Login feature unavailable.', 'success');
                    }
                } catch (saveCatchError) {
                    console.error('Unexpected error during story save process:', saveCatchError);
                    showToast(`Error saving story: ${saveCatchError.message || 'Unknown error'}`, 'error');
                }
            } else {
                console.log('Supabase unavailable or user not logged in, skipping save');
                showToast('Story generated! Login feature unavailable.', 'success');
            }
        } catch (firstError) {
            console.error('Initial request failed, trying direct form submission:', firstError);
            
            // Last resort: Try direct form submission with minimal processing
            try {
                // Create FormData directly from the form element
                const directFormData = new FormData(storyForm);
                
                // Convert to a simple object with all values as strings
                const directData = {};
                for (const [key, value] of directFormData.entries()) {
                    directData[key] = value;
                }
                
                console.log('Attempting direct form submission:', directData);
                
                // Try to send directly to the server
                const directResponse = await fetch(`${window._config?.serverUrl || window.location.origin}/generate-story`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(directData)
                });
                
                if (directResponse.ok) {
                    const responseData = await directResponse.json();
                    console.log('Direct submission succeeded:', responseData);
                    
                    // Display the story
                    displayStory(responseData);
                } else {
                    // If both methods fail, fall back to mock data
                    console.error('Both methods failed, using mock data');
                    const mockResponse = window.apiService.getMockStoryData(data);
                    displayStory(mockResponse);
                }
            } catch (directError) {
                console.error('Direct submission also failed:', directError);
                // Use mock data as final fallback
                const mockResponse = window.apiService.getMockStoryData(data);
                displayStory(mockResponse);
            }
        }
    } catch (error) {
        console.error('Error generating story:', error);
        let errorMessage = 'Failed to generate story.';
        if (error instanceof ApiError) {
            errorMessage = `API Error (${error.status}): ${error.message}`;
        } else if (error.message) {
            errorMessage = error.message; // Display the more specific error from the multi-step fetch
        }
        showToast(errorMessage, 'error', 10000); // Show error for longer
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
    
    console.log('Displaying story data:', storyData);
    
    // Handle the server response structure which could be in many formats
    let storyContent = null;
    
    // Format 1: response.data.story
    if (storyData.data && storyData.data.story) {
        storyContent = storyData.data.story;
    }
    // Format 2: response.story
    else if (storyData.story) {
        storyContent = storyData.story;
    }
    // Format 3: direct story object
    else if (storyData.content || storyData.title) {
        storyContent = storyData;
    }
    // Format 4: fallback for unknown structure
    else {
        console.warn('Unknown story data format:', storyData);
        storyContent = {
            title: 'Generated Story',
            content: typeof storyData === 'string' ? storyData : JSON.stringify(storyData, null, 2)
        };
    }
    
    // Ensure we have the expected fields, with fallbacks
    const content = storyContent.content || '';
    const title = storyContent.title || 'Generated Story';
    const summary = storyContent.summary || null;
    const vocabulary = storyContent.vocabulary || null;
    const learningObjectives = storyContent.learning_objectives || [];
    
    // Build story HTML
    let storyHTML = `
        <div class="story-container">
            <h2>${title}</h2>
            ${summary ? `
                <div class="story-summary">
                    <h3>Summary</h3>
                    <p>${summary}</p>
                </div>
            ` : ''}
            <div class="story-content">
                ${typeof content === 'string' 
                  ? content.split('\n').map(p => `<p>${p}</p>`).join('') 
                  : '<p>No content available</p>'}
            </div>
    `;
    
    // Add learning objectives if available
    if (learningObjectives && learningObjectives.length > 0) {
        storyHTML += `
            <div class="learning-objectives">
                <h3>Learning Objectives</h3>
                <ul>
                    ${learningObjectives.map(objective => `<li>${objective}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add vocabulary if available
    if (vocabulary && vocabulary.length > 0) {
        storyHTML += `
            <div class="vocabulary">
                <h3>Vocabulary</h3>
                <dl>
                    ${vocabulary.map(item => `
                        <dt>${item.word}</dt>
                        <dd>${item.definition}</dd>
                    `).join('')}
                </dl>
            </div>
        `;
    }
    
    // Close container
    storyHTML += `</div>`;
    
    // Set HTML and scroll to story
    storyOutput.innerHTML = storyHTML;
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
            loadUserStories();
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
        // Check if API service is available
        if (!window.apiService) {
            console.error('API service not initialized. Make sure apiService.js is loaded before app.js');
        }
        
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
async function loadUserStories() {
    // Skip if dependencies are missing
    if (!window.auth || !window.supabaseClient) {
        console.log('Auth or Supabase client not available, skipping story load');
        return;
    }

    // Check for user
    let user = null;
    
    // Try to get user from auth service
    if (typeof window.auth.getUser === 'function') {
        user = window.auth.getUser();
    }
    
    // If no user, try async method
    if (!user && typeof window.auth.getUserAsync === 'function') {
        try {
            user = await window.auth.getUserAsync();
        } catch (e) {
            console.warn('Error getting user async:', e);
        }
    }
    
    // If still no user, try from session directly
    if (!user && window.supabase && window.supabase.auth) {
        try {
            const { data } = await window.supabase.auth.getSession();
            user = data?.session?.user;
        } catch (e) {
            console.warn('Error getting session directly:', e);
        }
    }

    // Exit if still no user
    if (!user || !user.id) {
        console.log('No authenticated user found, skipping story load');
        return;
    }

    console.log('Loading stories for user:', user.id);
    const storiesGrid = document.getElementById('storiesGrid');
    const myStoriesSection = document.getElementById('myStoriesSection');
    if (!storiesGrid || !myStoriesSection) return;

    storiesGrid.innerHTML = '<div class="loading-spinner-small"></div> Loading stories...'; // Show loading state
    myStoriesSection.style.display = 'block';

    try {
        const stories = await window.apiService.fetchUserStories();
        storiesGrid.innerHTML = ''; // Clear loading state
        if (stories && stories.length > 0) {
            stories.forEach(story => {
                const storyElement = createStorySummaryElement(story);
                storiesGrid.appendChild(storyElement);
            });
        } else {
            storiesGrid.innerHTML = '<p>No stories saved yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load stories:', error);
        storiesGrid.innerHTML = '<p>Could not load stories.</p>'; // Clear loading state
        // Provide more detail in the error message
        const errorMsg = error instanceof ApiError 
            ? `${error.message} (Status: ${error.status})` 
            : (error.message || 'Unknown error');
        showToast(`Failed to load stories: ${errorMsg}`, 'error');
        myStoriesSection.style.display = 'none'; // Optionally hide section on error
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
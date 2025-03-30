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
    
    // Make sure we have essential fields
    if (!data.subject) {
        showToast('Please select a subject', 'error');
        return;
    }
    
    // Show loading state
    if (window.uiHandler && window.uiHandler.showLoading) {
        window.uiHandler.showLoading();
    } else if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    
    try {
        // Let apiService handle the formatting
        const response = await window.apiService.generateStory(data);
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
        
        // If user is logged in, save the story
        if (window.auth && window.auth.getUser()) {
            try {
                console.log('User logged in, attempting to save story...');
                
                // Construct the story object to save based *primarily* on the API response
                // Use fallbacks cautiously if response fields might be missing
                const storyToSave = {
                    user_id: window.auth.getUser().id,
                    title: response.title || `Generated Story (${new Date().toLocaleDateString()})`, // Use response title or a generic fallback
                    content: response.content || 'No content generated.', // Use response content
                    metadata: {
                        // Use response fields if available, otherwise null or defaults
                        grade: response.academic_grade || null, 
                        subject: response.subject || null,
                        word_count: response.word_count || null,
                        language: response.language || null,
                        setting: response.setting || null,
                        main_character: response.main_character || null,
                        // Ensure these boolean flags exist on the response object before accessing
                        generate_vocabulary: response.hasOwnProperty('generate_vocabulary') ? response.generate_vocabulary : null,
                        generate_summary: response.hasOwnProperty('generate_summary') ? response.generate_summary : null,
                        // Add fields present in the response, like vocabulary/summary/objectives
                        vocabulary: response.vocabulary || null,
                        summary: response.summary || null,
                        learning_objectives: response.learning_objectives || null,
                        // Do NOT include 'quiz' as it's likely removed
                    },
                    created_at: new Date().toISOString() 
                };

                // Remove null/undefined values from metadata before saving if needed by Supabase
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
            } catch (saveCatchError) {
                console.error('Unexpected error during story save process:', saveCatchError);
                showToast(`Error saving story: ${saveCatchError.message}`, 'error');
            }
        } else {
            showToast('Story generated! Log in to save it.', 'success');
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
    if (!window.auth || !window.supabaseClient) return; // Ensure dependencies are loaded

    const user = window.auth.getUser();
    if (!user) return;

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
        const errorMsg = error instanceof ApiError ? `${error.message} (Status: ${error.status})` : error.message;
        showToast(`Failed to load stories: ${errorMsg || 'Unknown error'}`, 'error');
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
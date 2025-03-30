import { apiService } from './apiService.js';
import { supabase } from './supabase.js';
import { auth } from './auth.js';
import { uiHandler } from './uiHandler.js';

// DOM Elements
const storyForm = document.getElementById('storyForm');
const storyOutput = document.getElementById('storyOutput');
const loadingOverlay = document.querySelector('.loading-overlay');
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');
const otherSubjectGroup = document.getElementById('otherSubjectGroup');
const subjectSelect = document.getElementById('subject');

// Theme handling
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
themeToggle.querySelector('span:first-child').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
themeToggle.querySelector('span:last-child').textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.querySelector('span:first-child').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.querySelector('span:last-child').textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
});

// Subject selection handling
subjectSelect.addEventListener('change', () => {
    otherSubjectGroup.style.display = subjectSelect.value === 'other' ? 'block' : 'none';
});

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Success' : 'Error'}</div>
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

// Story form submission
storyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const formData = new FormData(storyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Handle other subject
    if (data.subject === 'other') {
        data.subject = data.other_subject;
    }
    
    // Format data for API
    const requestData = {
        academic_grade: data.academic_grade,
        subject: data.subject,
        subject_specification: data.subject_specification || '',
        setting: data.setting || 'a classroom',
        main_character: data.main_character || 'a student',
        word_count: parseInt(data.word_count),
        language: data.language,
        generate_vocabulary: data.generate_vocabulary === 'on',
        generate_summary: data.generate_summary === 'on'
    };
    
    try {
        uiHandler.showLoading();
        const response = await apiService.generateStory(requestData);
        
        // Display story using uiHandler
        uiHandler.displayStory(response);
        uiHandler.showToast('Story generated successfully!', 'success');
        
        // Save story to Supabase if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            try {
                const { error } = await supabase
                    .from('stories')
                    .insert({
                        user_id: session.user.id,
                        title: `${data.subject} Story - Grade ${data.academic_grade}`,
                        content: response.content,
                        metadata: {
                            grade: data.academic_grade,
                            subject: data.subject,
                            word_count: data.word_count,
                            vocabulary: response.vocabulary,
                            summary: response.summary,
                            learning_objectives: response.learning_objectives,
                            quiz: response.quiz
                        }
                    });
                
                if (error) throw error;
            } catch (error) {
                console.error('Error saving story:', error);
                uiHandler.showToast('Failed to save story', 'error');
            }
        }
    } catch (error) {
        console.error('Error generating story:', error);
        uiHandler.showError(error);
    } finally {
        uiHandler.hideLoading();
    }
});

// UI update functions
function updateUIForLoggedInUser(user) {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('signupBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userProfile').style.display = 'flex';
    document.getElementById('userAvatar').textContent = user.user_metadata.email[0].toUpperCase();
    document.getElementById('userEmail').textContent = user.user_metadata.email;
    
    // Show My Stories section
    document.getElementById('myStoriesSection').style.display = 'block';
    loadUserStories(user.id);
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('signupBtn').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('userProfile').style.display = 'none';
    document.getElementById('myStoriesSection').style.display = 'none';
    document.getElementById('storiesGrid').innerHTML = '';
}

// Initialize app
async function init() {
    try {
        // Initialize Supabase
        await auth.init();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load user stories if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            updateUIForLoggedInUser(session.user);
            await loadUserStories(session.user.id);
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        // Don't show error if Supabase is not configured
        if (!error.message.includes('Supabase not configured')) {
            uiHandler.showError('Failed to initialize application');
        }
    }
}

// Load user stories
async function loadUserStories(userId) {
    const storiesGrid = document.getElementById('storiesGrid');
    storiesGrid.innerHTML = '<div class="loading-stories">Loading stories...</div>';
    
    try {
        const stories = await apiService.fetchUserStories(userId);
        
        if (stories.length === 0) {
            storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
            return;
        }
        
        storiesGrid.innerHTML = stories.map(story => `
            <div class="story-card">
                <h3>${story.title}</h3>
                <div class="story-meta">
                    <span class="story-subject">${story.metadata.subject}</span>
                    <span class="story-date">${new Date(story.created_at).toLocaleDateString()}</span>
                </div>
                <div class="story-preview">${story.content.substring(0, 150)}...</div>
                <div class="story-actions">
                    <button class="view-story" onclick="story.view('${story.id}')">View Story</button>
                    <button class="delete-story" onclick="story.delete('${story.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading stories:', error);
        storiesGrid.innerHTML = '<div class="no-stories">Failed to load stories</div>';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 
import { apiService } from './apiService.js';
import { supabase } from './supabase.js';

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
    
    const formData = new FormData(storyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Handle other subject
    if (data.subject === 'other') {
        data.subject = data.other_subject;
    }
    
    try {
        loadingOverlay.style.display = 'flex';
        const response = await apiService.generateStory(data);
        
        // Display story
        storyOutput.innerHTML = `
            <div class="story-content">
                <div class="story-meta">
                    <span>Grade: ${data.academic_grade}</span>
                    <span>Subject: ${data.subject}</span>
                    <span>Length: ${data.word_count} words</span>
                </div>
                <div class="story-text">${response.content}</div>
            </div>
        `;
        
        // Display vocabulary if requested
        if (data.generate_vocabulary && response.vocabulary) {
            const vocabularySection = document.createElement('div');
            vocabularySection.className = 'vocabulary-section';
            vocabularySection.innerHTML = `
                <h3>Vocabulary List</h3>
                <div class="vocabulary-list">
                    ${response.vocabulary.map(word => `
                        <div class="vocabulary-item">
                            <div class="vocabulary-word">${word.word}</div>
                            <div class="vocabulary-definition">${word.definition}</div>
                            <div class="vocabulary-example">${word.example}</div>
                            <div class="vocabulary-part">${word.part_of_speech}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            storyOutput.appendChild(vocabularySection);
        }
        
        // Display summary if requested
        if (data.generate_summary && response.summary) {
            const summarySection = document.createElement('div');
            summarySection.className = 'story-summary';
            summarySection.innerHTML = `
                <div class="story-summary-title">Story Summary</div>
                <div class="story-summary-content">${response.summary}</div>
            `;
            storyOutput.appendChild(summarySection);
        }
        
        showToast('Story generated successfully!');
        
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
                showToast('Failed to save story', 'error');
            }
        }
    } catch (error) {
        console.error('Error generating story:', error);
        showToast(error.message || 'Failed to generate story', 'error');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

// UI update functions
function updateUIForLoggedInUser() {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('signupBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userProfile').style.display = 'flex';
    document.getElementById('userAvatar').textContent = currentUser.email[0].toUpperCase();
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Show My Stories section
    document.getElementById('myStoriesSection').style.display = 'block';
    loadUserStories(currentUser.id);
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
        // Wait for environment variables to be loaded
        if (!window._env_) {
            await new Promise(resolve => {
                const checkEnv = () => {
                    if (window._env_) {
                        resolve();
                    } else {
                        setTimeout(checkEnv, 100);
                    }
                };
                checkEnv();
            });
        }

        // Initialize Supabase
        if (!window._env_?.SUPABASE_URL || !window._env_?.SUPABASE_KEY) {
            throw new Error('Missing Supabase configuration');
        }

        // Check if user is logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error checking session:', error);
            return;
        }

        if (session) {
            currentUser = session.user;
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
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
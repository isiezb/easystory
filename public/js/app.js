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
                <div class="story-text">${response.story}</div>
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
                        content: response.story,
                        metadata: {
                            grade: data.academic_grade,
                            subject: data.subject,
                            word_count: data.word_count,
                            vocabulary: response.vocabulary,
                            summary: response.summary
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

// Initialize app
async function init() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Update UI for logged-in user
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('signupBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'block';
            document.getElementById('userProfile').style.display = 'flex';
            document.getElementById('userAvatar').textContent = session.user.email[0].toUpperCase();
            document.getElementById('userEmail').textContent = session.user.email;
            
            // Show My Stories section
            document.getElementById('myStoriesSection').style.display = 'block';
            await loadUserStories(session.user.id);
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
                    <button class="view-story" onclick="viewStory('${story.id}')">View Story</button>
                    <button class="delete-story" onclick="deleteStory('${story.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading stories:', error);
        storiesGrid.innerHTML = '<div class="no-stories">Failed to load stories</div>';
    }
}

// View story
window.viewStory = async (storyId) => {
    try {
        const story = await apiService.getStoryById(storyId);
        storyOutput.innerHTML = `
            <div class="story-content">
                <div class="story-meta">
                    <span>Grade: ${story.metadata.grade}</span>
                    <span>Subject: ${story.metadata.subject}</span>
                    <span>Length: ${story.metadata.word_count} words</span>
                </div>
                <div class="story-text">${story.content}</div>
            </div>
        `;
        
        if (story.metadata.vocabulary) {
            const vocabularySection = document.createElement('div');
            vocabularySection.className = 'vocabulary-section';
            vocabularySection.innerHTML = `
                <h3>Vocabulary List</h3>
                <div class="vocabulary-list">
                    ${story.metadata.vocabulary.map(word => `
                        <div class="vocabulary-item">
                            <div class="vocabulary-word">${word.word}</div>
                            <div class="vocabulary-definition">${word.definition}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            storyOutput.appendChild(vocabularySection);
        }
        
        if (story.metadata.summary) {
            const summarySection = document.createElement('div');
            summarySection.className = 'story-summary';
            summarySection.innerHTML = `
                <div class="story-summary-title">Story Summary</div>
                <div class="story-summary-content">${story.metadata.summary}</div>
            `;
            storyOutput.appendChild(summarySection);
        }
        
        // Scroll to story
        storyOutput.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error viewing story:', error);
        showToast('Failed to load story', 'error');
    }
};

// Delete story
window.deleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    
    try {
        await apiService.deleteStory(storyId);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await loadUserStories(session.user.id);
        }
        showToast('Story deleted successfully');
    } catch (error) {
        console.error('Error deleting story:', error);
        showToast('Failed to delete story', 'error');
    }
};

// Initialize the app
init(); 
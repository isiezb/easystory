export const uiHandler = {
    showLoading() {
        document.querySelector('.loading-overlay').style.display = 'flex';
    },

    hideLoading() {
        document.querySelector('.loading-overlay').style.display = 'none';
    },

    updateSubmitButton(submitButton, isLoading) {
        submitButton.disabled = isLoading;
        submitButton.querySelector('span').textContent = isLoading ? 'Generating Story...' : 'Generate Story';
    },

    displayStory(storyData) {
        const storyOutput = document.getElementById('storyOutput');
        
        // Validate story data structure
        if (!storyData || typeof storyData !== 'object') {
            this.showError('Invalid story data');
            return;
        }

        const story = typeof storyData === 'string' ? {
            title: 'Story',
            content: storyData,
            learning_objectives: ['Understanding the main concepts', 'Analyzing key events', 'Applying knowledge']
        } : storyData.story;

        if (!story || !story.title || !story.content) {
            this.showError('Story data is missing required fields');
            return;
        }

        const sanitizeText = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        const storyHTML = `
            <div class="story__content">
                <div class="story__header">
                    <h2 class="story__title">${sanitizeText(story.title)}</h2>
                    <button id="tts-button" class="story__tts-btn" aria-label="Text to Speech" disabled>
                        <span class="story__tts-icon">🔊</span>
                    </button>
                </div>
                ${story.summary ? `
                    <div class="story__summary">
                        <div class="story__summary-title">Story Summary</div>
                        <div class="story__summary-content">${sanitizeText(story.summary)}</div>
                    </div>
                ` : ''}
                <div class="story__meta">
                    <div class="story__learning-objectives">
                        <h4>Learning Objectives:</h4>
                        <ul>
                            ${(story.learning_objectives || []).map(obj => `<li>${sanitizeText(obj)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div id="story-image-placeholder" class="story__image-placeholder" style="display: none;"></div>
                <div class="story__text">
                    ${story.content.split('\n').map(paragraph => `
                        <div class="story__paragraph-container">
                            <p class="story__paragraph">${sanitizeText(paragraph)}</p>
                            <button class="story__tts-btn story__tts-btn--paragraph" aria-label="Read paragraph" disabled>
                                <span class="story__tts-icon">🔊</span>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="story__actions">
                    <button class="story__action-btn story__action-btn--copy">
                        <span>Copy</span>
                    </button>
                    <button class="story__action-btn story__action-btn--save">
                        <span>Save</span>
                    </button>
                    <button class="story__action-btn story__action-btn--print">
                        <span>Print</span>
                    </button>
                </div>
            </div>
        `;
        
        storyOutput.innerHTML = storyHTML;
        this.setupStoryActions();
    },

    setupStoryActions() {
        const copyBtn = document.querySelector('.story__action-btn--copy');
        copyBtn.addEventListener('click', async () => {
            try {
                const storyText = document.querySelector('.story__text').textContent;
                await navigator.clipboard.writeText(storyText);
                copyBtn.classList.add('story__action-btn--active');
                copyBtn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.classList.remove('story__action-btn--active');
                    copyBtn.querySelector('span').textContent = 'Copy';
                }, 2000);
            } catch (error) {
                this.showError('Failed to copy text to clipboard');
                console.error('Clipboard error:', error);
            }
        });
        
        const printBtn = document.querySelector('.story__action-btn--print');
        printBtn.addEventListener('click', () => {
            try {
                window.print();
            } catch (error) {
                this.showError('Failed to open print dialog');
                console.error('Print error:', error);
            }
        });
    },

    displayStoriesGrid(stories) {
        const storiesGrid = document.getElementById('storiesGrid');
        
        if (!stories || !Array.isArray(stories)) {
            this.showError('Invalid stories data');
            storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
            return;
        }

        if (stories.length === 0) {
            storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
            return;
        }

        const sanitizeText = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const formatDate = (dateString) => {
            try {
                return new Date(dateString).toLocaleDateString();
            } catch (error) {
                console.error('Date formatting error:', error);
                return 'Invalid date';
            }
        };

        storiesGrid.innerHTML = stories.map(story => `
            <div class="story-card" data-story-id="${story.id}">
                <h3>${sanitizeText(story.story_title)}</h3>
                <div class="story-meta">
                    <span class="story-subject">${sanitizeText(story.subject)}</span>
                    <span class="story-date">${formatDate(story.created_at)}</span>
                </div>
                <div class="story-preview">${sanitizeText(story.story_text.substring(0, 150))}...</div>
                <div class="story-actions">
                    <button class="view-story" data-story-id="${story.id}">View Story</button>
                    <button class="delete-story" data-story-id="${story.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners after rendering
        storiesGrid.querySelectorAll('.view-story').forEach(btn => {
            btn.addEventListener('click', () => {
                const storyId = btn.dataset.storyId;
                if (storyId) {
                    window.viewStory(storyId);
                }
            });
        });

        storiesGrid.querySelectorAll('.delete-story').forEach(btn => {
            btn.addEventListener('click', () => {
                const storyId = btn.dataset.storyId;
                if (storyId) {
                    window.deleteStory(storyId);
                }
            });
        });
    },

    showToast(message, type = 'info', duration = 5000) {
        const toast = document.querySelector('.toast-container');
        const toastElement = document.createElement('div');
        toastElement.className = `toast ${type}`;
        
        // Add icon based on type
        const icon = this.getToastIcon(type);
        
        toastElement.innerHTML = `
            <div class="toast-content">
                <div class="toast-header">
                    ${icon}
                    <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                </div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        toast.appendChild(toastElement);

        // Add close button functionality
        const closeBtn = toastElement.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toastElement.remove();
        });

        // Auto-remove after duration
        setTimeout(() => {
            toastElement.remove();
        }, duration);
    },

    getToastIcon(type) {
        const icons = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return `<span class="toast-icon">${icons[type] || icons.info}</span>`;
    },

    showError(error) {
        let message = 'An error occurred';
        let type = 'error';
        
        if (error instanceof Error) {
            if (error.name === 'ApiError') {
                // Handle specific status codes
                switch (error.status) {
                    case 401:
                        message = 'Please sign in to continue';
                        type = 'warning';
                        break;
                    case 403:
                        message = 'You do not have permission to perform this action';
                        type = 'warning';
                        break;
                    case 429:
                        message = 'Too many requests. Please try again later';
                        type = 'warning';
                        break;
                    case 503:
                        message = 'Service temporarily unavailable. Please try again later';
                        type = 'warning';
                        break;
                    default:
                        message = error.message;
                }
                
                if (error.details) {
                    message += `: ${error.details}`;
                }
            } else {
                message = error.message;
            }
        } else if (typeof error === 'string') {
            message = error;
        }

        this.showToast(message, type);
    },

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">Success</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        document.getElementById('toastContainer').appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    updateUserProfile(user) {
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
    },

    showAuthModal(type = 'login') {
        const modal = document.getElementById('authModal');
        const title = modal.querySelector('.modal-title');
        const form = modal.querySelector('form');
        const submitBtn = modal.querySelector('button[type="submit"]');
        
        if (type === 'login') {
            title.textContent = 'Login';
            form.dataset.type = 'login';
            submitBtn.textContent = 'Login';
        } else {
            title.textContent = 'Sign Up';
            form.dataset.type = 'signup';
            submitBtn.textContent = 'Sign Up';
        }
        
        modal.style.display = 'flex';
    },

    hideAuthModal() {
        document.getElementById('authModal').style.display = 'none';
    },

    showStory(story) {
        const storyOutput = document.getElementById('storyOutput');
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

        storyOutput.scrollIntoView({ behavior: 'smooth' });
    }
}; 
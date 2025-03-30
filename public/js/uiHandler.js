// UI Handler
const uiHandler = {
    showLoading(message = 'Loading...') {
        // Use our Lit component instead
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.show(message);
        }
    },

    hideLoading() {
        // Use our Lit component instead
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.hide();
        }
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
        // Use our Lit component for the stories grid
        const storiesGrid = document.getElementById('storiesGrid');
        
        if (!storiesGrid) {
            console.error('Stories grid element not found');
            return;
        }
        
        // Update the stories property
        storiesGrid.stories = stories || [];
        
        // Attach event listeners using event delegation
        storiesGrid.addEventListener('view-story', (e) => {
            const storyId = e.detail.storyId;
            if (storyId && window.viewStory) {
                window.viewStory(storyId);
            }
        });
        
        storiesGrid.addEventListener('delete-story', (e) => {
            const storyId = e.detail.storyId;
            if (storyId && window.deleteStory) {
                window.deleteStory(storyId);
            }
        });
    },

    showToast(message, type = 'info', duration = 5000) {
        // Use our Lit component for toasts
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.showToast(message, type, duration);
        }
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
                        message = error.message || 'API request failed';
                }
            } else {
                message = error.message || 'An unexpected error occurred';
            }
        } else if (typeof error === 'string') {
            message = error;
        }
        
        this.showToast(message, type);
    },

    showSuccess(message) {
        this.showToast(message, 'success');
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

// Make uiHandler globally available
window.uiHandler = uiHandler; 
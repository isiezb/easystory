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
        
        if (!stories || stories.length === 0) {
            storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
            return;
        }

        storiesGrid.innerHTML = stories.map(story => `
            <div class="story-card" data-story-id="${story.id}">
                <h3>${story.story_title}</h3>
                <div class="story-meta">
                    <span class="story-subject">${story.subject}</span>
                    <span class="story-date">${new Date(story.created_at).toLocaleDateString()}</span>
                </div>
                <div class="story-preview">${story.story_text.substring(0, 150)}...</div>
                <div class="story-actions">
                    <button class="view-story" onclick="viewStory('${story.id}')">View Story</button>
                    <button class="delete-story" onclick="deleteStory('${story.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
        this.showToast(message, 'success');
    }
}; 
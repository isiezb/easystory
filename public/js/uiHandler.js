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
        
        const story = typeof storyData === 'string' ? {
            title: 'Story',
            content: storyData,
            learning_objectives: ['Understanding the main concepts', 'Analyzing key events', 'Applying knowledge']
        } : storyData.story;
        
        const storyHTML = `
            <div class="story-content">
                <h2>${story.title}</h2>
                ${story.summary ? `
                    <div class="story-summary">
                        <div class="story-summary-title">Story Summary</div>
                        <div class="story-summary-content">${story.summary}</div>
                    </div>
                ` : ''}
                <div class="story-meta">
                    <div class="learning-objectives">
                        <h4>Learning Objectives:</h4>
                        <ul>
                            ${story.learning_objectives.map(obj => `<li>${obj}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="story-text">
                    ${story.content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
                </div>
                <div class="story-actions">
                    <button class="action-btn copy-btn">
                        <span>Copy</span>
                    </button>
                    <button class="action-btn save-btn">
                        <span>Save</span>
                    </button>
                    <button class="action-btn print-btn">
                        <span>Print</span>
                    </button>
                </div>
            </div>
        `;
        
        storyOutput.innerHTML = storyHTML;
        this.setupStoryActions();
    },

    setupStoryActions() {
        const copyBtn = document.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const storyText = document.querySelector('.story-text').textContent;
            navigator.clipboard.writeText(storyText);
            copyBtn.classList.add('active');
            copyBtn.querySelector('span').textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.classList.remove('active');
                copyBtn.querySelector('span').textContent = 'Copy';
            }, 2000);
        });
        
        const printBtn = document.querySelector('.print-btn');
        printBtn.addEventListener('click', () => {
            window.print();
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

    showError(message) {
        const toast = document.querySelector('.toast-container');
        toast.innerHTML = `
            <div class="toast error">
                <div class="toast-content">
                    <div class="toast-title">Error</div>
                    <div class="toast-message">${message}</div>
                </div>
            </div>
        `;
    },

    showSuccess(message) {
        const toast = document.querySelector('.toast-container');
        toast.innerHTML = `
            <div class="toast success">
                <div class="toast-content">
                    <div class="toast-title">Success</div>
                    <div class="toast-message">${message}</div>
                </div>
            </div>
        `;
    }
}; 
/**
 * This file handles the setup and initialization of our Lit components
 * and ensures backward compatibility with the existing codebase.
 */

// Import our components - using consistent relative paths for better compatibility
import '../components/toast-notification.js';
import '../components/toast-container.js';
import '../components/loading-overlay.js';
import '../components/story-card.js';
import '../components/stories-grid.js';
import '../components/story-display.js';
import '../components/quiz-component.js';
import '../components/story-form.js';
import '../components/story-continuation.js';
import '../components/story-content.js';

// Check for Web Components support
const supportsCustomElements = 'customElements' in window;
const supportsShadowDOM = !!HTMLElement.prototype.attachShadow;

if (!supportsCustomElements || !supportsShadowDOM) {
  console.warn('Browser does not fully support Web Components. Some features may not work properly.');
  
  // Show warning for users
  document.addEventListener('DOMContentLoaded', () => {
    window.showToast?.('Your browser may not support all features. Please use a modern browser for the best experience.', 'warning', 8000);
  });
}

// Add a fallback mechanism to ensure components are defined
function ensureComponentsDefined() {
  const components = [
    { name: 'toast-notification', path: '../components/toast-notification.js' },
    { name: 'toast-container', path: '../components/toast-container.js' },
    { name: 'loading-overlay', path: '../components/loading-overlay.js' },
    { name: 'story-card', path: '../components/story-card.js' },
    { name: 'stories-grid', path: '../components/stories-grid.js' },
    { name: 'story-display', path: '../components/story-display.js' },
    { name: 'quiz-component', path: '../components/quiz-component.js' },
    { name: 'story-form', path: '../components/story-form.js' },
    { name: 'story-continuation', path: '../components/story-continuation.js' },
    { name: 'story-content', path: '../components/story-content.js' }
  ];
  
  components.forEach(component => {
    if (!customElements.get(component.name)) {
      console.warn(`Component ${component.name} not defined. Attempting to load from ${component.path}`);
      
      // Try to load the component with an alternative path
      const script = document.createElement('script');
      script.type = 'module';
      script.src = component.path.replace('../', './');
      
      // Also try the absolute path if relative path fails
      script.onerror = () => {
        console.warn(`Failed to load ${component.path}. Trying absolute path.`);
        script.src = '/components/' + component.path.split('/').pop();
      };
      
      document.head.appendChild(script);
    }
  });
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Ensure components are defined
  setTimeout(ensureComponentsDefined, 500);
  
  // Setup Toast functionality
  setupToastSystem();
  
  // Setup Loading Overlay functionality
  setupLoadingOverlay();
  
  // Setup Story Display compatibility
  setupStoryDisplayCompat();
  
  // Setup Story Form compatibility
  setupStoryFormCompat();
  
  // Setup Quiz component compatibility
  setupQuizCompat();
  
  // Setup Story Continuation compatibility
  setupStoryContinuationCompat();
  
  // Setup Story Content compatibility
  setupStoryContentCompat();

  // Stories Grid setup
  const storiesGrid = document.getElementById('storiesGrid');
  if (storiesGrid) {
    // Set up event handlers that will communicate with the existing codebase
    storiesGrid.addEventListener('view-story', (e) => {
      const { storyId } = e.detail;
      if (typeof window.viewStory === 'function') {
        window.viewStory(storyId);
      }
    });
    
    storiesGrid.addEventListener('delete-story', (e) => {
      const { storyId } = e.detail;
      if (typeof window.deleteStory === 'function') {
        window.deleteStory(storyId);
      }
    });
  }

  console.log('Lit components initialized successfully');
});

function setupToastSystem() {
  // Create and append the toast container if it doesn't exist
  if (!document.querySelector('toast-container')) {
    const toastContainer = document.createElement('toast-container');
    document.body.appendChild(toastContainer);
  }
  
  // Global toast notification function (for backward compatibility)
  window.showToast = (message, type = 'info', duration = 3000) => {
    const event = new CustomEvent('show-toast', {
      detail: { message, type, duration },
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  };
}

function setupLoadingOverlay() {
  // Create and append the loading overlay if it doesn't exist
  if (!document.querySelector('loading-overlay')) {
    const loadingOverlay = document.createElement('loading-overlay');
    document.body.appendChild(loadingOverlay);
  }
  
  // Global loading functions (for backward compatibility)
  window.showLoading = (message = 'Loading...') => {
    const event = new CustomEvent('show-loading', {
      detail: { message },
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  };
  
  window.hideLoading = () => {
    const event = new CustomEvent('hide-loading', {
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  };
}

function setupStoryDisplayCompat() {
  // Listen for story display events and handle integration with legacy code
  document.addEventListener('story-copied', (e) => {
    window.showToast('Story copied to clipboard!', 'success');
  });
  
  document.addEventListener('story-saved', (e) => {
    window.showToast('Story saved successfully!', 'success');
  });
  
  // Replace any existing story display divs with the component
  const storyDisplayContainers = document.querySelectorAll('.story-display-container');
  storyDisplayContainers.forEach(container => {
    // Don't replace if already contains the component
    if (container.querySelector('story-display')) return;
    
    // Get story data if exists
    let storyData = null;
    if (container.dataset.story) {
      try {
        storyData = JSON.parse(container.dataset.story);
      } catch (e) {
        console.error('Failed to parse story data', e);
      }
    }
    
    // Create component
    const storyDisplay = document.createElement('story-display');
    if (storyData) {
      storyDisplay.story = storyData;
    }
    
    // Show controls if specified
    if (container.dataset.showControls === 'true') {
      storyDisplay.showControls = true;
    }
    
    // Clear and append
    container.innerHTML = '';
    container.appendChild(storyDisplay);
  });
}

function setupStoryFormCompat() {
  // Find any existing form containers
  const formContainers = document.querySelectorAll('.story-form-container');
  formContainers.forEach(container => {
    // Don't replace if already contains the component
    if (container.querySelector('story-form')) return;
    
    // Create the form component
    const storyForm = document.createElement('story-form');
    
    // Clear and append
    container.innerHTML = '';
    container.appendChild(storyForm);
    
    // Add event listeners for form submission
    storyForm.addEventListener('story-form-submit', (e) => {
      const formData = e.detail.formData;
      
      // Set form as submitting
      storyForm.isSubmitting = true;
      
      // Show loading overlay
      window.showLoading('Creating your story...');
      
      // Call the existing generate story function if it exists
      if (typeof window.generateStory === 'function') {
        window.generateStory(formData).catch(error => {
          console.error('Error generating story:', error);
          window.showToast('Failed to generate story. Please try again.', 'error');
        }).finally(() => {
          storyForm.isSubmitting = false;
          window.hideLoading();
        });
      } else {
        // Simulate request for testing
        console.log('Would generate story with:', formData);
        setTimeout(() => {
          storyForm.isSubmitting = false;
          window.hideLoading();
          window.showToast('Story form submitted successfully!', 'success');
        }, 2000);
      }
    });
    
    // Handle error events
    storyForm.addEventListener('error', (e) => {
      window.showToast(e.detail.message, 'error');
    });
    
    // Handle login click
    storyForm.addEventListener('login-click', (e) => {
      if (typeof window.showLoginModal === 'function') {
        window.showLoginModal();
      } else {
        console.log('Login modal function not found');
      }
    });
  });
}

function setupQuizCompat() {
  // Find any quiz containers
  const quizContainers = document.querySelectorAll('.quiz-container');
  quizContainers.forEach(container => {
    // Don't replace if already contains the component
    if (container.querySelector('quiz-component')) return;
    
    // Get quiz data if exists
    let quizData = null;
    if (container.dataset.quiz) {
      try {
        quizData = JSON.parse(container.dataset.quiz);
      } catch (e) {
        console.error('Failed to parse quiz data', e);
      }
    }
    
    // Create component
    const quizComponent = document.createElement('quiz-component');
    if (quizData) {
      quizComponent.quiz = quizData;
    }
    
    // Clear and append
    container.innerHTML = '';
    container.appendChild(quizComponent);
    
    // Listen for quiz completion
    quizComponent.addEventListener('quiz-completed', (e) => {
      const { score, totalQuestions } = e.detail;
      window.showToast(`Quiz completed! Score: ${score}/${totalQuestions}`, 'success');
      
      // Call any existing quiz completion handler
      if (typeof window.handleQuizCompletion === 'function') {
        window.handleQuizCompletion(e.detail);
      }
    });
  });
}

function setupStoryContinuationCompat() {
  // Listen for events from story-continuation components
  document.addEventListener('story-continuation-completed', (e) => {
    // Handle when a story is continued
    console.log('Story continuation completed', e.detail);
    
    // You could call any existing legacy code here if needed
  });
  
  // Find any existing continuation containers and replace with the component
  const continuationContainers = document.querySelectorAll('.story-continuation-container');
  continuationContainers.forEach(container => {
    // Skip if already contains the component
    if (container.querySelector('story-continuation')) return;
    
    // Get story data if exists
    let storyData = null;
    if (container.dataset.story) {
      try {
        storyData = JSON.parse(container.dataset.story);
      } catch (e) {
        console.error('Failed to parse story data for continuation', e);
      }
    }
    
    // Create component
    const continuation = document.createElement('story-continuation');
    if (storyData) {
      continuation.originalStory = storyData;
    }
    
    // Clear and append
    container.innerHTML = '';
    container.appendChild(continuation);
  });
}

function setupStoryContentCompat() {
  // Find any content containers that should be replaced with the component
  const storyContentContainers = document.querySelectorAll('.story-content-container');
  storyContentContainers.forEach(container => {
    // Skip if already contains the component
    if (container.querySelector('story-content')) return;
    
    // Get story data if exists
    let storyData = null;
    if (container.dataset.story) {
      try {
        storyData = JSON.parse(container.dataset.story);
      } catch (e) {
        console.error('Failed to parse story data for content display', e);
      }
    }
    
    // Create component
    const storyContent = document.createElement('story-content');
    if (storyData) {
      storyContent.story = storyData;
    }
    
    // Clear and append
    container.innerHTML = '';
    container.appendChild(storyContent);
  });
} 
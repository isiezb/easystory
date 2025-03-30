/**
 * Main entry point for all Lit components
 * This file imports all components and registers them to be globally available
 */

// Import from CDN instead of local module imports
import { html, render } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

// Log initialization
console.log('Initializing Lit components from CDN...');

// Import all components using dynamic imports
// This provides fallback mechanism if direct imports fail
const importComponent = async (componentName) => {
  try {
    // Try different paths
    await import(`../${componentName}.js`)
      .catch(() => import(`./${componentName}.js`))
      .catch(() => import(`/components/${componentName}.js`))
      .catch(() => import(`/public/components/${componentName}.js`))
      .catch(err => {
        console.warn(`Failed to load component ${componentName}:`, err.message);
        // Last attempt with absolute path
        return import(`https://easystory.onrender.com/components/${componentName}.js`);
      });
  } catch (err) {
    console.error(`Could not load component ${componentName}:`, err);
  }
};

// List of all components to load
const components = [
  'toast-notification',
  'toast-container',
  'loading-overlay',
  'story-card',
  'stories-grid',
  'story-display',
  'quiz-component',
  'story-form',
  'story-continuation',
  'story-content'
];

// Load all components
Promise.all(components.map(component => importComponent(component)))
  .then(() => {
    console.log('All components loaded');
  })
  .catch(err => {
    console.error('Error loading components:', err);
  });

export { html, render }; 
/**
 * Components index file
 * 
 * This file serves as an entry point for loading all our Lit components.
 * It allows for easier importing of all components at once.
 */

export * from './toast-notification.js';
export * from './toast-container.js';
export * from './loading-overlay.js';
export * from './story-card.js';
export * from './stories-grid.js';
export * from './story-display.js';
export * from './quiz-component.js';
export * from './story-form.js';
export * from './story-continuation.js';
export * from './story-content.js';

// Also register all components directly to ensure they're available
import './toast-notification.js';
import './toast-container.js';
import './loading-overlay.js';
import './story-card.js';
import './stories-grid.js';
import './story-display.js';
import './quiz-component.js';
import './story-form.js';
import './story-continuation.js';
import './story-content.js';

console.log('All Lit components registered'); 
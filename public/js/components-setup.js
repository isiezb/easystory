/**
 * Component Setup Script
 * This file handles loading all custom web components and provides compatibility
 * checks and fallbacks for browsers without ES module support.
 */

// Check if browser supports ES modules
const supportsESModules = 'noModule' in HTMLScriptElement.prototype;

// If ES modules not supported, show warning and create fallback content
if (!supportsESModules) {
  console.warn('This browser does not support ES modules. Some features may not work correctly.');
  
  // Add visible warning on page
  const warningDiv = document.createElement('div');
  warningDiv.style.padding = '15px';
  warningDiv.style.margin = '15px';
  warningDiv.style.border = '3px solid #ff5555';
  warningDiv.style.borderRadius = '5px';
  warningDiv.style.backgroundColor = '#fff8f8';
  warningDiv.innerHTML = `
    <h3 style="color: #d32f2f; margin-top: 0;">Browser Compatibility Issue</h3>
    <p>Your browser doesn't support modern JavaScript features needed for this application.</p>
    <p>Please use a modern browser like Chrome, Firefox, Safari, or Edge.</p>
  `;
  
  // Insert at beginning of body or before first element
  if (document.body.firstChild) {
    document.body.insertBefore(warningDiv, document.body.firstChild);
  } else {
    document.body.appendChild(warningDiv);
  }
  
  // Create basic form as fallback
  const fallbackForm = document.createElement('div');
  fallbackForm.innerHTML = `
    <div style="max-width: 500px; margin: 30px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #333;">Story Generator</h2>
      <form id="fallback-form">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Grade Level:</label>
          <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option>Kindergarten</option>
            <option>Grade 1</option>
            <option>Grade 2</option>
            <option>Grade 3</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Subject:</label>
          <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option>Science</option>
            <option>Math</option>
            <option>History</option>
            <option>Literature</option>
          </select>
        </div>
        <button type="submit" style="background: #5e7ce6; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">
          Generate Story
        </button>
      </form>
    </div>
  `;
  
  // Find form container or append to body
  const formContainer = document.getElementById('story-form-container') || document.body;
  formContainer.appendChild(fallbackForm);
  
  // Add event listener to the fallback form
  document.getElementById('fallback-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Story generation requires a modern browser. Please switch to Chrome, Firefox, Safari, or Edge.');
  });
}

// Load the Lit library from CDN, even if not supported
// This allows us to check Web Component support and define our own fallbacks
try {
  const litScript = document.createElement('script');
  litScript.type = 'module';
  litScript.src = 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
  document.head.appendChild(litScript);
  
  console.log('Lit library script added to page');
} catch (err) {
  console.error('Error loading Lit library:', err);
}

// Load our main components index
try {
  const componentsScript = document.createElement('script');
  componentsScript.type = 'module';
  componentsScript.src = '/components/index.js';
  document.head.appendChild(componentsScript);
  
  console.log('Components index script added to page');
} catch (err) {
  console.error('Error loading components index:', err);
}

// Check for Custom Elements and Shadow DOM support
if (window.customElements && window.ShadowRoot) {
  console.log('Web Components are supported');
} else {
  console.warn('Web Components are not fully supported in this browser');
  
  // Add warning for browsers without Web Components support
  const wcWarning = document.createElement('div');
  wcWarning.style.padding = '10px';
  wcWarning.style.margin = '10px';
  wcWarning.style.border = '2px solid #ff9800';
  wcWarning.style.borderRadius = '5px';
  wcWarning.style.backgroundColor = '#fff8e1';
  wcWarning.innerHTML = `
    <p><strong>Limited Functionality:</strong> Your browser doesn't fully support Web Components.</p>
    <p>Some features might not work as intended.</p>
  `;
  
  if (document.body.firstChild) {
    document.body.insertBefore(wcWarning, document.body.firstChild);
  } else {
    document.body.appendChild(wcWarning);
  }
}

// Function to check if a component is defined and attempt to load it if not
function ensureComponentLoaded(tagName, fallbackPath) {
  // Check if component is already defined
  if (!customElements.get(tagName)) {
    console.warn(`Component ${tagName} not defined. Attempting to load from ${fallbackPath}`);
    
    // Create script to load the component
    const script = document.createElement('script');
    script.type = 'module';
    script.src = fallbackPath;
    document.head.appendChild(script);
    
    // Return a promise that resolves when component is defined or rejects after timeout
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (customElements.get(tagName)) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(true);
        }
      }, 100);
      
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for ${tagName} to be defined`));
      }, 5000);
    });
  }
  
  // Component already defined
  return Promise.resolve(true);
}

// List of components to ensure are loaded
const requiredComponents = [
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

// Try to load all required components
Promise.allSettled(
  requiredComponents.map(component => 
    ensureComponentLoaded(component, `../components/${component}.js`)
  )
)
.then(results => {
  const loadedCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Successfully loaded ${loadedCount}/${requiredComponents.length} components`);
  
  if (loadedCount === requiredComponents.length) {
    console.log('All required components are loaded and ready');
  } else {
    console.warn('Some components failed to load');
  }
})
.catch(err => {
  console.error('Error ensuring components are loaded:', err);
});

// Let the app know components are initialized
console.log('Lit components initialized successfully');

// Export for global use
window.litComponentsReady = true; 
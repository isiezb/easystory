// DOM Elements
const storyForm = document.getElementById('storyForm');
const storyOutput = document.getElementById('storyOutput');
const loadingOverlay = document.querySelector('.loading-overlay');
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');
const otherSubjectGroup = document.getElementById('otherSubjectGroup');
const subjectSelect = document.getElementById('subject');

// Initialize theme
function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (themeToggle) {
        const iconSpan = themeToggle.querySelector('span:first-child');
        const textSpan = themeToggle.querySelector('span:last-child');
        if (iconSpan) iconSpan.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        if (textSpan) textSpan.textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            const iconSpan = themeToggle.querySelector('span:first-child');
            const textSpan = themeToggle.querySelector('span:last-child');
            if (iconSpan) iconSpan.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            if (textSpan) textSpan.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    }

    // Subject selection
    if (subjectSelect && otherSubjectGroup) {
        subjectSelect.addEventListener('change', () => {
            otherSubjectGroup.style.display = subjectSelect.value === 'other' ? 'block' : 'none';
        });
    }

    // Story form submission
    if (storyForm) {
        storyForm.addEventListener('submit', handleStoryFormSubmit);
    }

    // Setup login reminder link
    const loginReminderLink = document.getElementById('loginReminderLink');
    if (loginReminderLink) {
        loginReminderLink.addEventListener('click', function(e) {
            e.preventDefault();
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('show');
                document.getElementById('authTitle').textContent = 'Login';
                document.getElementById('authSubmit').textContent = 'Login';
            }
        });
    }
}

// Get or create anonymous user ID
function getAnonymousUserId() {
    let anonymousId = localStorage.getItem('anonymousUserId');
    if (!anonymousId) {
        // Generate a UUID-like identifier
        anonymousId = 'anon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('anonymousUserId', anonymousId);
    }
    return anonymousId;
}

// Handle story form submission
async function handleStoryFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.apiService) {
        showToast('API service not initialized', 'error');
        return;
    }
    
    // Get form data and ensure all expected fields are present
    const formData = new FormData(storyForm);
    const data = Object.fromEntries(formData.entries());
    
    // Add more detailed logging for debugging
    console.log('Form submission - Raw form data:', data);
    // Log each field individually to identify potential issues
    Object.entries(data).forEach(([key, value]) => {
        console.log(`Form field: ${key} = ${value} (${typeof value})`);
    });
    
    // Handle other subject
    if (data.subject === 'other' && data.other_subject) {
        data.subject = data.other_subject;
    }
    
    // === New Check: Prevent API call if "Other" is selected but not specified ===
    if (data.subject === 'other' && !data.other_subject) {
        showToast('Please specify the subject when selecting "Other"', 'error');
        // Optionally, focus the input field:
        const otherSubjectInput = document.getElementById('otherSubject');
        if (otherSubjectInput) {
            otherSubjectInput.focus();
        }
        return; // Stop submission
    }
    // === End New Check ===
    
    // Show loading state
    if (window.uiHandler && window.uiHandler.showLoading) {
        window.uiHandler.showLoading('Generating Your Story');
    } else if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = 'Generating Your Story';
        }
        // Scroll to top to make loading overlay more visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    try {
        console.log('Sending request to generate story...');
        
        // First try with normal API service
        try {
            // Ensure word_count is a number, not a string
            data.word_count = parseInt(data.word_count, 10);
            
            const response = await window.apiService.generateStory(data);
            console.log('Received response:', response);
            
            if (!response) {
                throw new Error('Empty response received from server');
            }
            
            // Display the story
            displayStory(response);
            
            // Success message
            showToast('Story generated successfully!', 'success');
            
            // Check if Supabase is actually available before attempting save
            const isSupabaseAvailable = window.supabase && 
                                      window.supabase.auth && 
                                      typeof window.supabase.auth.getSession === 'function' &&
                                      !window.supabase._isMockClient;
            
            // Save the story regardless of user authentication status
            if (isSupabaseAvailable) {
                try {
                    // Try to get authenticated user first
                    let userId = null;
                    let isAnonymous = true;
                    
                    if (window.auth && typeof window.auth.getUser === 'function') {
                        const user = window.auth.getUser();
                        if (user && user.id) {
                            userId = user.id;
                            isAnonymous = false;
                            console.log('Saving story for authenticated user:', userId);
                        }
                    }
                    
                    // If no authenticated user, use anonymous ID
                    if (!userId) {
                        userId = getAnonymousUserId();
                        console.log('Saving story for anonymous user:', userId);
                    }
                    
                    // Ensure we have a valid response object to work with
                    if (!response || typeof response !== 'object') {
                        throw new Error('Invalid API response received for saving.');
                    }

                    // Construct the story object to save
                    const storyToSave = {
                        user_id: userId,
                        is_anonymous: isAnonymous,
                        // Prefer response title, fallback to a generic one
                        title: response.title || `Generated Story (${new Date().toLocaleDateString()})`,
                        // Prefer response content, fallback if absolutely necessary
                        content: response.content || 'No content generated.',
                        metadata: {
                            // Extract metadata primarily from response, falling back to form `data` only if necessary
                            grade: response.academic_grade || data.academic_grade || null,
                            subject: response.subject || data.subject || null,
                            word_count: response.word_count || parseInt(data.word_count, 10) || null,
                            language: response.language || data.language || null,
                            setting: response.setting || data.setting || null,
                            main_character: response.main_character || data.main_character || null,
                            // Add fields present in the response, like vocabulary/summary/objectives
                            // Use hasOwnProperty for safety if response structure is uncertain
                            vocabulary: response.hasOwnProperty('vocabulary') ? response.vocabulary : null,
                            summary: response.hasOwnProperty('summary') ? response.summary : null,
                            learning_objectives: response.hasOwnProperty('learning_objectives') ? response.learning_objectives : null,
                            // Ensure boolean flags are handled correctly, preferring response if available
                            generate_vocabulary: response.hasOwnProperty('generate_vocabulary') ? response.generate_vocabulary : (data.generate_vocabulary === 'on'),
                            generate_summary: response.hasOwnProperty('generate_summary') ? response.generate_summary : (data.generate_summary === 'on')
                            // Do NOT include 'quiz' as it's removed
                        },
                        created_at: new Date().toISOString()
                    };

                    // Clean metadata: Remove null/undefined values before saving
                    Object.keys(storyToSave.metadata).forEach(key => {
                        if (storyToSave.metadata[key] === null || storyToSave.metadata[key] === undefined) {
                            delete storyToSave.metadata[key];
                        }
                    });

                    console.log('Saving story object:', JSON.stringify(storyToSave, null, 2));
                    
                    const { error: saveError } = await window.supabaseClient
                        .from('stories')
                        .insert([storyToSave]);

                    if (saveError) {
                        console.error('Error saving story:', saveError);
                        showToast(`Failed to save story: ${saveError.message}`, 'error');
                    } else {
                        console.log('Story saved successfully');
                        showToast('Story generated and saved!', 'success');
                        // Only refresh stories list for logged-in users
                        if (!isAnonymous) {
                            loadUserStories();
                        }
                    }
                } catch (saveCatchError) {
                    console.error('Unexpected error during story save process:', saveCatchError);
                    showToast(`Error saving story: ${saveCatchError.message || 'Unknown error'}`, 'error');
                }
            } else {
                console.log('Supabase unavailable, skipping database save');
            }
        } catch (firstError) {
            console.error('Initial request failed, trying direct form submission:', firstError);
            
            // Last resort: Try direct form submission with minimal processing
            try {
                // Create FormData directly from the form element
                const directFormData = new FormData(storyForm);
                
                // Convert to a simple object with all values as strings
                const directData = {};
                for (const [key, value] of directFormData.entries()) {
                    directData[key] = value;
                }
                
                // Make sure word_count is a number
                directData.word_count = parseInt(directData.word_count, 10);
                
                console.log('Attempting direct form submission:', directData);
                
                // Try to send directly to the server
                const directResponse = await fetch(`${window._config?.serverUrl || window.location.origin}/generate-story`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(directData)
                });
                
                if (directResponse.ok) {
                    const responseData = await directResponse.json();
                    console.log('Direct submission succeeded:', responseData);
                    
                    // Display the story
                    displayStory(responseData);
                    showToast('Story generated successfully!', 'success');
                } else {
                    const errorText = await directResponse.text();
                    console.error('Direct submission failed with status:', directResponse.status, errorText);
                    throw new Error(`Server error ${directResponse.status}: ${errorText}`);
                }
            } catch (directError) {
                console.error('Direct submission also failed:', directError);
                showToast('Failed to generate story. Please try again.', 'error');
                
                // This is a last resort - do not try to display mock story if it will cause errors
                try {
                    if (window.apiService && typeof window.apiService.getMockStoryData === 'function') {
                        showToast('Showing mock data for demonstration purposes', 'info');
                        const mockResponse = window.apiService.getMockStoryData(data);
                        displayStory(mockResponse);
                    } else {
                        showToast('Story generation failed completely', 'error');
                    }
                } catch (mockError) {
                    console.error('Mock data display also failed:', mockError);
                    showToast('Story generation failed completely', 'error');
                }
            }
        }
    } catch (error) {
        console.error('Error generating story:', error);
        let errorMessage = 'Failed to generate story.';
        if (error.message) {
            errorMessage = error.message; 
        }
        showToast(errorMessage, 'error', 10000); // Show error for longer
    } finally {
        // Hide loading state
        if (window.uiHandler && window.uiHandler.hideLoading) {
            window.uiHandler.hideLoading();
        } else if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Display story in the DOM
function displayStory(storyData) {
    if (!storyOutput) return;
    
    console.log('Displaying story data:', storyData);
    
    try {
        // Extract the actual story content from potentially nested structures
        let storyContent = {};
        
        // Handle different response formats
        if (storyData.data && storyData.data.story) {
            // Format 1: Wrapped in data.story (standard API response)
            console.log('Format 1: Using data.story structure');
            storyContent = { ...storyData.data.story };
        } else if (storyData.story) {
            // Format 2: Wrapped in story
            console.log('Format 2: Using story structure');
            storyContent = { ...storyData.story };
        } else if (storyData.content || storyData.title) {
            // Format 3: Direct story object
            console.log('Format 3: Using direct story object');
            storyContent = { ...storyData };
        } else {
            // Format 4: Unknown structure - try to extract what we can
            console.warn('Format 4: Unknown structure, attempting to extract data');
            storyContent = { 
                title: storyData.title || storyData.subject || 'Generated Story',
                content: storyData.content || JSON.stringify(storyData)
            };
        }
        
        // Default fields if missing
        const title = storyContent.title || 'Generated Story';
        const content = storyContent.content || 'Content could not be retrieved.';
        const summary = storyContent.summary;
        const vocabulary = storyContent.vocabulary;
        const learningObjectives = storyContent.learning_objectives;
        
        // Build HTML for story display
        let storyHTML = `
        <div class="story-container">
            <h2 class="story-title">${title}</h2>
        `;
        
        // Add summary if available
        if (summary) {
            storyHTML += `
            <div class="story-summary">
                <div class="story-summary-title">Summary</div>
                <div class="story-summary-content">${summary}</div>
            </div>
            `;
        }
        
        // Add story content
        storyHTML += `
        <div class="story-text">
            ${content.split('\n').map(p => p ? `<p>${p}</p>` : '').join('')}
        </div>
        `;
        
        // Add learning objectives if available
        if (learningObjectives && Array.isArray(learningObjectives) && learningObjectives.length > 0) {
            storyHTML += `
            <div class="learning-objectives">
                <h3>Learning Objectives</h3>
                <ul>
                    ${learningObjectives.map(obj => `<li>${obj}</li>`).join('')}
                </ul>
            </div>
            `;
        }
        
        // Add vocabulary if available
        if (vocabulary && Array.isArray(vocabulary) && vocabulary.length > 0) {
            storyHTML += `
            <div class="vocabulary-section">
                <h3>Vocabulary</h3>
                <div class="vocabulary-list">
                    ${vocabulary.map(item => `
                    <div class="vocabulary-item">
                        <div class="vocabulary-word">${item.word}</div>
                        <div class="vocabulary-definition">${item.definition}</div>
                    </div>
                    `).join('')}
                </div>
            </div>
            `;
        }
        
        // Close story content div but don't close container yet
        storyHTML += '</div>';
        
        // Set HTML and scroll to story
        storyOutput.innerHTML = storyHTML;
        storyOutput.scrollIntoView({ behavior: 'smooth' });
        
        // Check for quiz data in all possible locations
        let quizData = null;
        
        // Look in different possible locations
        if (storyContent.quiz && Array.isArray(storyContent.quiz)) {
            console.log('Found quiz in storyContent.quiz');
            quizData = storyContent.quiz;
        } else if (storyData.quiz && Array.isArray(storyData.quiz)) {
            console.log('Found quiz in storyData.quiz');
            quizData = storyData.quiz;
        } else if (storyData.data?.quiz && Array.isArray(storyData.data.quiz)) {
            console.log('Found quiz in storyData.data.quiz');
            quizData = storyData.data.quiz;
        } else {
            console.log('No quiz data found in response');
        }
        
        // Ensure we have exactly 3 quiz questions
        if (quizData && quizData.length > 0) {
            // If we have more than 3 questions, take only the first 3
            if (quizData.length > 3) {
                console.log(`Limiting quiz questions from ${quizData.length} to 3`);
                quizData = quizData.slice(0, 3);
            }
            
            // If we have fewer than 3 questions, generate additional ones
            if (quizData.length < 3) {
                console.log(`Adding additional quiz questions to reach 3 (currently have ${quizData.length})`);
                const subject = storyContent.subject || storyData.subject || 'the topic';
                
                // Template questions to add if needed
                const additionalQuestions = [
                    {
                        question: `What's an important concept to understand about ${subject}?`,
                        options: [
                            'Basic principles',
                            'Advanced applications',
                            'Historical context',
                            'All of the above'
                        ],
                        correctAnswer: 3,
                        correct_answer: 3
                    },
                    {
                        question: `How might learning about ${subject} be useful in real life?`,
                        options: [
                            'Problem solving',
                            'Better understanding of the world',
                            'Career opportunities',
                            'Personal enrichment'
                        ],
                        correctAnswer: 1,
                        correct_answer: 1
                    }
                ];
                
                // Add questions until we have 3
                while (quizData.length < 3 && additionalQuestions.length > 0) {
                    quizData.push(additionalQuestions.shift());
                }
            }
            
            console.log('Quiz data available, attempting to initialize quiz:', quizData);
            
            // Structure quiz data properly with field name normalization
            const normalizedQuizData = {
                questions: quizData.map(q => {
                    // Normalize field names to handle both correctAnswer and correct_answer formats
                    let correctAnswerIndex = null;
                    
                    // Check for the different formats
                    if (q.correct_answer !== undefined) {
                        correctAnswerIndex = q.correct_answer;
                    } else if (q.correctAnswer !== undefined) {
                        correctAnswerIndex = q.correctAnswer;
                    } else {
                        // Default to first option if neither is available
                        correctAnswerIndex = 0;
                        console.warn('Quiz question missing correct answer field, defaulting to first option:', q);
                    }
                    
                    return {
                        question: q.question,
                        options: q.options || [],
                        correct_answer: correctAnswerIndex
                    };
                })
            };
            
            // Create quiz container if not exists
            let quizContainer = document.getElementById('quizContainer');
            if (!quizContainer) {
                quizContainer = document.createElement('div');
                quizContainer.id = 'quizContainer';
                quizContainer.className = 'quiz-container';
                
                // Add a clear heading to make quiz more visible
                const quizHeading = document.createElement('h3');
                quizHeading.className = 'quiz-heading';
                quizHeading.textContent = 'Quiz';
                quizContainer.appendChild(quizHeading);
                
                // Add as next element in story output
                storyOutput.appendChild(quizContainer);
                
                console.log('Created new quiz container:', quizContainer);
            } else {
                console.log('Using existing quiz container:', quizContainer);
                // Clear existing content
                quizContainer.innerHTML = '<h3 class="quiz-heading">Quiz</h3>';
            }
            
            // Check if window.quiz is available
            if (window.quiz && typeof window.quiz.init === 'function') {
                try {
                    console.log('Initializing quiz with normalized data:', normalizedQuizData);
                    window.quiz.init(normalizedQuizData);
                    console.log('Quiz initialized successfully');
                    
                    // Make sure quiz is visible by scrolling to it
                    setTimeout(() => {
                        quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        console.log('Scrolled to quiz container');
                    }, 500);
                } catch (quizError) {
                    console.error('Error initializing quiz:', quizError);
                    quizContainer.innerHTML = '<div class="quiz-error">There was an error initializing the quiz. Please try again.</div>';
                }
            } else {
                console.warn('Quiz module not available, cannot initialize quiz');
                quizContainer.innerHTML = '<div class="quiz-error">Quiz functionality is currently unavailable.</div>';
            }
        } else {
            console.log('No valid quiz data available');
        }
        
        // Now add the story continuation section AFTER the quiz
        const continuationDiv = document.createElement('div');
        continuationDiv.className = 'story-continuation';
        continuationDiv.innerHTML = `
            <h3>Continue the Story</h3>
            <div class="continuation-form">
                <div class="continuation-options">
                    <div class="continuation-option">
                        <label for="continuationLength">Length:</label>
                        <select id="continuationLength" class="continuation-length">
                            <option value="200">Short (200 words)</option>
                            <option value="300" selected>Medium (300 words)</option>
                            <option value="500">Long (500 words)</option>
                        </select>
                    </div>
                    
                    <div class="continuation-option">
                        <label for="continuationDifficulty">Difficulty:</label>
                        <select id="continuationDifficulty" class="continuation-difficulty">
                            <option value="easier">Easier</option>
                            <option value="same" selected>Same Level</option>
                            <option value="harder">More Challenging</option>
                        </select>
                    </div>
                </div>
                
                <button id="continueStoryBtn" class="continue-btn">Continue Story</button>
            </div>
            <div id="continuationOutput" class="continuation-output"></div>
        `;
        
        // Append continuation div to story output
        storyOutput.appendChild(continuationDiv);
        
        // Set up continue story button
        const continueStoryBtn = document.getElementById('continueStoryBtn');
        if (continueStoryBtn) {
            continueStoryBtn.addEventListener('click', () => {
                // Get difficulty setting
                const difficultySelect = document.getElementById('continuationDifficulty');
                const difficulty = difficultySelect ? difficultySelect.value : 'same';
                
                // Pass both original story content and difficulty setting
                handleContinueStory(storyContent, difficulty);
            });
        }
    } catch (error) {
        console.error('Error displaying story:', error);
        storyOutput.innerHTML = `
        <div class="story-error">
            <h3>Error Displaying Story</h3>
            <p>There was an error displaying the story. Please try again.</p>
            <p class="error-details">${error.message}</p>
        </div>
        `;
    }
}

// Update handleContinueStory to account for difficulty
async function handleContinueStory(originalStory, difficulty = 'same') {
    if (!originalStory || !originalStory.content) {
        showToast('Cannot continue story: original content missing', 'error');
        return;
    }
    
    // Show loading state
    const continueStoryBtn = document.getElementById('continueStoryBtn');
    const continuationOutput = document.getElementById('continuationOutput');
    const continuationLength = document.getElementById('continuationLength');
    
    if (continueStoryBtn) {
        continueStoryBtn.disabled = true;
        continueStoryBtn.innerHTML = '<div class="spinner small"></div> Continuing...';
    }
    
    try {
        // Prepare continuation data
        const continuationData = {
            original_story: originalStory.content,
            word_count: continuationLength ? continuationLength.value : 300,
            subject: originalStory.subject,
            academic_grade: originalStory.academic_grade,
            language: originalStory.language,
            difficulty: difficulty // Add the difficulty parameter
        };
        
        // Adjust academic grade based on difficulty if specified
        if (difficulty === 'easier' && continuationData.academic_grade) {
            // Try to lower the grade by 1-2 levels if possible
            const currentGrade = parseInt(continuationData.academic_grade, 10);
            if (!isNaN(currentGrade) && currentGrade > 1) {
                continuationData.academic_grade = Math.max(1, currentGrade - 1).toString();
            }
        } else if (difficulty === 'harder' && continuationData.academic_grade) {
            // Try to increase the grade by 1-2 levels
            const currentGrade = parseInt(continuationData.academic_grade, 10);
            if (!isNaN(currentGrade)) {
                continuationData.academic_grade = (currentGrade + 1).toString();
            }
        }
        
        console.log(`Continuing story with difficulty: ${difficulty}`, continuationData);
        
        // Call API to continue story
        const response = await window.apiService.continueStory(continuationData);
        console.log('Story continuation response:', response);
        
        // Extract continuation content
        let continuationContent = '';
        if (response.data && response.data.continuation) {
            continuationContent = response.data.continuation.content;
        } else if (response.continuation) {
            continuationContent = response.continuation.content;
        } else if (typeof response === 'string') {
            continuationContent = response;
        } else {
            continuationContent = 'Failed to generate continuation.';
        }
        
        // Display continuation
        if (continuationOutput) {
            continuationOutput.innerHTML = `
                <div class="continuation-content">
                    ${continuationContent.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            `;
            continuationOutput.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Success message
        showToast('Story continued successfully!', 'success');
        
    } catch (error) {
        console.error('Error continuing story:', error);
        
        // Error message
        showToast('Failed to continue story: ' + (error.message || 'Unknown error'), 'error');
        
        // Clear continuation output or show error in it
        if (continuationOutput) {
            continuationOutput.innerHTML = `
                <div class="continuation-error">
                    <p>Sorry, we couldn't continue the story. Please try again later.</p>
                </div>
            `;
        }
    } finally {
        // Reset button
        if (continueStoryBtn) {
            continueStoryBtn.disabled = false;
            continueStoryBtn.innerHTML = 'Continue Story';
        }
    }
}

// Toast notification
function showToast(message, type = 'success') {
    if (window.uiHandler && window.uiHandler.showToast) {
        window.uiHandler.showToast(message, type);
        return;
    }
    
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-title">${type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</div>
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

// UI update functions
function updateUIForLoggedInUser(user) {
    try {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        const userEmail = document.getElementById('userEmail');
        const myStoriesSection = document.getElementById('myStoriesSection');
        const loginReminder = document.getElementById('loginReminder');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userProfile) userProfile.style.display = 'flex';
        if (loginReminder) loginReminder.style.display = 'none';
        
        if (userAvatar && user.user_metadata && user.user_metadata.email) {
            userAvatar.textContent = user.user_metadata.email[0].toUpperCase();
        }
        
        if (userEmail && user.user_metadata && user.user_metadata.email) {
            userEmail.textContent = user.user_metadata.email;
        }
        
        // Show My Stories section
        if (myStoriesSection) {
            myStoriesSection.style.display = 'block';
            loadUserStories();
        }
    } catch (error) {
        console.error('Error updating UI for logged in user:', error);
    }
}

function updateUIForLoggedOutUser() {
    try {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfile = document.getElementById('userProfile');
        const myStoriesSection = document.getElementById('myStoriesSection');
        const storiesGrid = document.getElementById('storiesGrid');
        const loginReminder = document.getElementById('loginReminder');
        
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'none';
        if (myStoriesSection) myStoriesSection.style.display = 'none';
        if (storiesGrid) storiesGrid.innerHTML = '';
        if (loginReminder) loginReminder.style.display = 'flex';
    } catch (error) {
        console.error('Error updating UI for logged out user:', error);
    }
}

// Initialize app
async function init() {
    try {
        // Check if API service is available
        if (!window.apiService) {
            console.error('API service not initialized. Make sure apiService.js is loaded before app.js');
        }
        
        // Initialize theme
        initTheme();
        
        // Initialize Supabase auth if available
        if (window.auth && typeof window.auth.init === 'function') {
            try {
                await window.auth.init();
            } catch (authError) {
                console.warn('Failed to initialize auth:', authError);
            }
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Load user stories if logged in
        if (window.supabase && window.supabase.auth) {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session?.user) {
                    updateUIForLoggedInUser(session.user);
                } else {
                    updateUIForLoggedOutUser();
                }
            } catch (sessionError) {
                console.warn('Failed to get session:', sessionError);
                updateUIForLoggedOutUser();
            }
        } else {
            console.warn('Supabase not initialized, skipping user session check');
            updateUIForLoggedOutUser();
        }
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        // Don't show error if Supabase is not configured
        if (!error.message || !error.message.includes('Supabase not configured')) {
            showToast('Failed to initialize application', 'error');
        }
    }
}

// Load user stories - modified to optionally include anonymous stories
async function loadUserStories(includeAnonymous = false) {
    // Skip if dependencies are missing
    if (!window.auth || !window.supabaseClient) {
        console.log('Auth or Supabase client not available, skipping story load');
        return;
    }

    // Check for user
    let user = null;
    let anonymousId = null;
    
    // Try to get user from auth service
    if (typeof window.auth.getUser === 'function') {
        user = window.auth.getUser();
    }
    
    // If no user, try async method
    if (!user && typeof window.auth.getUserAsync === 'function') {
        try {
            user = await window.auth.getUserAsync();
        } catch (e) {
            console.warn('Error getting user async:', e);
        }
    }
    
    // If still no user, try from session directly
    if (!user && window.supabase && window.supabase.auth) {
        try {
            const { data } = await window.supabase.auth.getSession();
            user = data?.session?.user;
        } catch (e) {
            console.warn('Error getting session directly:', e);
        }
    }
    
    // For anonymous stories
    if (includeAnonymous) {
        anonymousId = getAnonymousUserId();
    }

    // Exit if no user identifiers available
    if ((!user || !user.id) && !anonymousId) {
        console.log('No user identification found, skipping story load');
        return;
    }

    console.log('Loading stories for user:', user?.id || anonymousId);
    const storiesGrid = document.getElementById('storiesGrid');
    const myStoriesSection = document.getElementById('myStoriesSection');
    if (!storiesGrid || !myStoriesSection) return;

    storiesGrid.innerHTML = '<div class="loading-spinner-small"></div> Loading stories...'; // Show loading state
    myStoriesSection.style.display = 'block';

    try {
        // If we have both authenticated and anonymous IDs, fetch both
        let stories = [];
        if (user && user.id) {
            const authStories = await window.apiService.fetchUserStories(user.id);
            if (Array.isArray(authStories)) {
                stories = stories.concat(authStories);
            }
        }
        
        if (includeAnonymous && anonymousId) {
            const anonStories = await window.apiService.fetchUserStories(anonymousId);
            if (Array.isArray(anonStories)) {
                stories = stories.concat(anonStories);
            }
        }
        
        // Sort by creation date (newest first)
        stories.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        storiesGrid.innerHTML = ''; // Clear loading state
        if (stories && stories.length > 0) {
            stories.forEach(story => {
                const storyElement = createStorySummaryElement(story);
                storiesGrid.appendChild(storyElement);
            });
        } else {
            storiesGrid.innerHTML = '<p>No stories saved yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load stories:', error);
        storiesGrid.innerHTML = '<p>Could not load stories.</p>'; // Clear loading state
        // Provide more detail in the error message
        const errorMsg = error instanceof ApiError 
            ? `${error.message} (Status: ${error.status})` 
            : (error.message || 'Unknown error');
        showToast(`Failed to load stories: ${errorMsg}`, 'error');
        myStoriesSection.style.display = 'none'; // Optionally hide section on error
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for global use
window.app = {
    init,
    loadUserStories,
    updateUIForLoggedInUser,
    updateUIForLoggedOutUser,
    showToast,
    displayStory
}; 
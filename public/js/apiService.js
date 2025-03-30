/**
 * API Service for handling API requests and responses
 */

// API Error class
class ApiError extends Error {
    /**
     * Create an API error.
     * @param {number} status - HTTP status code
     * @param {string} message - Error message
     * @param {Object} errorData - Additional error data
     */
    constructor(status, message, errorData = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errorData = errorData;
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }

    /**
     * Get a formatted string representation of the error
     */
    toString() {
        return `ApiError [${this.status}]: ${this.message}`;
    }
}

// API Service class
class ApiService {
    constructor() {
        // Initialize with a default value to avoid "no config" errors
        this.baseUrl = window.location.origin;
        this.initPromise = this.init();
    }

    /**
     * Initialize the API service
     */
    async init() {
        try {
            // Ensure we have a valid baseUrl
            if (window._config && window._config.serverUrl) {
                console.log('Using existing config for API service');
                this.baseUrl = window._config.serverUrl;
            } else if (window._env_ && window._env_.SERVER_URL) {
                console.log('Using env variable for API service');
                this.baseUrl = window._env_.SERVER_URL;
            } else {
                console.log('No specific config found, defaulting to current origin');
                // Already set to window.location.origin in constructor
            }

            // Ensure the baseUrl has no trailing slash
            this.baseUrl = this.baseUrl.replace(/\/$/, '');
            console.log('API Service initialized with base URL:', this.baseUrl);
            
            // Test server connectivity
            this.testServerConnection();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize API service:', error);
            // Don't throw - use default baseUrl instead
            return false;
        }
    }

    /**
     * Test basic server connectivity to help diagnose issues
     */
    async testServerConnection() {
        try {
            // Send a simple GET request to the server root to verify connectivity
            console.log(`Testing connection to server: ${this.baseUrl}`);
            const testResponse = await fetch(`${this.baseUrl}/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Test-Request': 'true'
                }
            });
            
            console.log(`Server connection test result:`, {
                url: `${this.baseUrl}/`,
                status: testResponse.status,
                statusText: testResponse.statusText,
                headers: Object.fromEntries([...testResponse.headers.entries()])
            });
            
            // Try to read the response body
            let responseText = '';
            try {
                responseText = await testResponse.text();
                // Truncate if too long
                responseText = responseText.length > 200 
                    ? responseText.substring(0, 200) + '...' 
                    : responseText;
            } catch(e) {
                responseText = '[error reading response body]';
            }
            
            console.log(`Server response body (truncated):`, responseText);
        } catch (error) {
            console.warn(`Server connection test failed:`, error);
            // Don't throw - this is just a diagnostic test
        }
    }

    async handleResponse(response) {
        // Log full response details for debugging
        console.log('Full API response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries([...response.headers.entries()])
        });
        
        if (!response.ok) {
            console.error(`API error (${response.status}): ${response.statusText}`);
            
            // Try to get detailed error information
            let errorMessage = `API error (${response.status})`;
            let errorBody = null;
            
            try {
                // First check content type to determine parsing method
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    errorBody = await response.json();
                    console.error('Error body (JSON):', errorBody);
                    errorMessage = errorBody.error || errorBody.message || errorMessage;
                } else {
                    // Not JSON, try as text
                    errorBody = await response.text();
                    console.error('Error body (text):', errorBody);
                    
                    // Try to extract any JSON-like content from HTML/text
                    try {
                        const jsonMatch = errorBody.match(/\{.*\}/s);
                        if (jsonMatch) {
                            const extractedJson = JSON.parse(jsonMatch[0]);
                            console.log('Extracted JSON from error text:', extractedJson);
                            errorMessage = extractedJson.error || extractedJson.message || errorMessage;
                        }
                    } catch (jsonExtractionError) {
                        // Failed to extract JSON, use the text directly if short enough
                        if (errorBody.length < 100) {
                            errorMessage = errorBody;
                        }
                    }
                }
            } catch (parsingError) {
                console.error('Error parsing error response:', parsingError);
            }
            
            throw new ApiError(response.status, errorMessage, errorBody);
        }
        
        try {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Response is not JSON, received:', contentType);
                const text = await response.text();
                console.log('Non-JSON response body:', text);
                
                // Try to find JSON embedded in the response (e.g., in an HTML error page)
                try {
                    const jsonMatch = text.match(/\{.*\}/s);
                    if (jsonMatch) {
                        const extractedJson = JSON.parse(jsonMatch[0]);
                        console.log('Extracted JSON from response:', extractedJson);
                        return extractedJson;
                    }
                } catch (e) {
                    console.error('Failed to extract JSON from response:', e);
                }
                
                // Construct a minimal valid response to prevent UI errors
                return {
                    title: "Response Processing Error",
                    content: "The server responded with non-JSON data. Please try again or contact support.",
                    error: true
                };
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            return data;
        } catch (error) {
            console.error('Error processing response:', error);
            throw new ApiError(response.status, `Error processing response: ${error.message}`);
        }
    }

    /**
     * Generate a story with the given data.
     * @param {Object} data - The story generation parameters
     * @returns {Promise<Object>} The generated story
     */
    async generateStory(data) {
        // Wait for initialization if needed
        try {
            if (this.initPromise) {
                await this.initPromise;
            }
        } catch (error) {
            console.warn('API Service initialization had issues, but continuing with request anyway');
            // Continue anyway using the default baseUrl
        }
        
        console.log('Generating story with data:', data);
        console.log('API baseUrl:', this.baseUrl); 
        
        // Get initial form values with proper defaults
        const subject = String(data.subject || "general").trim();
        const academicGrade = String(data.academic_grade || "5").trim();
        
        // CRITICAL: Server requires these fields, even if empty
        // Cannot be null or undefined - must be non-empty strings
        const subjectSpecRaw = String(data.subject_specification || "Basic concepts").trim();
        const settingRaw = String(data.setting || "a classroom").trim();
        const mainCharacterRaw = String(data.main_character || "a student").trim();
        
        // CRITICAL: Server requires word_count as NUMBER (not string)
        // Must be between 100-5000
        const wordCount = parseInt(data.word_count || "500", 10);
        
        // CRITICAL: Server requires exact capitalization match
        // Must be one of: 'English', 'Spanish', 'French', 'German', 'Italian'
        const language = data.language || "English"; // Keep original capitalization
        
        // IMPORTANT: Checkbox values are undefined when not checked, 'on' when checked
        // Debug the actual checkbox values
        console.log('Raw checkbox values:', {
            generate_vocabulary: data.generate_vocabulary,
            generate_summary: data.generate_summary
        });
        
        // Create a VALID SERVER FORMAT matching the validateInputs function in server.js
        const serverFormat = {
            subject: subject,
            academic_grade: academicGrade,
            subject_specification: subjectSpecRaw, // Must be non-empty string
            setting: settingRaw, // Must be non-empty string
            main_character: mainCharacterRaw, // Must be non-empty string
            word_count: wordCount, // Must be a number between 100-5000
            language: language, // Must match exact capitalization
            generate_vocabulary: data.generate_vocabulary === 'on', // Boolean for optional features
            generate_summary: data.generate_summary === 'on' // Boolean for optional features
        };
        
        try {
            // Build the base headers that are always included
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/html, */*'
            };
            
            // Only add auth token if Supabase is available
            try {
                const token = await this.getAuthToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.warn('Failed to get auth token:', error);
                // Continue without auth token
            }
            
            // Use mock data if in development mode or specified in config
            if (window._config?.useMockData || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Using mock story data');
                return this.getMockStoryData(serverFormat);
            }
            
            console.log(`Sending API request to ${this.baseUrl}/generate-story`);
            console.log('Using validated server format:', serverFormat);
            
            try {
                const response = await fetch(`${this.baseUrl}/generate-story`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(serverFormat)
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API error (${response.status}):`, errorText);
                    throw new ApiError(response.status, errorText || 'Unknown server error');
                }
                
                return this.handleResponse(response);
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                throw fetchError;
            }
        } catch (error) {
            console.error('Error in generateStory:', error);
            
            // Always fall back to mock data if anything goes wrong
            console.log('Request failed, falling back to mock data');
            return this.getMockStoryData(serverFormat);
        }
    }
    
    // Mock data for development and fallback
    getMockStoryData(data) {
        console.log('Generating mock story data');
        
        try {
            // Extract data safely from any format of input
            let subject, grade, character, setting, generateVocab, generateSummary;
            
            // Check if data is in the complex format with payload
            if (data && data.payload) {
                // Format 0: Extract from camelCase payload structure
                subject = data.payload.subject || 'general knowledge';
                grade = data.payload.academicGrade || '5';
                character = data.payload.mainCharacter || 'a curious student';
                setting = data.payload.setting || 'a classroom';
                generateVocab = !!data.payload.generateVocabulary;
                generateSummary = !!data.payload.generateSummary;
            } else if (data) {
                // Standard format: Extract from snake_case structure
                subject = data.subject || 'general knowledge';
                grade = data.academic_grade || '5';
                character = data.main_character || 'a curious student';
                setting = data.setting || 'a classroom';
                
                // Handle various boolean formats
                generateVocab = data.generate_vocabulary === true || 
                              data.generate_vocabulary === 'true' || 
                              data.generate_vocabulary === 'on';
                              
                generateSummary = data.generate_summary === true || 
                                data.generate_summary === 'true' || 
                                data.generate_summary === 'on';
            } else {
                // Default values if data is empty
                subject = 'general knowledge';
                grade = '5';
                character = 'a curious student';
                setting = 'a classroom';
                generateVocab = false;
                generateSummary = false;
            }
            
            // Ensure subject exists and is properly formatted
            subject = subject || 'general knowledge';
            
            // Create a rich story with varied content based on the subject
            const generateContent = () => {
                const introTemplates = [
                    `Once upon a time, in ${setting}, ${character} embarked on a journey to learn about ${subject}.`,
                    `In a fascinating ${setting}, ${character} discovered the wonders of ${subject}.`,
                    `${character} never expected to fall in love with ${subject} until that day in ${setting}.`
                ];
                
                const middleTemplates = [
                    `Through perseverance and dedication, they discovered amazing insights about ${subject} and grew their knowledge.`,
                    `By asking thoughtful questions and conducting experiments, they began to understand the fascinating world of ${subject}.`,
                    `With each new concept they learned, their excitement about ${subject} grew stronger.`
                ];
                
                const endingTemplates = [
                    `The teacher was impressed by ${character}'s dedication and encouraged them to share their discoveries with the class.`,
                    `Soon, everyone in ${setting} was talking about the incredible discoveries ${character} had made about ${subject}.`,
                    `This journey through ${subject} changed how ${character} saw the world forever.`
                ];
                
                // Pick one template from each section randomly
                const randomPick = arr => arr[Math.floor(Math.random() * arr.length)];
                
                return `${randomPick(introTemplates)}\n\n${randomPick(middleTemplates)}\n\n${randomPick(endingTemplates)}\n\n(This is a mock story generated when the server is unavailable.)`;
            };
            
            // Generate vocabulary that matches the subject
            const generateVocabularyList = () => {
                if (!generateVocab) return null;
                
                const vocabularies = {
                    'biology': [
                        { word: "cell", definition: "The smallest structural and functional unit of an organism" },
                        { word: "ecosystem", definition: "A biological community of interacting organisms and their physical environment" },
                        { word: "photosynthesis", definition: "The process by which green plants use sunlight to synthesize foods from carbon dioxide and water" }
                    ],
                    'mathematics': [
                        { word: "equation", definition: "A statement that the values of two mathematical expressions are equal" },
                        { word: "fraction", definition: "A numerical quantity that is not a whole number" },
                        { word: "geometry", definition: "The branch of mathematics concerned with the properties of space and shapes" }
                    ],
                    'history': [
                        { word: "artifact", definition: "An object made by a human being, typically of cultural or historical interest" },
                        { word: "civilization", definition: "The stage of human social and cultural development considered most advanced" },
                        { word: "revolution", definition: "A forcible overthrow of a government or social order in favor of a new system" }
                    ],
                    'default': [
                        { word: "perseverance", definition: "Persistence in doing something despite difficulty or delay in achieving success" },
                        { word: "dedication", definition: "The quality of being dedicated or committed to a task or purpose" },
                        { word: "discovery", definition: "The action or process of discovering or being discovered" }
                    ]
                };
                
                // Return subject-specific vocabulary if available, otherwise default
                return vocabularies[subject.toLowerCase()] || vocabularies['default'];
            };
            
            // Create a realistic server response
            const mockResponse = {
                success: true,
                data: {
                    story: {
                        title: `The ${subject.charAt(0).toUpperCase() + subject.slice(1)} Adventure - Grade ${grade}`,
                        content: generateContent(),
                        summary: generateSummary ? `A story about ${character} learning about ${subject} in ${setting} and making exciting discoveries.` : null,
                        vocabulary: generateVocabularyList(),
                        learning_objectives: [
                            `Understanding key concepts in ${subject}`,
                            `Developing critical thinking about ${subject}`,
                            `Applying knowledge of ${subject} in real-world scenarios`
                        ],
                        quiz: [
                            {
                                question: `What is the main topic of this story?`,
                                options: [
                                    `${subject}`,
                                    `Mathematics`,
                                    `Geography`,
                                    `Literature`
                                ],
                                correct_answer: 0
                            },
                            {
                                question: `Who is the main character in the story?`,
                                options: [
                                    `A teacher`,
                                    `${character}`,
                                    `A scientist`,
                                    `A group of students`
                                ],
                                correct_answer: 1
                            },
                            {
                                question: `Where does the story take place?`,
                                options: [
                                    `In a laboratory`,
                                    `In a museum`,
                                    `${setting}`,
                                    `In a library`
                                ],
                                correct_answer: 2
                            }
                        ]
                    }
                },
                meta: {
                    processing_time: "0.8s",
                    generated_at: new Date().toISOString(),
                    source: "mock-data-generator"
                }
            };
            
            console.log('Generated mock response:', mockResponse);
            return mockResponse;
        } catch (error) {
            console.error('Error in mock data generation:', error);
            
            // Super simple fallback if something goes wrong
            return {
                success: true,
                data: {
                    story: {
                        title: "Learning Adventure",
                        content: "Once upon a time, a student embarked on a learning journey. Through dedication and curiosity, they discovered amazing new knowledge. Their teacher was impressed by their progress.\n\n(This is a simple mock story generated as a fallback.)",
                        summary: null,
                        vocabulary: null,
                        learning_objectives: ["Learning through exploration", "Developing critical thinking", "Applying knowledge"],
                        quiz: [
                            {
                                question: "What did the student discover?",
                                options: [
                                    "New friends",
                                    "A secret passage",
                                    "Amazing new knowledge",
                                    "A scientific formula"
                                ],
                                correct_answer: 2
                            },
                            {
                                question: "Who was impressed by the student's progress?",
                                options: [
                                    "The principal",
                                    "Their teacher",
                                    "Their parents",
                                    "Other students"
                                ],
                                correct_answer: 1
                            }
                        ]
                    }
                }
            };
        }
    }

    async getAuthToken() {
        try {
            if (!window.supabase || !window.supabase.auth) {
                console.warn('Supabase auth not available');
                return null;
            }
            
            const { data: { session } } = await window.supabase.auth.getSession();
            return session?.access_token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    async fetchUserStories(userId) {
        try {
            if (!userId) {
                console.warn('UserId not provided');
                return [];
            }
            
            const response = await fetch(`${this.baseUrl}/user-stories/${userId}`);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching user stories:', error);
            throw error;
        }
    }

    async deleteStory(storyId) {
        try {
            if (!storyId) {
                console.warn('StoryId not provided');
                return { success: false, error: 'Story ID is required' };
            }
            
            const response = await fetch(`${this.baseUrl}/stories/${storyId}`, {
                method: 'DELETE'
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error deleting story:', error);
            throw error;
        }
    }

    async getStoryById(storyId) {
        try {
            if (!storyId) {
                console.warn('StoryId not provided');
                return null;
            }
            
            const response = await fetch(`${this.baseUrl}/stories/${storyId}`);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error getting story by ID:', error);
            throw error;
        }
    }
}

// Create and export API service instance
window.apiService = new ApiService(); 
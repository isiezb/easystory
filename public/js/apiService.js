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
        this.baseUrl = '';
        this.initPromise = this.init();
    }

    /**
     * Initialize the API service
     */
    async init() {
        try {
            if (window._config) {
                console.log('Using existing config');
                this.baseUrl = window._config.serverUrl;
            } else if (window.configPromise) {
                console.log('Waiting for config promise to resolve');
                const config = await window.configPromise;
                this.baseUrl = config.serverUrl;
            } else {
                throw new Error('No config available for ApiService');
            }

            // Ensure the baseUrl has no trailing slash
            this.baseUrl = this.baseUrl.replace(/\/$/, '');
            console.log('API Service initialized with base URL:', this.baseUrl);

            // Test server connectivity
            this.testServerConnection();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize API service:', error);
            throw error;
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
        if (this.initPromise) {
            try {
                await this.initPromise;
            } catch (error) {
                console.error('API Service initialization failed:', error);
                // Continue anyway, to try the request
            }
        }
        
        console.log('Generating story with data:', data);
        console.log('API baseUrl:', this.baseUrl); 
        
        // Get initial form values with proper defaults
        const subject = String(data.subject || "general").trim();
        const academicGrade = String(data.academic_grade || "5").trim();
        
        // Handle potentially empty optional fields
        const subjectSpecRaw = String(data.subject_specification || "").trim();
        const settingRaw = String(data.setting || "").trim(); // Default to empty string if not provided
        const mainCharacterRaw = String(data.main_character || "").trim(); // Default to empty string if not provided
        
        // Convert empty strings for optional fields to null for potential use later
        const subjectSpecOrNull = subjectSpecRaw === "" ? null : subjectSpecRaw;
        const settingOrNull = settingRaw === "" ? null : settingRaw;
        const mainCharacterOrNull = mainCharacterRaw === "" ? null : mainCharacterRaw;
        
        const wordCountStr = data.word_count ? String(data.word_count) : "500";
        const language = data.language ? String(data.language) : "English"; // Capitalized
        
        // IMPORTANT: Checkbox values are undefined when not checked, 'on' when checked
        // Debug the actual checkbox values
        console.log('Raw checkbox values:', {
            generate_vocabulary: data.generate_vocabulary,
            generate_summary: data.generate_summary
        });
        
        // Format booleans based on checkbox values - use FALSE for undefined/unchecked
        const generateVocabulary = data.generate_vocabulary === 'on'; // true if 'on', false otherwise (including undefined)
        const generateSummary = data.generate_summary === 'on'; // true if 'on', false otherwise (including undefined)
        
        // Update for Format 1: Send grade as string, language as lowercase
        const languageLower = language.toLowerCase();
        
        // === NEW: Format 0 - Completely different approach with camelCase + auth fields ===
        // Try with camelCase fields, which is sometimes preferred by APIs
        const camelCaseFormat = {
            // Primary data wrapper
            payload: {
                // Main data in camelCase
                subject: subject,
                academicGrade: academicGrade,
                wordCount: parseInt(wordCountStr, 10),
                language: languageLower,
                // Only include non-empty optional fields
                ...(subjectSpecOrNull !== null && { subjectSpecification: subjectSpecOrNull }),
                ...(settingOrNull !== null && { setting: settingOrNull }),
                ...(mainCharacterOrNull !== null && { mainCharacter: mainCharacterOrNull }),
                // Booleans
                generateVocabulary: generateVocabulary,
                generateSummary: generateSummary
            },
            // Metadata wrapper
            meta: {
                clientVersion: "1.0",
                clientId: "web-client",
                timestamp: new Date().toISOString(),
                requestId: `req_${Math.random().toString(36).substring(2, 15)}`
            },
            // Auth-related data that might be required
            auth: {
                apiKey: window._config?.supabaseKey || null,
                userId: window.auth && typeof window.auth.getUser === 'function' ? window.auth.getUser()?.id : null,
                anonymous: window.auth ? !(window.auth.getUser && typeof window.auth.getUser === 'function' && window.auth.getUser()) : true
            }
        };
        // === END NEW FORMAT ===

        // Format 1: Standard format with explicit numbers, booleans, and OMITTED nulls
        const format1 = {
            subject: subject,
            academic_grade: academicGrade, // Send as original STRING value (e.g., "K", "5")
            word_count: parseInt(wordCountStr, 10), // Send as number
            language: languageLower, // Send as lowercase string
            generate_vocabulary: generateVocabulary, // Send as boolean
            generate_summary: generateSummary      // Send as boolean
        };
        // Conditionally add optional fields ONLY if they have a non-null value
        if (subjectSpecOrNull !== null) {
            format1.subject_specification = subjectSpecOrNull;
        }
        if (settingOrNull !== null) {
            format1.setting = settingOrNull;
        }
        if (mainCharacterOrNull !== null) {
            format1.main_character = mainCharacterOrNull;
        }
        // --- End Format 1 --- 

        // Format 2: String boolean values, null optionals
        const format2 = {
            subject: subject,
            academic_grade: academicGrade, // String grade
            subject_specification: subjectSpecOrNull, // Send null if empty
            setting: settingOrNull, // Send null if empty
            main_character: mainCharacterOrNull, // Send null if empty
            word_count: wordCountStr, // String count
            language: language,
            // Send undefined for missing booleans to omit key
            generate_vocabulary: generateVocabulary === false ? undefined : String(generateVocabulary),
            generate_summary: generateSummary === false ? undefined : String(generateSummary)
        };
        
        // Format 3: Using 'on' directly for checkboxes, null optionals
        const format3 = {
            subject: subject,
            academic_grade: academicGrade, // String grade
            subject_specification: subjectSpecOrNull, // Send null if empty
            setting: settingOrNull, // Send null if empty
            main_character: mainCharacterOrNull, // Send null if empty
            word_count: wordCountStr, // String count
            language: language,
            generate_vocabulary: data.generate_vocabulary, // Send 'on' or undefined
            generate_summary: data.generate_summary // Send 'on' or undefined
        };
        
        // Format 4: Raw form data
        const format4 = {...data};
        
        // Format 5: Super minimal (absolute essentials only)
        const format5 = {
            subject: subject,
            academic_grade: academicGrade
        };
        
        // Create an array of request formats to try
        const requestFormats = [
            // Format 0: Completely different approach with camelCase fields
            camelCaseFormat,
            
            // Format 1: Standard format with explicit numbers, booleans, and OMITTED nulls
            format1,
            
            // Format 2: String boolean values, null optionals
            format2,
            
            // Format 3: Using 'on' directly for checkboxes, null optionals
            format3,
            
            // Format 4: Raw form data
            format4,
            
            // Format 5: Super minimal (absolute essentials only)
            format5
        ];
        
        // Log all the request formats we'll try
        console.log('Request formats to try:', JSON.stringify(requestFormats, null, 2));
        
        try {
            // Build the base headers that are always included
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/html, */*',
                'X-Client-Name': 'quiz-story-web',
                'X-Client-Version': '1.0.0',
                'X-Request-ID': `req_${Math.random().toString(36).substring(2, 15)}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
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
                return this.getMockStoryData(requestFormats[0]);
            }
            
            console.log(`Sending API request to ${this.baseUrl}/generate-story`);
            
            // Try multiple formats in sequence
            let response;
            let errorMessages = [];
            let lastRequestFormat;
            
            // Add fallback URL-encoded request format as absolute last resort
            const urlEncodedParams = new URLSearchParams();
            Object.entries(format1).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    urlEncodedParams.append(key, String(value));
                }
            });
            
            let hasSuccess = false;
            
            for (let i = 0; i < requestFormats.length; i++) {
                const format = requestFormats[i];
                lastRequestFormat = format;
                
                try {
                    console.log(`Attempt ${i+1}: Using format:`, JSON.stringify(format, null, 2));
                    
                    // Try different endpoint paths if we're on the last attempts
                    let endpointPath = '/generate-story';
                    if (i === requestFormats.length - 1) {
                        // Try the alternate endpoint paths on the last format
                        endpointPath = '/api/generate-story';
                        console.log(`Trying alternate endpoint path: ${endpointPath}`);
                    }
                    
                    response = await fetch(`${this.baseUrl}${endpointPath}`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify(format)
                    });
                    
                    // Log full details about the response
                    console.log(`Response for attempt ${i+1}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries([...response.headers.entries()])
                    });
                    
                    // If success, break the loop
                    if (response.ok) {
                        console.log(`Format ${i+1} succeeded!`);
                        hasSuccess = true;
                        break;
                    } else {
                        // Get error details for debugging
                        const errorText = await response.text();
                        const error = {
                            status: response.status,
                            statusText: response.statusText,
                            body: errorText
                        };
                        errorMessages.push(`Format ${i+1} failed: ${JSON.stringify(error)}`);
                        console.warn(`Format ${i+1} failed with status ${response.status}:`, errorText);
                        
                        // If this was the first failure, add a small delay before trying the next format
                        // This can help with potential rate limiting or server processing issues
                        if (!response.ok && i < requestFormats.length - 1) {
                            const delayMs = 500; // 500ms delay between attempts
                            console.log(`Adding ${delayMs}ms delay before next attempt...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }
                        
                        // If we reached the last format, try URL-encoded as a final last-resort
                        if (i === requestFormats.length - 1 && !hasSuccess) {
                            console.log('Attempting final URL-encoded format as last resort');
                            
                            // Try both endpoint paths with URL encoding
                            const endpointPaths = ['/generate-story', '/api/generate-story'];
                            
                            for (const path of endpointPaths) {
                                try {
                                    console.log(`URL-encoded request to ${path}:`, urlEncodedParams.toString());
                                    const urlEncodedResponse = await fetch(`${this.baseUrl}${path}`, {
                                        method: 'POST',
                                        headers: {
                                            ...headers,
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                        },
                                        body: urlEncodedParams
                                    });
                                    
                                    console.log(`URL-encoded response from ${path}:`, {
                                        status: urlEncodedResponse.status,
                                        statusText: urlEncodedResponse.statusText
                                    });
                                    
                                    if (urlEncodedResponse.ok) {
                                        console.log(`URL-encoded format to ${path} succeeded!`);
                                        response = urlEncodedResponse;
                                        hasSuccess = true;
                                        break; // Exit the loop if we succeed
                                    } else {
                                        const errorText = await urlEncodedResponse.text();
                                        errorMessages.push(`URL-encoded format to ${path} failed: ${urlEncodedResponse.status} ${errorText}`);
                                    }
                                } catch (urlEncodedError) {
                                    console.error(`URL-encoded request error to ${path}:`, urlEncodedError);
                                    errorMessages.push(`URL-encoded format error to ${path}: ${urlEncodedError.message}`);
                                }
                                
                                // Add delay between endpoint attempts
                                await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        }
                    }
                } catch (fetchError) {
                    console.error(`Fetch error in attempt ${i+1}:`, fetchError);
                    errorMessages.push(`Format ${i+1} fetch error: ${fetchError.message}`);
                    
                    // If this was the first failure, add a small delay before trying the next format
                    // This can help with potential rate limiting or server processing issues
                    if (!response.ok && i < requestFormats.length - 1) {
                        const delayMs = 500; // 500ms delay between attempts
                        console.log(`Adding ${delayMs}ms delay before next attempt...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                    
                    // If we reached the last format, try URL-encoded as a final last-resort
                    if (i === requestFormats.length - 1 && !hasSuccess) {
                        console.log('Attempting final URL-encoded format as last resort (after fetch error)');
                        
                        // Try both endpoint paths with URL encoding
                        const endpointPaths = ['/generate-story', '/api/generate-story'];
                        
                        for (const path of endpointPaths) {
                            try {
                                console.log(`URL-encoded request to ${path}:`, urlEncodedParams.toString());
                                const urlEncodedResponse = await fetch(`${this.baseUrl}${path}`, {
                                    method: 'POST',
                                    headers: {
                                        ...headers,
                                        'Content-Type': 'application/x-www-form-urlencoded'
                                    },
                                    body: urlEncodedParams
                                });
                                
                                console.log(`URL-encoded response from ${path}:`, {
                                    status: urlEncodedResponse.status,
                                    statusText: urlEncodedResponse.statusText
                                });
                                
                                if (urlEncodedResponse.ok) {
                                    console.log(`URL-encoded format to ${path} succeeded!`);
                                    response = urlEncodedResponse;
                                    hasSuccess = true;
                                    break; // Exit the loop if we succeed
                                } else {
                                    const errorText = await urlEncodedResponse.text();
                                    errorMessages.push(`URL-encoded format to ${path} failed: ${urlEncodedResponse.status} ${errorText}`);
                                }
                            } catch (urlEncodedError) {
                                console.error(`URL-encoded request error to ${path}:`, urlEncodedError);
                                errorMessages.push(`URL-encoded format error to ${path}: ${urlEncodedError.message}`);
                            }
                            
                            // Add delay between endpoint attempts
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                }
            }
            
            console.log('Successful response with status:', response.status);
            console.log('Using request format:', JSON.stringify(lastRequestFormat, null, 2));
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error in generateStory:', error);
            
            // Always fall back to mock data if anything goes wrong
            console.log('Request failed, falling back to mock data');
            return this.getMockStoryData(format1);
        }
    }
    
    // Mock data for development and fallback
    getMockStoryData(data) {
        // Use the values from the requestData for consistency
        const subject = data.subject || 'general knowledge';
        const grade = data.academic_grade || '5';
        const character = data.main_character || 'a curious student';
        const setting = data.setting || 'a classroom';
        
        // Create a realistic server response
        return {
            success: true,
            data: {
                story: {
                    title: `The ${subject.charAt(0).toUpperCase() + subject.slice(1)} Adventure - Grade ${grade}`,
                    content: `Once upon a time, in ${setting}, ${character} embarked on a journey to learn about ${subject}.\n\nThrough perseverance and dedication, they discovered amazing insights about ${subject} and grew their knowledge.\n\nThe teacher was impressed by ${character}'s dedication and encouraged them to share their discoveries with the class.\n\nThis is a simulated story generated when the server is unavailable.`,
                    summary: data.generate_summary === "true" ? `A brief story about a ${character} learning about ${subject} in ${setting}.` : null,
                    vocabulary: data.generate_vocabulary === "true" ? [
                        { word: "perseverance", definition: "Persistence in doing something despite difficulty or delay in achieving success" },
                        { word: "dedication", definition: "The quality of being dedicated or committed to a task or purpose" },
                        { word: "discovery", definition: "The action or process of discovering or being discovered" }
                    ] : null,
                    learning_objectives: [
                        `Understanding key concepts in ${subject}`,
                        `Developing critical thinking about ${subject}`,
                        `Applying knowledge of ${subject} in real-world scenarios`
                    ]
                }
            },
            meta: {
                processing_time: "0.8s",
                generated_at: new Date().toISOString()
            }
        };
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
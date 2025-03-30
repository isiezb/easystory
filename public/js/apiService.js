// API Error class
class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
}

// API Service class
class ApiService {
    constructor() {
        this.baseUrl = window._config?.serverUrl || window.location.origin;
        console.log('API Service initialized with base URL:', this.baseUrl);
        
        // Fallback to a mock server if needed
        if (!this.baseUrl || this.baseUrl === 'undefined') {
            this.baseUrl = window.location.origin;
            console.warn('No server URL configured, using current origin as fallback');
        }
    }

    async handleResponse(response) {
        console.log('Handling response with status:', response.status);

        if (!response.ok) {
            console.warn('Response not OK', response.status, response.statusText);
            let errorData;
            let errorMessage = `API request failed with status ${response.status}`;
            
            // Check content type to decide how to parse the error body
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                    console.log('Parsed JSON error response:', errorData);
                    // Try to find a meaningful message within the JSON error object
                    errorMessage = errorData.error?.message || errorData.message || errorData.detail || JSON.stringify(errorData);
                } else {
                    // If not JSON, read as text
                    const errorText = await response.text();
                    console.log('Received non-JSON error response text:', errorText);
                    errorData = { message: errorText }; 
                    errorMessage = errorText.substring(0, 200); // Limit length for display
                }
            } catch (parseError) {
                // This catches errors during response.json() or response.text()
                console.error('Error parsing error response body:', parseError);
                try {
                    // As a last resort, try reading as text if JSON parsing failed
                    const errorText = await response.text(); 
                    errorData = { message: `Failed to parse error response. Body: ${errorText.substring(0, 100)}...` };
                    errorMessage = errorData.message;
                } catch (nestedParseError) {
                     console.error('Error reading error response body as text after JSON parse failed:', nestedParseError);
                     errorData = { message: 'Failed to parse error response and could not read body as text.' };
                     errorMessage = errorData.message;
                }
            }
            
            console.error(`API Error: ${response.status} - ${errorMessage}`, errorData);
            throw new ApiError(errorMessage, response.status, errorData);
        }

        // Handle successful responses (2xx)
        try {
            const responseData = await response.json();
            console.log('Successful API response data:', responseData);
            return this.parseStoryResponse(responseData); // Use the flexible parser
        } catch (jsonError) {
            console.error('Error parsing successful JSON response:', jsonError);
            throw new Error('Failed to parse successful API response.');
        }
    }

    async generateStory(data) {
        console.log('Generating story with data:', data);
        
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
        
        // --- Prepare Format 1 (Standard with Numbers and Omitted Nulls) --- 
        let academicGradeNum = null; 
        if (academicGrade === 'K') { 
            academicGradeNum = 0; // Or handle as string if server expects 'K'
        } else if (academicGrade && !isNaN(parseInt(academicGrade, 10))) {
            academicGradeNum = parseInt(academicGrade, 10);
        }

        const format1 = {
            subject: subject,
            academic_grade: academicGradeNum, // Send as number (or specific handling for K)
            word_count: parseInt(wordCountStr, 10), // Send as number
            language: language,
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

        // Create an array of request formats to try
        const requestFormats = [
            // Format 1: Standard format with explicit numbers, booleans, and OMITTED nulls
            format1,
            
            // Format 2: String boolean values, null optionals
            {
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
            },
            
            // Format 3: Using 'on' directly for checkboxes, null optionals
            {
                subject: subject,
                academic_grade: academicGrade, // String grade
                subject_specification: subjectSpecOrNull, // Send null if empty
                setting: settingOrNull, // Send null if empty
                main_character: mainCharacterOrNull, // Send null if empty
                word_count: wordCountStr, // String count
                language: language,
                generate_vocabulary: data.generate_vocabulary, // Send 'on' or undefined
                generate_summary: data.generate_summary // Send 'on' or undefined
            },
            
            // Format 4: Raw form data
            {...data}
        ];
        
        // Log all the request formats we'll try
        console.log('Request formats to try:', JSON.stringify(requestFormats, null, 2));
        
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
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
            
            for (let i = 0; i < requestFormats.length; i++) {
                const format = requestFormats[i];
                lastRequestFormat = format;
                
                try {
                    console.log(`Attempt ${i+1}: Using format:`, JSON.stringify(format, null, 2));
                    
                    response = await fetch(`${this.baseUrl}/generate-story`, {
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
                        
                        // If we reached the last format, throw error
                        if (i === requestFormats.length - 1) {
                            throw new Error(`All request formats failed. ${errorMessages.join(' | ')}`);
                        }
                    }
                } catch (fetchError) {
                    console.error(`Fetch error in attempt ${i+1}:`, fetchError);
                    errorMessages.push(`Format ${i+1} fetch error: ${fetchError.message}`);
                    
                    // If we reached the last format, throw error
                    if (i === requestFormats.length - 1) {
                        throw new Error(`Network errors in all attempts. ${errorMessages.join(' | ')}`);
                    }
                }
            }
            
            console.log('Successful response with status:', response.status);
            console.log('Using request format:', JSON.stringify(lastRequestFormat, null, 2));
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error in generateStory:', error);
            
            // Fallback to mock data for network errors or general server errors (5xx)
            const shouldFallback = (error.name === 'TypeError' && error.message.includes('Failed to fetch')) || 
                                   (error.name === 'ApiError' && error.status >= 500 && error.status < 600);

            if (shouldFallback) {
                console.log('Network or server error, attempting to use mock data as fallback.');
                try {
                    return this.getMockStoryData(requestFormats[0]); // Use the primary format for mock data generation
                } catch (mockError) {
                    console.error('Error generating mock data after primary error:', mockError);
                    // If mock data also fails, re-throw the original error
                    throw error; 
                }
            }
            
            // Re-throw other errors (like 4xx client errors or specific ApiErrors)
            throw error;
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
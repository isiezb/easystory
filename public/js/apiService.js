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
        if (!response.ok) {
            let errorMessage = 'API request failed';
            let details = null;
            
            try {
                const errorData = await response.json();
                console.error('API error response:', errorData);
                errorMessage = errorData.message || errorData.error || errorMessage;
                details = errorData;
            } catch (e) {
                console.error('Error parsing error response:', e);
                try {
                    // Try to get text if JSON parsing fails
                    const errorText = await response.text();
                    console.error('Error response text:', errorText);
                    errorMessage = errorText || errorMessage;
                } catch (textError) {
                    console.error('Error getting error response text:', textError);
                }
            }
            
            throw new ApiError(errorMessage, response.status, details);
        }
        
        try {
            return await response.json();
        } catch (e) {
            console.error('Error parsing JSON response:', e);
            const text = await response.text();
            console.log('Response text:', text);
            throw new Error('Invalid JSON response from server');
        }
    }

    async generateStory(data) {
        console.log('Generating story with data:', data);
        
        // Get initial form values with proper defaults
        const subject = String(data.subject || "general").trim();
        const academicGrade = String(data.academic_grade || "5").trim();
        const subjectSpec = String(data.subject_specification || "").trim();
        const setting = String(data.setting || "a classroom").trim();
        const mainCharacter = String(data.main_character || "a student").trim();
        const wordCount = data.word_count ? String(data.word_count) : "500";
        const language = data.language ? String(data.language) : "English"; // Capitalized
        
        // IMPORTANT: Checkbox values are undefined when not checked, 'on' when checked
        // Debug the actual checkbox values
        console.log('Raw checkbox values:', {
            generate_vocabulary: data.generate_vocabulary,
            generate_summary: data.generate_summary
        });
        
        // Format booleans based on checkbox values - null when undefined, true when 'on'
        const generateVocabulary = data.generate_vocabulary === undefined ? null : (data.generate_vocabulary === 'on');
        const generateSummary = data.generate_summary === undefined ? null : (data.generate_summary === 'on');
        
        // Create an array of request formats to try
        const requestFormats = [
            // Format 1: Standard format with explicit boolean flags as literal boolean values
            {
                subject: subject,
                academic_grade: academicGrade,
                subject_specification: subjectSpec,
                setting: setting,
                main_character: mainCharacter,
                word_count: parseInt(wordCount, 10),
                language: language,
                generate_vocabulary: generateVocabulary,
                generate_summary: generateSummary
            },
            
            // Format 2: String boolean values
            {
                subject: subject,
                academic_grade: academicGrade,
                subject_specification: subjectSpec,
                setting: setting,
                main_character: mainCharacter,
                word_count: wordCount,
                language: language,
                generate_vocabulary: generateVocabulary === null ? undefined : String(generateVocabulary),
                generate_summary: generateSummary === null ? undefined : String(generateSummary)
            },
            
            // Format 3: Using 'on' directly for checkboxes
            {
                subject: subject,
                academic_grade: academicGrade,
                subject_specification: subjectSpec,
                setting: setting,
                main_character: mainCharacter,
                word_count: wordCount,
                language: language,
                generate_vocabulary: data.generate_vocabulary,
                generate_summary: data.generate_summary
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
            
            // If this is a network error or server error, return mock data
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch') || 
                (error.name === 'ApiError' && error.status === 500)) {
                console.log('Network or server error, using mock data');
                return this.getMockStoryData(requestFormats[0]);
            }
            
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
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
        
        // Create a properly formatted request object based on server expectations
        const requestData = {
            // Required fields with fallbacks
            academic_grade: data.academic_grade || data.grade || "5",
            subject: data.subject || "general",
            
            // Optional fields with fallbacks
            subject_specification: data.subject_specification || "",
            setting: data.setting || "a classroom",
            main_character: data.main_character || data.character || "a student",
            word_count: parseInt(data.word_count || data.wordCount || 500),
            language: data.language || "english",
            
            // Boolean flags
            generate_vocabulary: data.generate_vocabulary === 'on' || data.vocabulary === 'on' || false,
            generate_summary: data.generate_summary === 'on' || data.summary === 'on' || false,
            generate_quiz: data.generate_quiz === 'on' || data.quiz === 'on' || false
        };
        
        // Log the final formatted request
        console.log('Formatted request data for API:', requestData);
        
        try {
            const headers = {
                'Content-Type': 'application/json'
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
                return this.getMockStoryData(requestData);
            }
            
            console.log(`Sending API request to ${this.baseUrl}/generate-story`);
            const response = await fetch(`${this.baseUrl}/generate-story`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });
            
            console.log('Received response status:', response.status);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error in generateStory:', error);
            
            // If this is a network error or server error, return mock data
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch') || 
                (error.name === 'ApiError' && error.status === 500)) {
                console.log('Network or server error, using mock data');
                return this.getMockStoryData(requestData);
            }
            
            throw error;
        }
    }
    
    // Mock data for development and fallback
    getMockStoryData(data) {
        const subject = data.subject || 'general knowledge';
        const grade = data.academic_grade || '5';
        const character = data.main_character || 'a curious student';
        const setting = data.setting || 'a classroom';
        
        return {
            title: `The ${subject.charAt(0).toUpperCase() + subject.slice(1)} Adventure - Grade ${grade}`,
            content: `Once upon a time, in ${setting}, ${character} embarked on a journey to learn about ${subject}.\n\nThrough perseverance and dedication, they discovered amazing insights about ${subject} and grew their knowledge.\n\nThe teacher was impressed by ${character}'s dedication and encouraged them to share their discoveries with the class.\n\nThis is a simulated story generated when the server is unavailable.`,
            summary: data.generate_summary ? `A brief story about a ${character} learning about ${subject} in ${setting}.` : null,
            vocabulary: data.generate_vocabulary ? [
                { word: "perseverance", definition: "Persistence in doing something despite difficulty or delay in achieving success" },
                { word: "dedication", definition: "The quality of being dedicated or committed to a task or purpose" },
                { word: "discovery", definition: "The action or process of discovering or being discovered" }
            ] : null,
            learning_objectives: [
                `Understanding key concepts in ${subject}`,
                `Developing critical thinking about ${subject}`,
                `Applying knowledge of ${subject} in real-world scenarios`
            ],
            quiz: data.generate_quiz ? [
                {
                    question: `What did ${character} learn about in the story?`,
                    options: [
                        subject,
                        "mathematics",
                        "history",
                        "science"
                    ],
                    answer: 0
                },
                {
                    question: "What quality helped the character learn?",
                    options: [
                        "luck",
                        "wealth",
                        "perseverance",
                        "magic"
                    ],
                    answer: 2
                }
            ] : null
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
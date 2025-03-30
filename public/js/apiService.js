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
        
        // Validate data
        if (!data.subject) {
            console.warn('Missing subject in request data');
            data.subject = 'general';
        }
        
        if (!data.academic_grade) {
            console.warn('Missing academic_grade in request data');
            data.academic_grade = '5';
        }
        
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
                return this.getMockStoryData(data);
            }
            
            console.log(`Sending API request to ${this.baseUrl}/generate-story`);
            const response = await fetch(`${this.baseUrl}/generate-story`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });
            
            console.log('Received response status:', response.status);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error in generateStory:', error);
            
            // If this is a network error or server error, return mock data
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch') || 
                (error.name === 'ApiError' && error.status === 500)) {
                console.log('Network or server error, using mock data');
                return this.getMockStoryData(data);
            }
            
            throw error;
        }
    }
    
    // Mock data for development and fallback
    getMockStoryData(data) {
        return {
            title: `The ${data.subject} Adventure`,
            content: `Once upon a time, in ${data.setting || 'a magical place'}, ${data.main_character || 'a curious student'} embarked on a journey to learn about ${data.subject}.\n\nThrough perseverance and dedication, they discovered amazing insights and grew their knowledge.\n\nThis is a mock story generated for development purposes when the server is unavailable.`,
            summary: "A brief story about learning and discovery.",
            vocabulary: [
                { word: "perseverance", definition: "Persistence in doing something despite difficulty or delay in achieving success" },
                { word: "dedication", definition: "The quality of being dedicated or committed to a task or purpose" }
            ],
            learning_objectives: [
                "Understanding key concepts in " + data.subject,
                "Applying knowledge in real-world scenarios"
            ]
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
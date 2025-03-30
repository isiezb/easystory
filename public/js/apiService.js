import { config } from './config.js';
import { supabase } from './supabase.js';

class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
}

class ApiService {
    constructor() {
        this.baseUrl = config.serverUrl;
    }

    async handleResponse(response) {
        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new ApiError(
                'Invalid response format',
                response.status,
                'The server returned an invalid JSON response'
            );
        }
        
        if (!response.ok) {
            const errorMessage = this.getErrorMessage(response.status, data);
            throw new ApiError(
                errorMessage,
                response.status,
                data.details
            );
        }
        
        return data;
    }

    getErrorMessage(status, data) {
        const statusMessages = {
            400: 'Invalid request',
            401: 'Please sign in to continue',
            403: 'You do not have permission to perform this action',
            404: 'The requested resource was not found',
            429: 'Too many requests. Please try again later',
            500: 'Server error. Please try again later',
            503: 'Service temporarily unavailable'
        };

        return data.message || statusMessages[status] || 'An error occurred';
    }

    async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (error instanceof ApiError && error.status >= 500) {
                    if (attempt < maxRetries) {
                        const delay = initialDelay * Math.pow(2, attempt - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                throw error;
            }
        }
        
        throw lastError;
    }

    async generateStory(data) {
        try {
            const response = await fetch(`${this.baseUrl}/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    word_count: parseInt(data.word_count),
                    generate_vocabulary: data.generate_vocabulary === 'on',
                    generate_summary: data.generate_summary === 'on'
                })
            });

            return this.handleResponse(response);
        } catch (error) {
            console.error('Error generating story:', error);
            throw new ApiError(error.message || 'Failed to generate story', error.status || 500);
        }
    }

    async fetchUserStories(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/user-stories/${userId}`);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching user stories:', error);
            throw new ApiError(error.message || 'Failed to fetch stories', error.status || 500);
        }
    }

    async deleteStory(storyId) {
        try {
            const response = await fetch(`${this.baseUrl}/stories/${storyId}`, {
                method: 'DELETE'
            });
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error deleting story:', error);
            throw new ApiError(error.message || 'Failed to delete story', error.status || 500);
        }
    }

    async getStoryById(storyId) {
        try {
            const response = await fetch(`${this.baseUrl}/stories/${storyId}`);
            return this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching story:', error);
            throw new ApiError(error.message || 'Failed to fetch story', error.status || 500);
        }
    }

    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }
}

export const apiService = new ApiService(); 
import { configPromise } from './config.js';
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
        this.config = null;
    }

    async init() {
        if (!this.config) {
            this.config = await configPromise;
        }
        return this.config;
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

    async generateStory(formData) {
        try {
            const data = {
                academic_grade: formData.academic_grade,
                subject: formData.subject,
                subject_specification: formData.subject_specification || '',
                setting: formData.setting,
                main_character: formData.main_character,
                word_count: parseInt(formData.word_count),
                language: formData.language,
                generate_vocabulary: formData.generate_vocabulary === 'true',
                generate_summary: formData.generate_summary === 'true'
            };

            console.log('Sending data to server:', data);
            console.log('Server URL:', window._env_?.SERVER_URL);
            console.log('Auth token:', await this.getAuthToken());

            const response = await fetch(`${window._env_?.SERVER_URL}/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate story');
            }

            const result = await response.json();
            console.log('Server response:', result);
            return result;
        } catch (error) {
            console.error('Error in generateStory:', error);
            throw error;
        }
    }

    async fetchUserStories(userId) {
        await this.init();
        const response = await fetch(`${this.config.serverUrl}/user-stories/${userId}`);
        return this.handleResponse(response);
    }

    async deleteStory(storyId) {
        await this.init();
        const response = await fetch(`${this.config.serverUrl}/stories/${storyId}`, {
            method: 'DELETE'
        });
        return this.handleResponse(response);
    }

    async getStoryById(storyId) {
        await this.init();
        const response = await fetch(`${this.config.serverUrl}/stories/${storyId}`);
        return this.handleResponse(response);
    }

    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }
}

export const apiService = new ApiService(); 
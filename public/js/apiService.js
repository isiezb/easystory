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
        await this.init();
        const response = await fetch(`${this.config.serverUrl}/generate-story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.openRouterKey}`
            },
            body: JSON.stringify(formData)
        });
        return this.handleResponse(response);
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
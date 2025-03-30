import { supabase } from './supabase.js';
import { config } from './config.js';

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
        this.serverUrl = config.server.url;
        if (!this.serverUrl) {
            throw new Error('Missing SERVER_URL configuration');
        }
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
            console.log('Server URL:', this.serverUrl);

            const response = await fetch(`${this.serverUrl}/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(data)
            });

            const result = await this.handleResponse(response);
            console.log('Server response:', result);
            return result;
        } catch (error) {
            console.error('Error in generateStory:', error);
            throw error;
        }
    }

    async fetchUserStories(userId) {
        const response = await fetch(`${this.serverUrl}/user-stories/${userId}`);
        return this.handleResponse(response);
    }

    async deleteStory(storyId) {
        const response = await fetch(`${this.serverUrl}/stories/${storyId}`, {
            method: 'DELETE'
        });
        return this.handleResponse(response);
    }

    async getStoryById(storyId) {
        const response = await fetch(`${this.serverUrl}/stories/${storyId}`);
        return this.handleResponse(response);
    }

    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }
}

export const apiService = new ApiService(); 
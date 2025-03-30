import { config } from './config.js';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

export class ApiService {
    constructor() {
        this.baseUrl = config.serverUrl;
    }

    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json();
            throw new ApiError(error.message || 'API request failed', response.status);
        }
        return response.json();
    }

    async generateStory(data) {
        const response = await fetch(`${this.baseUrl}/generate-story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getAuthToken()}`
            },
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    }

    async getAuthToken() {
        const supabase = window.supabase;
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }

    async fetchUserStories(userId) {
        const response = await fetch(`${this.baseUrl}/user-stories/${userId}`);
        return this.handleResponse(response);
    }

    async deleteStory(storyId) {
        const response = await fetch(`${this.baseUrl}/stories/${storyId}`, {
            method: 'DELETE'
        });
        return this.handleResponse(response);
    }

    async getStoryById(storyId) {
        const response = await fetch(`${this.baseUrl}/stories/${storyId}`);
        return this.handleResponse(response);
    }
}

export const apiService = new ApiService(); 
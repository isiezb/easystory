import { config } from './config.js';

class ApiError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.status = status;
        this.details = details;
        this.name = 'ApiError';
    }
}

export const apiService = {
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new ApiError(
                data.message || 'An error occurred',
                response.status,
                data.details
            );
        }
        
        return data;
    },

    async generateStory(formData) {
        try {
            const response = await fetch(`${config.serverUrl}/generate-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify(formData)
            });

            return await this.handleResponse(response);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                'Network error while generating story',
                500,
                error.message
            );
        }
    },

    async fetchUserStories(userId) {
        try {
            const { data: stories, error } = await supabase
                .from('stories')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw new ApiError(error.message, 500, error.details);
            return stories;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                'Failed to fetch stories',
                500,
                error.message
            );
        }
    },

    async deleteStory(storyId) {
        try {
            const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (error) throw new ApiError(error.message, 500, error.details);
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                'Failed to delete story',
                500,
                error.message
            );
        }
    },

    async getStoryById(storyId) {
        try {
            const { data: story, error } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();

            if (error) throw new ApiError(error.message, 500, error.details);
            return story;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(
                'Failed to fetch story',
                500,
                error.message
            );
        }
    },

    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }
}; 
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

export const apiService = {
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
    },

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
    },

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
    },

    async generateStory(formData) {
        return this.retryWithBackoff(async () => {
            try {
                // Format form data
                const formattedData = {
                    ...formData,
                    word_count: parseInt(formData.word_count, 10),
                    generate_vocabulary: !!formData.generate_vocabulary,
                    generate_summary: !!formData.generate_summary
                };

                console.log('Generating story with formatted data:', formattedData);
                console.log('Server URL:', config.serverUrl);
                console.log('Auth token:', await this.getAuthToken());
                
                if (!config.serverUrl) {
                    throw new ApiError('Server URL is not configured', 500);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

                const response = await fetch(`${config.serverUrl}/generate-story`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify(formattedData),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    console.error('Error response:', errorData);
                    throw new ApiError(
                        errorData?.message || 'Failed to generate story',
                        response.status,
                        errorData?.details
                    );
                }

                return await this.handleResponse(response);
            } catch (error) {
                console.error('Error in generateStory:', error);
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timed out', 504);
                }
                if (error instanceof ApiError) throw error;
                throw new ApiError(
                    'Network error while generating story',
                    500,
                    error.message
                );
            }
        });
    },

    async fetchUserStories(userId) {
        return this.retryWithBackoff(async () => {
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
        });
    },

    async deleteStory(storyId) {
        return this.retryWithBackoff(async () => {
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
        });
    },

    async getStoryById(storyId) {
        return this.retryWithBackoff(async () => {
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
        });
    },

    async getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }
}; 
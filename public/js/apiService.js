import { config } from './config.js';

export const apiService = {
    async generateStory(formData) {
        const response = await fetch(`${config.serverUrl}/generate-story`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate story');
        }
        return data;
    },

    async fetchUserStories(userId) {
        const { data: stories, error } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return stories;
    },

    async deleteStory(storyId) {
        const { error } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId);

        if (error) throw error;
    },

    async getStoryById(storyId) {
        const { data: story, error } = await supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .single();

        if (error) throw error;
        return story;
    }
}; 
import { apiService } from './apiService.js';
import { uiHandler } from './uiHandler.js';
import { quiz } from './quiz.js';
import { supabase } from './supabase.js';

export const story = {
    async generate(formData) {
        try {
            uiHandler.showLoading();
            const response = await apiService.generateStory(formData);
            
            // Display story
            uiHandler.showStory(response);
            
            // Initialize quiz if available
            if (response.quiz) {
                quiz.init(response.quiz);
            }

            // Save story to Supabase if user is logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data, error } = await supabase.getClient().from('stories').insert({
                    user_id: session.user.id,
                    academic_grade: formData.academic_grade,
                    subject: formData.subject,
                    subject_specification: formData.subject_specification,
                    setting: formData.setting,
                    main_character: formData.main_character,
                    word_count: parseInt(formData.word_count),
                    language: formData.language,
                    story_text: response.content,
                    story_title: formData.subject_specification || 'Untitled Story',
                    learning_objectives: response.learning_objectives || [],
                    quiz_questions: response.quiz || [],
                    vocabulary_list: response.vocabulary || [],
                    story_summary: response.summary || '',
                    is_continuation: false
                }).select().single();

                if (error) {
                    console.error('Error saving story to Supabase:', error);
                    uiHandler.showError('Failed to save story');
                } else {
                    console.log('Story saved successfully:', data);
                }
            }
            
            return response;
        } catch (error) {
            console.error('Error generating story:', error);
            uiHandler.showError(error.message || 'Failed to generate story');
            throw error;
        } finally {
            uiHandler.hideLoading();
        }
    },

    async loadUserStories(userId) {
        try {
            uiHandler.showLoading();
            const stories = await apiService.fetchUserStories(userId);
            
            // Display stories in grid
            const storiesGrid = document.getElementById('storiesGrid');
            if (stories.length === 0) {
                storiesGrid.innerHTML = '<div class="no-stories">No stories yet. Generate your first story!</div>';
                return;
            }
            
            storiesGrid.innerHTML = stories.map(story => `
                <div class="story-card">
                    <h3>${story.title}</h3>
                    <div class="story-meta">
                        <span class="story-subject">${story.metadata.subject}</span>
                        <span class="story-date">${new Date(story.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="story-preview">${story.content.substring(0, 150)}...</div>
                    <div class="story-actions">
                        <button class="view-story" onclick="story.view('${story.id}')">View Story</button>
                        <button class="delete-story" onclick="story.delete('${story.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
            
            return stories;
        } catch (error) {
            console.error('Error loading stories:', error);
            uiHandler.showError(error.message || 'Failed to load stories');
            throw error;
        } finally {
            uiHandler.hideLoading();
        }
    },

    async view(storyId) {
        try {
            uiHandler.showLoading();
            const story = await apiService.getStoryById(storyId);
            uiHandler.showStory(story);
            
            // Initialize quiz if available
            if (story.metadata.quiz) {
                quiz.init(story.metadata.quiz);
            }
            
            return story;
        } catch (error) {
            console.error('Error viewing story:', error);
            uiHandler.showError(error.message || 'Failed to load story');
            throw error;
        } finally {
            uiHandler.hideLoading();
        }
    },

    async delete(storyId) {
        if (!confirm('Are you sure you want to delete this story?')) return;
        
        try {
            uiHandler.showLoading();
            await apiService.deleteStory(storyId);
            uiHandler.showSuccess('Story deleted successfully');
            
            // Refresh stories grid
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await this.loadUserStories(session.user.id);
            }
        } catch (error) {
            console.error('Error deleting story:', error);
            uiHandler.showError(error.message || 'Failed to delete story');
            throw error;
        } finally {
            uiHandler.hideLoading();
        }
    }
}; 
import { configPromise } from './config.js';
import { uiHandler } from './uiHandler.js';
import { supabasePromise } from './supabase.js';

export const auth = {
    async init() {
        const config = await configPromise;
        this.supabase = await supabasePromise;
        this.setupAuthListeners();
        this.checkInitialAuth();
    },

    setupAuthListeners() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.handleAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleAuthSignOut();
            }
        });
    },

    async checkInitialAuth() {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.handleAuthSuccess(session.user);
        }
    },

    async signUp(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    },

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    },

    async signInWithProvider(provider) {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error signing in with provider:', error);
            throw error;
        }
    },

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    async resetPassword(email) {
        try {
            const { data, error } = await this.supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    },

    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating password:', error);
            throw error;
        }
    },

    handleAuthSuccess(user) {
        uiHandler.updateUIForLoggedInUser(user);
    },

    handleAuthSignOut() {
        uiHandler.updateUIForLoggedOutUser();
    }
}; 
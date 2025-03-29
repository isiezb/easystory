import { config } from './config.js';
import { uiHandler } from './uiHandler.js';

export const auth = {
    init() {
        this.supabase = supabase.createClient(config.supabaseUrl, config.supabaseKey);
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
            uiHandler.showSuccess('Check your email for the confirmation link!');
        } catch (error) {
            uiHandler.showError(error.message);
        }
    },

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            this.handleAuthSuccess(data.user);
        } catch (error) {
            uiHandler.showError(error.message);
        }
    },

    async signInWithProvider(provider) {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider
            });
            if (error) throw error;
        } catch (error) {
            uiHandler.showError(error.message);
        }
    },

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            uiHandler.showError(error.message);
        }
    },

    handleAuthSuccess(user) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'flex';
        document.getElementById('userProfile').style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
        document.getElementById('myStoriesSection').style.display = 'block';
        uiHandler.showSuccess('Successfully authenticated!');
    },

    handleAuthSignOut() {
        document.getElementById('loginBtn').style.display = 'flex';
        document.getElementById('signupBtn').style.display = 'flex';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('userProfile').style.display = 'none';
        document.getElementById('myStoriesSection').style.display = 'none';
        document.getElementById('storiesGrid').innerHTML = '';
        uiHandler.showSuccess('Successfully logged out!');
    }
}; 
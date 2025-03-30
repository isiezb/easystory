// Auth service
const auth = {
    async init() {
        this.supabase = window.supabase;
        if (!this.supabase) {
            console.warn('Supabase not initialized. Auth services will not be available.');
            return;
        }
        this.setupAuthListeners();
        this.checkInitialAuth();
    },

    setupAuthListeners() {
        if (!this.supabase) return;
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.handleAuthSuccess(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.handleAuthSignOut();
            }
        });
    },

    async checkInitialAuth() {
        if (!this.supabase) return;
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.handleAuthSuccess(session.user);
        }
    },

    async signUp(email, password) {
        if (!this.supabase) throw new Error('Supabase not initialized');
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
        if (!this.supabase) throw new Error('Supabase not initialized');
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
        if (!this.supabase) throw new Error('Supabase not initialized');
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
        if (!this.supabase) throw new Error('Supabase not initialized');
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    async resetPassword(email) {
        if (!this.supabase) throw new Error('Supabase not initialized');
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
        if (!this.supabase) throw new Error('Supabase not initialized');
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
        if (window.uiHandler) {
            window.uiHandler.updateUIForLoggedInUser(user);
        }
    },

    handleAuthSignOut() {
        if (window.uiHandler) {
            window.uiHandler.updateUIForLoggedOutUser();
        }
    }
};

// Make auth globally available
window.auth = auth; 
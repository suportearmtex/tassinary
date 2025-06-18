import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'professional' | 'receptionist';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      setLoading: (loading: boolean) => set({ loading }),
      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true });
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw error;
          
          // Buscar dados do perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
            console.error('Profile error:', profileError);
            throw new Error('Erro ao carregar perfil do usuário');
          }
          
          set({ user: profile as User, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      signOut: async () => {
        try {
          set({ loading: true });
          await supabase.auth.signOut();
          set({ user: null, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      refreshUser: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            set({ user: null, loading: false });
            return;
          }
          
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!error && profile) {
            set({ user: profile as User, loading: false });
          } else {
            console.error('Error fetching profile:', error);
            set({ user: null, loading: false });
          }
        } catch (error) {
          console.error('Error refreshing user:', error);
          set({ user: null, loading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user, not loading state
    }
  )
);

// Initialize auth state when the app loads
let initialized = false;

const initializeAuth = async () => {
  if (initialized) return;
  initialized = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // User is logged in, fetch their profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!error && profile) {
        useAuthStore.setState({ user: profile as User, loading: false });
      } else {
        console.error('Error fetching profile on init:', error);
        useAuthStore.setState({ user: null, loading: false });
      }
    } else {
      // No session, user is not logged in
      useAuthStore.setState({ user: null, loading: false });
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    useAuthStore.setState({ user: null, loading: false });
  }
};

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session?.user?.id);
  
  if (event === 'SIGNED_IN' && session?.user) {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (!error && profile) {
        useAuthStore.setState({ user: profile as User, loading: false });
      } else {
        console.error('Error fetching profile on sign in:', error);
        useAuthStore.setState({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Error handling sign in:', error);
      useAuthStore.setState({ user: null, loading: false });
    }
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, loading: false });
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    // Token was refreshed, user is still logged in
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      // If we don't have user data, fetch it
      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!error && profile) {
          useAuthStore.setState({ user: profile as User, loading: false });
        }
      } catch (error) {
        console.error('Error fetching profile on token refresh:', error);
      }
    }
  }
});

// Initialize auth when the module loads
initializeAuth();
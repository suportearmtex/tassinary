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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      signIn: async (email: string, password: string) => {
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
        
        if (profileError) throw profileError;
        
        set({ user: profile as User });
      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
      refreshUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ user: null });
          return;
        }
        
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!error && profile) {
          set({ user: profile as User });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Inicializar o estado do usuário quando a aplicação carrega
supabase.auth.onAuthStateChange(async (event, session) => {
  const { refreshUser } = useAuthStore.getState();
  
  if (event === 'SIGNED_IN' && session?.user) {
    await refreshUser();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null });
  }
  
  useAuthStore.setState({ loading: false });
});
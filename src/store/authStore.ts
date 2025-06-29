import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  full_name?:string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'professional' | 'receptionist';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;

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
        
        // Buscar role do usuário usando RPC para evitar recursão RLS
        const { data: userRole, error: roleError } = await supabase
          .rpc('get_user_role');

        if (roleError) throw roleError;

        // Construir objeto do usuário com dados da auth e role do banco
        const userData = {
          id: data.user.id,
          email: data.user.email || '',
          role: userRole
        };

        set({ user: userData, loading: false });

      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null });
      },
      initializeAuth: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Buscar role do usuário usando RPC para evitar recursão RLS
            const { data: userRole, error: roleError } = await supabase
              .rpc('get_user_role');

            if (roleError) {
              console.error('Erro ao buscar role do usuário:', roleError);
              set({ user: null, loading: false });
              return;
            }

            // Construir objeto do usuário com dados da auth e role do banco
            const userData = {
              id: session.user.id,
              email: session.user.email || '',
              role: userRole
            };

            set({ user: userData, loading: false });
          } else {
            set({ user: null, loading: false });
          }
        } catch (error) {
          console.error('Erro ao inicializar auth:', error);
          set({ user: null, loading: false });

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
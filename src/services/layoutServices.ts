// src/services/layoutServices.ts
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Briefcase, 
  MessageCircle, 
  Settings, 
  Shield 
} from 'lucide-react';

// Types
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isNew?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'professional' | 'receptionist';
  avatar?: string;
}

// Hook para gerenciar estado do layout
export const useLayoutState = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();

  return {
    user,
    signOut,
    isDarkMode,
    toggleTheme,
    currentPath: location.pathname,
    navigate
  };
};

// Serviço para navegação
export const navigationService = {
  // Configuração base da navegação
  getBaseNavigation(): NavigationItem[] {
    return [
      { 
        name: 'Dashboard', 
        href: '/', 
        icon: BarChart3 
      },
      { 
        name: 'Agendamentos', 
        href: '/appointments', 
        icon: Calendar,
        badge: 3 // Exemplo: agendamentos pendentes
      },
      { 
        name: 'Clientes', 
        href: '/clients', 
        icon: Users 
      },
      { 
        name: 'Serviços', 
        href: '/services', 
        icon: Briefcase 
      },
      { 
        name: 'WhatsApp', 
        href: '/whatsapp', 
        icon: MessageCircle,
        isNew: true // Indica funcionalidade nova
      },
      { 
        name: 'Configurações', 
        href: '/settings', 
        icon: Settings 
      },
    ];
  },

  // Adicionar navegação específica para admin
  getNavigationForRole(role: string): NavigationItem[] {
    const baseNav = this.getBaseNavigation();
    
    if (role === 'admin') {
      // Adicionar antes das configurações
      baseNav.splice(-1, 0, {
        name: 'Gerenciar Usuários',
        href: '/users',
        icon: Shield
      });
    }

    return baseNav;
  },

  // Verificar se rota está ativa
  isRouteActive(currentPath: string, itemPath: string): boolean {
    if (itemPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(itemPath);
  }
};

// Serviço para autenticação
export const authService = {
  // Logout com navegação
  async handleSignOut(navigate: (path: string) => void, signOut: () => Promise<void>) {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Formatação do nome do usuário
  formatUserDisplayName(user: UserProfile): string {
    return user.full_name || user.email || 'Usuário';
  },

  // Formatação da role
  formatUserRole(role: string): string {
    const roleMap = {
      admin: 'Administrador',
      professional: 'Profissional', 
      receptionist: 'Recepcionista'
    };
    return roleMap[role as keyof typeof roleMap] || 'Usuário';
  },

  // Gerar iniciais do usuário
  getUserInitials(user: UserProfile): string {
    const name = user.full_name || user.email;
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }
};

// Serviço para tema
export const themeService = {
  // Aplicar tema no documento
  applyTheme(isDarkMode: boolean) {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Toggle com feedback
  async toggleWithFeedback(toggleTheme: () => void) {
    toggleTheme();
    // Opcional: adicionar feedback visual ou som
  }
};

// Serviço para responsividade
export const responsiveService = {
  // Breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  },

  // Verificar se é mobile
  isMobile(): boolean {
    return window.innerWidth < this.breakpoints.lg;
  },

  // Verificar se é tablet
  isTablet(): boolean {
    return window.innerWidth >= this.breakpoints.md && window.innerWidth < this.breakpoints.lg;
  },

  // Verificar se é desktop
  isDesktop(): boolean {
    return window.innerWidth >= this.breakpoints.lg;
  }
};

// Hook customizado que combina todos os services
export const useLayoutServices = () => {
  const layoutState = useLayoutState();
  
  return {
    ...layoutState,
    navigation: navigationService.getNavigationForRole(layoutState.user?.role || 'professional'),
    isRouteActive: (path: string) => navigationService.isRouteActive(layoutState.currentPath, path),
    handleSignOut: () => authService.handleSignOut(layoutState.navigate, layoutState.signOut),
    userDisplayName: layoutState.user ? authService.formatUserDisplayName(layoutState.user) : '',
    userRole: layoutState.user ? authService.formatUserRole(layoutState.user.role) : '',
    userInitials: layoutState.user ? authService.getUserInitials(layoutState.user) : '',
    toggleTheme: () => themeService.toggleWithFeedback(layoutState.toggleTheme),
    responsive: responsiveService
  };
};
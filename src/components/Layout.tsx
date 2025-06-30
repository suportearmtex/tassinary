// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { useLayoutServices } from '../services/layoutServices';

interface LayoutProps {
  children: React.ReactNode;
}

// Componente do Avatar do usuário
const UserAvatar: React.FC<{ initials: string; className?: string }> = ({ 
  initials, 
  className = "" 
}) => (
  <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold ${className}`}>
    {initials}
  </div>
);

// Componente de Badge para notificações
const NotificationBadge: React.FC<{ count?: number }> = ({ count }) => {
  if (!count || count === 0) return null;
  
  return (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
      {count > 9 ? '9+' : count}
    </span>
  );
};

// Componente de Item de Navegação
const NavigationItem: React.FC<{
  item: any;
  isActive: boolean;
  onClick?: () => void;
}> = ({ item, isActive, onClick }) => (
  <Link
    to={item.href}
    onClick={onClick}
    className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
    }`}
  >
    <div className="relative">
      <item.icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
      {/* <NotificationBadge count={item.badge} /> */}
    </div>
    <span className="flex-1">{item.name}</span>
    {/* {item.isNew && (
      <span className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
        Novo
      </span>
    )} */}
  </Link>
);

// Componente da Sidebar Desktop
const DesktopSidebar: React.FC<{
  navigation: any[];
  isRouteActive: (path: string) => boolean;
  userDisplayName: string;
  userRole: string;
  userInitials: string;
  onThemeToggle: () => void;
  onSignOut: () => void;
  isDarkMode: boolean;
}> = ({ 
  navigation, 
  isRouteActive, 
  userDisplayName, 
  userRole, 
  userInitials,
  onThemeToggle,
  onSignOut,
  isDarkMode 
}) => (
  <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <div className="flex flex-col flex-grow overflow-hidden">
      {/* Logo Section */}
      <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Agenda Pro
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gestão Inteligente
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto py-6">
        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => (
            <NavigationItem
              key={item.name}
              item={item}
              isActive={isRouteActive(item.href)}
            />
          ))}
        </nav>
      </div>

      {/* User Section */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <UserAvatar initials={userInitials} className="h-10 w-10 text-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userDisplayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userRole}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={onThemeToggle}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={onSignOut}
              className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Componente do Header Mobile
const MobileHeader: React.FC<{
  onMenuOpen: () => void;
  onThemeToggle: () => void;
  onSignOut: () => void;
  isDarkMode: boolean;
}> = ({ onMenuOpen, onThemeToggle, onSignOut, isDarkMode }) => (
  <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-gray-900/80">
    <div className="flex items-center justify-between">
      <button
        onClick={onMenuOpen}
        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Menu className="h-6 w-6" />
      </button>
      
      <div className="flex items-center space-x-2">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-md">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          Agenda Pro
        </span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={onThemeToggle}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        
        <button
          onClick={onSignOut}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
);

// Componente da Sidebar Mobile
const MobileSidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  navigation: any[];
  isRouteActive: (path: string) => boolean;
  userDisplayName: string;
  userRole: string;
  userInitials: string;
}> = ({ 
  isOpen, 
  onClose, 
  navigation, 
  isRouteActive, 
  userDisplayName, 
  userRole, 
  userInitials 
}) => (
  <>
    {/* Overlay */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
    )}
    
    {/* Sidebar */}
    <div className={`fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Agenda Pro
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gestão Inteligente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-2">
            {navigation.map((item) => (
              <NavigationItem
                key={item.name}
                item={item}
                isActive={isRouteActive(item.href)}
                onClick={onClose}
              />
            ))}
          </nav>
        </div>

        {/* User Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <UserAvatar initials={userInitials} className="h-12 w-12 text-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userDisplayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);

// Componente Principal do Layout
function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    user,
    isDarkMode,
    navigation,
    isRouteActive,
    handleSignOut,
    userDisplayName,
    userRole,
    userInitials,
    toggleTheme
  } = useLayoutServices();

  // Aplicar tema
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fechar sidebar no resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!user) {
    return null; // ou um componente de loading
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <DesktopSidebar
        navigation={navigation}
        isRouteActive={isRouteActive}
        userDisplayName={userDisplayName}
        userRole={userRole}
        userInitials={userInitials}
        onThemeToggle={toggleTheme}
        onSignOut={handleSignOut}
        isDarkMode={isDarkMode}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navigation={navigation}
        isRouteActive={isRouteActive}
        userDisplayName={userDisplayName}
        userRole={userRole}
        userInitials={userInitials}
      />

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Mobile Header */}
        <MobileHeader
          onMenuOpen={() => setIsSidebarOpen(true)}
          onThemeToggle={toggleTheme}
          onSignOut={handleSignOut}
          isDarkMode={isDarkMode}
        />

        {/* Page Content */}
        <main className="min-h-screen lg:min-h-screen">
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
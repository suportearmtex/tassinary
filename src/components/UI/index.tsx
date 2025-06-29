import React, { ReactNode } from 'react';
import { X, Search, Filter, Plus, TrendingUp } from 'lucide-react';

// Types
interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
}

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilter?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'vip';
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'vip';
  size?: 'sm' | 'md';
}

// Button Component
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  icon
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl focus:ring-blue-500',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
    outline: 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-blue-500',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl focus:ring-red-500'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

// Card Component
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md'
}) => {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50';
  const hoverClasses = hover ? 'hover:shadow-lg transition-all duration-300 hover:scale-[1.02]' : '';
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`${baseClasses} ${hoverClasses} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
};

// Modal Component
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'md'
}) => {
  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidths[maxWidth]}`}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeType,
  icon: Icon,
  gradient
}) => {
  return (
    <Card hover padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
          changeType === 'positive' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {change}
        </div>
      </div>
      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
        {label}
      </p>
    </Card>
  );
};

// Search Bar Component
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  onFilter
}) => {
  return (
    <Card padding="md">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
        {onFilter && (
          <Button variant="outline" onClick={onFilter} icon={<Filter className="h-5 w-5" />}>
            Filtros
          </Button>
        )}
      </div>
    </Card>
  );
};

// Page Header Component
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-3">
          {children}
        </div>
      )}
    </div>
  );
};

// Avatar Component
export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 'md',
  variant = 'default'
}) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base'
  };

  const variants = {
    default: 'bg-gradient-to-r from-blue-500 to-purple-500',
    vip: 'bg-gradient-to-r from-yellow-500 to-orange-500'
  };

  return (
    <div className={`${sizes[size]} rounded-xl ${variants[variant]} flex items-center justify-center text-white font-semibold shadow-lg`}>
      {initials}
    </div>
  );
};

// Badge Component
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  size = 'md'
}) => {
  const variants = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    vip: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

// Input Component
export const Input: React.FC<{
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  className?: string;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      />
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
  );
};

// Empty State Component
export const EmptyState: React.FC<{
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}> = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};

// Quick Action Button Component
export const QuickActionButton: React.FC<{
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}> = ({ icon, label, onClick, color }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center p-3 text-left bg-gradient-to-r ${color} rounded-xl hover:scale-[1.02] transition-all border border-opacity-50`}
    >
      <div className="mr-3">
        {icon}
      </div>
      <span className="text-sm font-medium">
        {label}
      </span>
    </button>
  );
};

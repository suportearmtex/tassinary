import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useIsMobile, usePrefersReducedMotion } from '../../hooks/useResponsive';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
}

interface ModalContextType {
  onClose: () => void;
}

const ModalContext = React.createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = React.useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a Modal component');
  }
  return context;
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
}) => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Gerenciar foco para acessibilidade
  useEffect(() => {
    if (isOpen) {
      // Salvar elemento ativo atual
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focar no modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
    } else {
      // Restaurar overflow do body
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Restaurar foco
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Gerenciar tecla Escape
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Trap focus dentro do modal
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose, closeOnOverlayClick]
  );

  const getSizeClasses = () => {
    if (isMobile) {
      return 'mx-4 my-8 w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)]';
    }

    switch (size) {
      case 'sm':
        return 'max-w-sm w-full mx-4';
      case 'md':
        return 'max-w-md w-full mx-4';
      case 'lg':
        return 'max-w-lg w-full mx-4';
      case 'xl':
        return 'max-w-xl w-full mx-4';
      case 'full':
        return 'max-w-full w-full h-full m-0';
      default:
        return 'max-w-md w-full mx-4';
    }
  };

  const getAnimationClasses = () => {
    if (prefersReducedMotion) {
      return '';
    }
    
    return isMobile 
      ? 'animate-slide-up' 
      : 'animate-scale-in';
  };

  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ onClose }}>
      <div 
        className={`fixed inset-0 z-modal flex items-center justify-center ${overlayClassName}`}
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Overlay */}
        <div 
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
            prefersReducedMotion ? '' : 'animate-fade-in'
          }`}
          aria-hidden="true"
        />
        
        {/* Modal Content */}
        <div
          ref={modalRef}
          className={`
            relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
            ${getSizeClasses()}
            ${getAnimationClasses()}
            ${isMobile ? 'max-h-[calc(100dvh-4rem)] overflow-y-auto' : 'max-h-[90vh] overflow-y-auto'}
            ${className}
          `}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              {title && (
                <h2 
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4"
                >
                  {title}
                </h2>
              )}
              
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300
                    rounded-md transition-colors duration-200 touch-target focus-accessible
                    hover:bg-gray-100 dark:hover:bg-gray-700
                  "
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  );
};

// Componentes compostos para facilitar o uso
const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`mb-6 ${className}`}>
    {children}
  </div>
);

const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end ${className}`}>
    {children}
  </div>
);

// Botões padronizados para o modal
const ModalButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}> = ({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  type = 'button',
  className = '',
}) => {
  const baseClasses = `
    w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200
    focus-accessible touch-target disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `;

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Hook para controlar estado do modal
export const useModalState = (initialOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

// Hook para modal de confirmação
export const useConfirmModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }>({
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
  });

  const showConfirm = useCallback((newConfig: typeof config) => {
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ConfirmModal = useCallback(() => (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={config.title}
      size="sm"
    >
      <ModalBody>
        <p className="text-gray-600 dark:text-gray-400">
          {config.message}
        </p>
      </ModalBody>
      
      <ModalFooter>
        <ModalButton
          variant="secondary"
          onClick={close}
        >
          {config.cancelText}
        </ModalButton>
        <ModalButton
          variant={config.variant || 'primary'}
          onClick={() => {
            config.onConfirm();
            close();
          }}
        >
          {config.confirmText}
        </ModalButton>
      </ModalFooter>
    </Modal>
  ), [isOpen, close, config]);

  return {
    showConfirm,
    ConfirmModal,
  };
};

export { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton };
export default Modal;
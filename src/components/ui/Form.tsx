import React, { forwardRef, useId } from 'react';
import { Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useResponsive';

// Base Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  variant?: 'default' | 'filled' | 'outline';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    isLoading = false,
    variant = 'default',
    className = '',
    id,
    ...props
  }, ref) => {
    const isMobile = useIsMobile();
    const autoId = useId();
    const inputId = id || autoId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const getVariantClasses = () => {
      switch (variant) {
        case 'filled':
          return 'bg-gray-50 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-primary-500';
        case 'outline':
          return 'bg-transparent border-gray-300 dark:border-gray-600 focus:border-primary-500';
        default:
          return 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-primary-500';
      }
    };

    const inputClasses = `
      w-full rounded-md border px-3 py-2 text-sm transition-all duration-200
      placeholder:text-gray-500 dark:placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
      disabled:cursor-not-allowed disabled:opacity-50
      dark:text-white
      ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : getVariantClasses()}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || isLoading ? 'pr-10' : ''}
      ${isMobile ? 'text-base' : 'text-sm'} /* Prevent zoom on iOS */
      ${className}
    `;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
          
          {(rightIcon || isLoading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div id={errorId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Password Input Component
interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const togglePassword = () => setShowPassword(!showPassword);

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={togglePassword}
            className="touch-target hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    helperText,
    resize = 'vertical',
    className = '',
    id,
    ...props
  }, ref) => {
    const isMobile = useIsMobile();
    const autoId = useId();
    const textareaId = id || autoId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const textareaClasses = `
      w-full rounded-md border px-3 py-2 text-sm transition-all duration-200
      placeholder:text-gray-500 dark:placeholder:text-gray-400
      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
      disabled:cursor-not-allowed disabled:opacity-50
      dark:text-white dark:bg-gray-900
      ${error 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
        : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 bg-white dark:bg-gray-900'
      }
      ${resize === 'none' ? 'resize-none' : ''}
      ${resize === 'vertical' ? 'resize-y' : ''}
      ${resize === 'horizontal' ? 'resize-x' : ''}
      ${resize === 'both' ? 'resize' : ''}
      ${isMobile ? 'text-base' : 'text-sm'}
      ${className}
    `;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        
        {error && (
          <div id={errorId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    helperText,
    placeholder,
    options,
    className = '',
    id,
    ...props
  }, ref) => {
    const isMobile = useIsMobile();
    const autoId = useId();
    const selectId = id || autoId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const selectClasses = `
      w-full rounded-md border px-3 py-2 text-sm transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
      disabled:cursor-not-allowed disabled:opacity-50
      dark:text-white dark:bg-gray-900
      appearance-none bg-white dark:bg-gray-900
      ${error 
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
        : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
      }
      ${isMobile ? 'text-base' : 'text-sm'}
      ${className}
    `;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {error && (
          <div id={errorId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Checkbox Component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    label,
    description,
    error,
    indeterminate = false,
    className = '',
    id,
    ...props
  }, ref) => {
    const autoId = useId();
    const checkboxId = id || autoId;
    const errorId = `${checkboxId}-error`;
    const descriptionId = `${checkboxId}-description`;

    React.useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        ref.current.indeterminate = indeterminate;
      }
    }, [indeterminate, ref]);

    const checkboxClasses = `
      h-4 w-4 rounded border-2 transition-all duration-200 touch-target
      focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
      ${error 
        ? 'border-red-500 text-red-600 focus:ring-red-500/20' 
        : 'border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/20'
      }
      ${props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      ${className}
    `;

    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className={checkboxClasses}
              aria-describedby={error ? errorId : description ? descriptionId : undefined}
              aria-invalid={error ? 'true' : 'false'}
              {...props}
            />
          </div>
          
          {(label || description) && (
            <div className="flex-1 min-w-0">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {label}
                  {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              
              {description && (
                <p id={descriptionId} className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div id={errorId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio Group Component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  error,
  direction = 'vertical',
  disabled = false,
}) => {
  const isMobile = useIsMobile();
  const groupId = useId();
  const errorId = `${groupId}-error`;

  const containerClasses = `
    space-y-3
    ${direction === 'horizontal' && !isMobile ? 'sm:flex sm:space-y-0 sm:space-x-6' : ''}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </legend>
        </fieldset>
      )}
      
      <div className={containerClasses} role="radiogroup" aria-describedby={error ? errorId : undefined}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const isChecked = value === option.value;
          const isDisabled = disabled || option.disabled;
          
          return (
            <div key={option.value} className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={isDisabled}
                  className={`
                    h-4 w-4 border-2 transition-all duration-200 touch-target
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1
                    ${error 
                      ? 'border-red-500 text-red-600 focus:ring-red-500/20' 
                      : 'border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500/20'
                    }
                    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                  aria-describedby={option.description ? `${optionId}-description` : undefined}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={optionId}
                  className={`block text-sm font-medium ${
                    isDisabled 
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'text-gray-700 dark:text-gray-300 cursor-pointer'
                  }`}
                >
                  {option.label}
                </label>
                
                {option.description && (
                  <p 
                    id={`${optionId}-description`}
                    className={`text-sm mt-1 ${
                      isDisabled 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {error && (
        <div id={errorId} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Form Field Wrapper
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ children, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
};

// Form Group for horizontal layouts
interface FormGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({ 
  children, 
  columns = 1, 
  className = '' 
}) => {
  const isMobile = useIsMobile();
  
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : gridClasses[columns]} ${className}`}>
      {children}
    </div>
  );
};

// Submit Button Component
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({
    children,
    isLoading = false,
    loadingText = 'Carregando...',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled,
    className = '',
    ...props
  }, ref) => {
    const isMobile = useIsMobile();

    const baseClasses = `
      inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 touch-target
      disabled:cursor-not-allowed disabled:opacity-50
      ${fullWidth || isMobile ? 'w-full' : ''}
    `;

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type="submit"
        disabled={isDisabled}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? loadingText : children}
      </button>
    );
  }
);

SubmitButton.displayName = 'SubmitButton';

// Form Validation Hook
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => string | undefined>>
) => {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when value changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const setFieldTouched = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validateField = (field: keyof T) => {
    const rule = validationRules[field];
    if (rule) {
      const error = rule(values[field]);
      setErrors(prev => ({ ...prev, [field]: error }));
      return !error;
    }
    return true;
  };

  const validateAll = () => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field as keyof T];
      if (rule) {
        const error = rule(values[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, field) => {
      acc[field as keyof T] = true;
      return acc;
    }, {} as Partial<Record<keyof T, boolean>>));

    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched: setFieldTouched,
    validateField,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
};

// Phone Input Component
interface PhoneInputProps extends Omit<InputProps, 'type'> {
  country?: string;
  onlyCountries?: string[];
  preferredCountries?: string[];
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    country = 'br',
    onlyCountries = ['br', 'us'],
    preferredCountries = ['br'],
    ...props
  }, ref) => {
    // Simplified phone input - in a real app, you'd use react-phone-input-2 or similar
    return (
      <Input
        ref={ref}
        type="tel"
        placeholder="+55 (11) 99999-9999"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

// File Input Component
interface FileInputProps extends Omit<InputProps, 'type'> {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onFileChange?: (files: FileList | null) => void;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({
    accept,
    multiple = false,
    maxSize = 5,
    onFileChange,
    error,
    ...props
  }, ref) => {
    const [fileError, setFileError] = React.useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      setFileError('');

      if (files && maxSize) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].size > maxSize * 1024 * 1024) {
            setFileError(`Arquivo muito grande. Máximo ${maxSize}MB.`);
            return;
          }
        }
      }

      onFileChange?.(files);
    };

    return (
      <Input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        error={error || fileError}
        {...props}
      />
    );
  }
);

FileInput.displayName = 'FileInput';

// Search Input Component
interface SearchInputProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void;
  debounceMs?: number;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    onSearch,
    debounceMs = 300,
    ...props
  }, ref) => {
    const [searchValue, setSearchValue] = React.useState('');
    const debounceRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onSearch?.(searchValue);
      }, debounceMs);

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, [searchValue, debounceMs, onSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
      props.onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        placeholder="Buscar..."
        value={searchValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Form Container Component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  loading?: boolean;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ children, loading = false, className = '', ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={`space-y-6 ${loading ? 'pointer-events-none opacity-60' : ''} ${className}`}
        {...props}
      >
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';
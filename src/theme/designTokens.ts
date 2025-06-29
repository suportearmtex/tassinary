/**
 * Sistema de Design Tokens para consistência responsiva
 * Baseado nas melhores práticas de 2024-2025
 */

// Breakpoints padronizados
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1600px',
} as const;

// Espaçamento fluido usando clamp()
export const spacing = {
  // Espaçamentos fixos
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',

  // Espaçamentos fluidos
  'fluid-xs': 'clamp(0.25rem, 1vw, 0.5rem)',
  'fluid-sm': 'clamp(0.5rem, 2vw, 1rem)',
  'fluid-md': 'clamp(1rem, 3vw, 1.5rem)',
  'fluid-lg': 'clamp(1.5rem, 4vw, 2rem)',
  'fluid-xl': 'clamp(2rem, 5vw, 3rem)',
  'fluid-2xl': 'clamp(3rem, 8vw, 5rem)',
  'fluid-3xl': 'clamp(4rem, 10vw, 6rem)',

  // Safe areas para dispositivos com notch
  'safe-top': 'env(safe-area-inset-top)',
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-left': 'env(safe-area-inset-left)',
  'safe-right': 'env(safe-area-inset-right)',
} as const;

// Tipografia responsiva
export const fontSize = {
  xs: {
    fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
    lineHeight: '1.4',
    letterSpacing: '0.025em',
  },
  sm: {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    lineHeight: '1.5',
    letterSpacing: '0.02em',
  },
  base: {
    fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
    lineHeight: '1.6',
    letterSpacing: '0.01em',
  },
  lg: {
    fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
    lineHeight: '1.6',
    letterSpacing: '0.01em',
  },
  xl: {
    fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
    lineHeight: '1.5',
    letterSpacing: '0',
  },
  '2xl': {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    lineHeight: '1.4',
    letterSpacing: '-0.01em',
  },
  '3xl': {
    fontSize: 'clamp(1.875rem, 5vw, 2.5rem)',
    lineHeight: '1.3',
    letterSpacing: '-0.02em',
  },
  '4xl': {
    fontSize: 'clamp(2.25rem, 6vw, 3rem)',
    lineHeight: '1.2',
    letterSpacing: '-0.03em',
  },
  '5xl': {
    fontSize: 'clamp(3rem, 8vw, 4rem)',
    lineHeight: '1.1',
    letterSpacing: '-0.04em',
  },
} as const;

// Cores baseadas em design tokens acessíveis
export const colors = {
  // Cores primárias - azul
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Cores neutras otimizadas para acessibilidade
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
    1000: '#000000',
  },

  // Cores semânticas
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
} as const;

// Border radius fluido
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  default: 'clamp(0.25rem, 1vw, 0.375rem)',
  md: 'clamp(0.375rem, 1.5vw, 0.5rem)',
  lg: 'clamp(0.5rem, 2vw, 0.75rem)',
  xl: 'clamp(0.75rem, 2.5vw, 1rem)',
  '2xl': 'clamp(1rem, 3vw, 1.5rem)',
  '3xl': 'clamp(1.5rem, 4vw, 2rem)',
  full: '9999px',
} as const;

// Sombras responsivas
export const boxShadow = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Sombras específicas para modo escuro
  'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  'dark-default': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
  'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
} as const;

// Z-index organizados por camadas
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Timing de animações
export const timing = {
  // Durações baseadas em Material Design
  fastest: '100ms',
  faster: '150ms',
  fast: '200ms',
  normal: '300ms',
  slow: '400ms',
  slower: '500ms',
  slowest: '750ms',

  // Easing functions
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  
  // Easing específico para mobile
  mobileBounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// Configurações específicas para touch
export const touch = {
  // Tamanhos mínimos de touch targets (WCAG 2.2)
  minTarget: '44px',
  recommendedTarget: '48px',
  
  // Espaçamento entre touch targets
  spacing: '8px',
  
  // Feedback visual para touch
  tapHighlight: 'rgba(59, 130, 246, 0.1)',
} as const;

// Container queries (quando suportado)
export const containerQueries = {
  xs: '20rem',  // 320px
  sm: '24rem',  // 384px
  md: '28rem',  // 448px
  lg: '32rem',  // 512px
  xl: '36rem',  // 576px
  '2xl': '42rem', // 672px
  '3xl': '48rem', // 768px
  '4xl': '56rem', // 896px
  '5xl': '64rem', // 1024px
  '6xl': '72rem', // 1152px
  '7xl': '80rem', // 1280px
} as const;

// Viewport units modernas
export const viewport = {
  // Dynamic viewport
  'dvh-full': '100dvh',
  'dvw-full': '100dvw',
  
  // Large viewport
  'lvh-full': '100lvh',
  'lvw-full': '100lvw',
  
  // Small viewport
  'svh-full': '100svh',
  'svw-full': '100svw',
} as const;

// Configurações específicas para acessibilidade
export const accessibility = {
  // Contraste mínimo WCAG AA
  contrastRatios: {
    normal: 4.5,
    large: 3,
    enhanced: 7, // AAA
  },
  
  // Focus styles
  focusRing: {
    width: '2px',
    color: colors.primary[500],
    offset: '2px',
    style: 'solid',
  },
  
  // Reduced motion
  reducedMotion: {
    duration: '0.01ms',
    easing: 'linear',
  },
} as const;

// Grid system responsivo
export const grid = {
  columns: {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: '10',
    11: '11',
    12: '12',
  },
  
  gaps: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    
    // Gaps fluidos
    'fluid-sm': 'clamp(0.5rem, 2vw, 1rem)',
    'fluid-md': 'clamp(1rem, 3vw, 1.5rem)',
    'fluid-lg': 'clamp(1.5rem, 4vw, 2rem)',
  },
} as const;

// Configurações específicas para diferentes dispositivos
export const deviceSpecific = {
  mobile: {
    maxWidth: '767px',
    padding: spacing[4],
    fontSize: fontSize.sm,
    touchTarget: touch.recommendedTarget,
  },
  
  tablet: {
    minWidth: '768px',
    maxWidth: '1023px',
    padding: spacing[6],
    fontSize: fontSize.base,
    touchTarget: touch.minTarget,
  },
  
  desktop: {
    minWidth: '1024px',
    padding: spacing[8],
    fontSize: fontSize.base,
    hoverEffects: true,
  },
} as const;

// Utilitários para criar CSS responsivo
export const createResponsiveValue = (
  values: Partial<Record<keyof typeof breakpoints, string>>
) => {
  const entries = Object.entries(values);
  if (entries.length === 1) {
    return entries[0][1];
  }
  
  return entries
    .map(([breakpoint, value], index) => {
      if (index === 0) return value;
      return `${breakpoint}:${value}`;
    })
    .join(' ');
};

// CSS custom properties para temas dinâmicos
export const cssVariables = {
  light: {
    '--color-background': colors.neutral[0],
    '--color-foreground': colors.neutral[900],
    '--color-primary': colors.primary[600],
    '--color-primary-foreground': colors.neutral[0],
    '--color-secondary': colors.neutral[100],
    '--color-secondary-foreground': colors.neutral[900],
    '--color-muted': colors.neutral[100],
    '--color-muted-foreground': colors.neutral[500],
    '--color-accent': colors.neutral[100],
    '--color-accent-foreground': colors.neutral[900],
    '--color-destructive': colors.error[500],
    '--color-destructive-foreground': colors.neutral[0],
    '--color-border': colors.neutral[200],
    '--color-input': colors.neutral[200],
    '--color-ring': colors.primary[600],
    '--shadow-color': 'rgba(0, 0, 0, 0.1)',
  },
  
  dark: {
    '--color-background': colors.neutral[950],
    '--color-foreground': colors.neutral[50],
    '--color-primary': colors.primary[500],
    '--color-primary-foreground': colors.neutral[900],
    '--color-secondary': colors.neutral[800],
    '--color-secondary-foreground': colors.neutral[50],
    '--color-muted': colors.neutral[800],
    '--color-muted-foreground': colors.neutral[400],
    '--color-accent': colors.neutral[800],
    '--color-accent-foreground': colors.neutral[50],
    '--color-destructive': colors.error[400],
    '--color-destructive-foreground': colors.neutral[50],
    '--color-border': colors.neutral[800],
    '--color-input': colors.neutral[800],
    '--color-ring': colors.primary[400],
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
  },
} as const;

// Componentes base responsivos
export const components = {
  button: {
    base: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
    variants: {
      size: {
        sm: 'h-9 px-3 rounded-md',
        md: 'h-10 py-2 px-4',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline text-primary',
      },
    },
  },
  
  input: {
    base: 'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  },
  
  card: {
    base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
    header: 'flex flex-col space-y-1.5 p-6',
    content: 'p-6 pt-0',
    footer: 'flex items-center p-6 pt-0',
  },
  
  modal: {
    overlay: 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
    content: 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full',
    header: 'flex flex-col space-y-1.5 text-center sm:text-left',
    footer: 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
  },
} as const;

// Configurações de build para otimização
export const buildConfig = {
  // Assets que devem ser inlineados
  inlineAssets: {
    maxSize: 4096, // 4KB
    extensions: ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'],
  },
  
  // Chunks para code splitting
  chunks: {
    vendor: ['react', 'react-dom'],
    ui: ['lucide-react'],
    utils: ['date-fns', 'clsx'],
    calendar: ['@fullcalendar/core', '@fullcalendar/react'],
  },
  
  // Formatos de imagem por prioridade
  imageFormats: ['avif', 'webp', 'jpg'],
  
  // Configurações de responsive images
  responsiveImages: {
    breakpoints: [400, 800, 1200, 1600],
    formats: ['avif', 'webp', 'jpg'],
    quality: {
      avif: 50,
      webp: 75,
      jpg: 80,
    },
  },
} as const;

// Export consolidado
export const designTokens = {
  breakpoints,
  spacing,
  fontSize,
  colors,
  borderRadius,
  boxShadow,
  zIndex,
  timing,
  touch,
  containerQueries,
  viewport,
  accessibility,
  grid,
  deviceSpecific,
  cssVariables,
  components,
  buildConfig,
  createResponsiveValue,
} as const;

export default designTokens;
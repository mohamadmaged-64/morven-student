/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
  50: '#c9e6d9',
  100: '#b0dac4',
  200: '#7bb99c',
  300: '#3c8568',
  400: '#147e57',
  500: '#047851',
  600: '#076044',
  700: '#064e39',
  800: '#054c38',
  900: '#013527',
},
        dark: {
          bg: '#0a0a0f',
          card: '#12121a',
          border: '#1e1e2e',
          hover: '#1a1a2e',
          surface: '#16161f',
        },
        light: {
          bg: '#f8f9fc',
          card: '#ffffff',
          border: '#e8eaef',
          hover: '#f0f1f5',
          surface: '#f1f3f8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.05), 0 12px 24px rgba(0,0,0,.05)',
        'card-dark': '0 0 0 1px rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.2), 0 12px 24px rgba(0,0,0,.3)',
        'glow': '0 0 20px rgba(3, 92, 63, 0.18)',
        'elevated': '0 20px 60px -15px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

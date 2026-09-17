/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./projects/**/*.{html,ts,scss}",
    "./projects/**/*.component.{html,ts}"
  ],
  theme: {
    extend: {
      // ── Hampiee Design System ──────────────────────────────────────────────
      colors: {
        navy: {
          50:  '#eeeef7',
          100: '#d0d0ec',
          200: '#aeaedf',
          300: '#8888cf',
          400: '#6b6bbf',
          500: '#5050ae',
          600: '#3b3b9c',
          700: '#282885',
          800: '#1a1a6a',
          900: '#1A1A2E',   // ← Hampiee Deep Navy (PRIMARY)
          DEFAULT: '#1A1A2E',
        },
        gold: {
          50:  '#fdf9f0',
          100: '#f9f0d9',
          200: '#f5e4b1',
          300: '#edd184',
          400: '#e5bb5a',
          500: '#C9A96E',   // ← Hampiee Gold (ACCENT)
          600: '#b8893a',
          700: '#9a6d20',
          800: '#7d5519',
          900: '#5e3f13',
          DEFAULT: '#C9A96E',
        },
        ceylon: {
          50:  '#edf7f2',
          100: '#c9ebda',
          200: '#9dd9be',
          300: '#68c49e',
          400: '#3daf81',
          500: '#2D6A4F',   // ← Ceylon Green (ACCENT 2)
          600: '#235438',
          700: '#1a4029',
          800: '#122c1c',
          900: '#091a10',
          DEFAULT: '#2D6A4F',
        },
        cream: {
          50:  '#FAFAF8',   // ← Warm White surface
          100: '#F5F5F0',
          200: '#EEEEEA',
          DEFAULT: '#FAFAF8',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      fontSize: {
        'hero':    ['clamp(3rem, 6vw, 5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.2' }],
        'title':   ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1.3' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'card': '1.25rem',
        'pill': '50rem',
      },
      boxShadow: {
        'card':   '0 4px 24px -4px rgba(26, 26, 46, 0.12)',
        'card-hover': '0 12px 40px -8px rgba(26, 26, 46, 0.25)',
        'gold':   '0 4px 20px -4px rgba(201, 169, 110, 0.4)',
        'float':  '0 20px 60px -12px rgba(26, 26, 46, 0.4)',
      },
      backgroundImage: {
        'gradient-gold':   'linear-gradient(135deg, #C9A96E 0%, #e5bb5a 100%)',
        'gradient-navy':   'linear-gradient(135deg, #1A1A2E 0%, #282885 100%)',
        'gradient-ceylon': 'linear-gradient(135deg, #2D6A4F 0%, #3daf81 100%)',
        'gradient-hero':   'linear-gradient(to bottom, rgba(26,26,46,0.3) 0%, rgba(26,26,46,0.7) 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-in-out',
        'slide-up':   'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'float':      'float 3s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

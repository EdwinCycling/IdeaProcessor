/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          primary: '#A855F7', // Light Purple
          dark: '#0A0A0A',
          panel: '#161616',
        },
        neon: {
          cyan: '#00f3ff',
          purple: '#bc13fe',
          green: '#0aff0a',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'firework': 'firework 2s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        firework: {
          '0%': { transform: 'translate(var(--x), var(--initialY))', width: 'var(--initialSize)', opacity: '1' },
          '50%': { width: '0.5vmin', opacity: '1' },
          '100%': { width: 'var(--finalSize)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}

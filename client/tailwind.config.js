/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#feffdf',
          card: '#ffe79a',
          elevated: '#ffd875',
          subtle: '#fff9cf',
        },
        primary: {
          50: '#fff9ed',
          100: '#ffefd5',
          400: '#ffbc73',
          500: '#ffa952',
          600: '#e58e39',
          700: '#cc7320',
        },
        accent: {
          violet: '#ffa952',
          blue: '#ffa952',
          cyan: '#ffa952',
          emerald: '#10B981',
          amber: '#ffa952',
          rose: '#ef5a5a'
        },
        palette: {
          first: '#feffdf',
          second: '#ffe79a',
          third: '#ffa952',
          fourth: '#ef5a5a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}


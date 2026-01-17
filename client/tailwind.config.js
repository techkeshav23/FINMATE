/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Google Blue - Primary brand color
        primary: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8', // Google Blue
          600: '#1967d2',
          700: '#185abc',
          800: '#174ea6',
          900: '#1a4796',
        },
        // Clean neutrals - Google/Microsoft style
        gray: {
          50: '#f8f9fa',   // Background
          100: '#f1f3f4',  // Hover states
          200: '#e8eaed',  // Borders light
          300: '#dadce0',  // Borders
          400: '#bdc1c6',  // Disabled text
          500: '#9aa0a6',  // Secondary text
          600: '#80868b',  // Placeholder
          700: '#5f6368',  // Body text
          800: '#3c4043',  // Strong text
          900: '#202124',  // Headings
        },
        // Semantic colors - Google style
        success: '#34a853', // Google Green
        warning: '#fbbc04', // Google Yellow
        danger: '#ea4335',  // Google Red
        info: '#4285f4',    // Google Blue alt
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(60, 64, 67, 0.1), 0 1px 3px 1px rgba(60, 64, 67, 0.08)',
        'md': '0 1px 3px 0 rgba(60, 64, 67, 0.15), 0 4px 8px 3px rgba(60, 64, 67, 0.1)',
        'lg': '0 3px 6px 0 rgba(60, 64, 67, 0.15), 0 8px 16px 6px rgba(60, 64, 67, 0.1)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}

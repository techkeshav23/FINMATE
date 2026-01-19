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
        // Vendor Theme - Warm Amber/Orange
        primary: {
          50: '#fffbeb',   // Lightest amber
          100: '#fef3c7',  // Light amber
          200: '#fde68a',  // Soft amber
          300: '#fcd34d',  // Medium amber
          400: '#fbbf24',  // Bright amber
          500: '#f59e0b',  // Primary amber
          600: '#d97706',  // Deep amber
          700: '#b45309',  // Dark amber
          800: '#92400e',  // Darker amber
          900: '#78350f',  // Deepest amber
        },
        // Clean neutrals
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
        // Semantic colors - Vendor friendly
        success: '#16a34a', // Green for profit
        warning: '#eab308', // Yellow for caution
        danger: '#dc2626',  // Red for loss/alerts
        info: '#f59e0b',    // Amber for info
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

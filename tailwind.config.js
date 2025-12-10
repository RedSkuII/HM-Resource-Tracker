/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Ensure Guildgamesh theme colors are always included in build
    'bg-guildgamesh-50', 'bg-guildgamesh-100', 'bg-guildgamesh-200', 'bg-guildgamesh-300',
    'bg-guildgamesh-400', 'bg-guildgamesh-500', 'bg-guildgamesh-600', 'bg-guildgamesh-700',
    'bg-guildgamesh-800', 'bg-guildgamesh-900',
    'text-guildgamesh-50', 'text-guildgamesh-100', 'text-guildgamesh-200', 'text-guildgamesh-300',
    'text-guildgamesh-400', 'text-guildgamesh-500', 'text-guildgamesh-600', 'text-guildgamesh-700',
    'text-guildgamesh-800', 'text-guildgamesh-900',
    'border-guildgamesh-50', 'border-guildgamesh-100', 'border-guildgamesh-200', 'border-guildgamesh-300',
    'border-guildgamesh-400', 'border-guildgamesh-500', 'border-guildgamesh-600', 'border-guildgamesh-700',
    'border-guildgamesh-800', 'border-guildgamesh-900',
    'hover:bg-guildgamesh-50', 'hover:bg-guildgamesh-100', 'hover:bg-guildgamesh-200', 'hover:bg-guildgamesh-300',
    'hover:bg-guildgamesh-400', 'hover:bg-guildgamesh-500', 'hover:bg-guildgamesh-600', 'hover:bg-guildgamesh-700',
    'hover:bg-guildgamesh-800', 'hover:bg-guildgamesh-900',
    'hover:text-guildgamesh-50', 'hover:text-guildgamesh-100', 'hover:text-guildgamesh-200', 'hover:text-guildgamesh-300',
    'hover:text-guildgamesh-400', 'hover:text-guildgamesh-500', 'hover:text-guildgamesh-600', 'hover:text-guildgamesh-700',
    'hover:text-guildgamesh-800', 'hover:text-guildgamesh-900',
    'dark:bg-guildgamesh-50', 'dark:bg-guildgamesh-100', 'dark:bg-guildgamesh-200', 'dark:bg-guildgamesh-300',
    'dark:bg-guildgamesh-400', 'dark:bg-guildgamesh-500', 'dark:bg-guildgamesh-600', 'dark:bg-guildgamesh-700',
    'dark:bg-guildgamesh-800', 'dark:bg-guildgamesh-900',
    'dark:text-guildgamesh-50', 'dark:text-guildgamesh-100', 'dark:text-guildgamesh-200', 'dark:text-guildgamesh-300',
    'dark:text-guildgamesh-400', 'dark:text-guildgamesh-500', 'dark:text-guildgamesh-600', 'dark:text-guildgamesh-700',
    'dark:text-guildgamesh-800', 'dark:text-guildgamesh-900',
    'dark:border-guildgamesh-50', 'dark:border-guildgamesh-100', 'dark:border-guildgamesh-200', 'dark:border-guildgamesh-300',
    'dark:border-guildgamesh-400', 'dark:border-guildgamesh-500', 'dark:border-guildgamesh-600', 'dark:border-guildgamesh-700',
    'dark:border-guildgamesh-800', 'dark:border-guildgamesh-900',
    'dark:hover:bg-guildgamesh-50', 'dark:hover:bg-guildgamesh-100', 'dark:hover:bg-guildgamesh-200', 'dark:hover:bg-guildgamesh-300',
    'dark:hover:bg-guildgamesh-400', 'dark:hover:bg-guildgamesh-500', 'dark:hover:bg-guildgamesh-600', 'dark:hover:bg-guildgamesh-700',
    'dark:hover:bg-guildgamesh-800', 'dark:hover:bg-guildgamesh-900',
    // Stone colors for dark mode backgrounds
    'bg-stone-700', 'bg-stone-800', 'bg-stone-900', 'bg-stone-950',
    'dark:bg-stone-700', 'dark:bg-stone-800', 'dark:bg-stone-900', 'dark:bg-stone-950',
    'hover:bg-stone-700', 'dark:hover:bg-stone-700',
    'border-stone-700', 'border-stone-800', 'dark:border-stone-700', 'dark:border-stone-800',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Guildgamesh brand colors inspired by desert/sand theme
        primary: {
          50: '#fff7ed',   // Lightest sand
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // Main orange
          600: '#ea580c',  // Deep orange
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',  // Darkest orange
        },
        guildgamesh: {
          50: '#faf7f2',   // Lightest beige
          100: '#f5e6d3',  // Very light sand
          200: '#ead5b8',  // Light sand
          300: '#e0c29d',  // Sand
          400: '#d4a574',  // Main Guildgamesh sand
          500: '#c49564',  // Medium sand
          600: '#b48554',  // Darker sand
          700: '#8b6f47',  // Dark tan
          800: '#6b5339',  // Very dark tan
          900: '#4a3a2a',  // Darkest brown
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',  // Teal accent
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        sand: {
          50: '#fefce8',   // Very light sand
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',  // Golden sand
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',  // Dark sand
        },
        desert: {
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
        },
        navy: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',  // Dark teal/navy from logo
          900: '#0c4a6e',
          950: '#082f49',  // Darkest navy
        }
      },
      backgroundImage: {
        'gradient-desert': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
        'gradient-sand': 'linear-gradient(to bottom, #fef9c3, #fde047, #facc15)',
        'gradient-dune': 'linear-gradient(180deg, #f97316 0%, #ea580c 25%, #fb923c 50%, #fdba74 75%, #fed7aa 100%)',
      }
    },
  },
  plugins: [],
} 
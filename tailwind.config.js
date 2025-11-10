/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#008ECC',
        'primary-dark': '#0070a8',
        secondary: '#212844',
        'light-bg': '#F3F9FB',
        'medium-bg': '#F5F5F5',
        'dark-text': '#222222',
        'medium-text': '#666666',
        'light-text': '#FFFFFF',
        success: '#249B3E',
        'brand-yellow': '#FFC915',
        'brand-orange': '#FF6900',
        'footer-bg': '#212844',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

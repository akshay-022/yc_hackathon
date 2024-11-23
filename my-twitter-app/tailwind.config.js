/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'black-primary': '#1a1a1a',
        'black-secondary': '#2e2e2e',
        'black-tertiary': '#3c3c3c',
        'accent': '#ff5722', // Example accent color
      },
    },
  },
  plugins: [],
}


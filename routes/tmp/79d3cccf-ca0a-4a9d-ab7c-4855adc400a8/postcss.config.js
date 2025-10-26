module.exports = {
  purge: ['./src/**/*.{js,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        'blue-100': '#DAEAF6',
        'blue-200': '#8FC4F5',
        'blue-300': '#5E92F8',
        'blue-400': '#2F6DFF',
        'blue-500': '#0045FF',
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
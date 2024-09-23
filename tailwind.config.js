import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#000000', // Customize primary color (e.g., used for primary buttons)
          'primary-content': '#880808', // Text color that contrasts with primary
          secondary: '#000000', // Customize secondary color
          'secondary-content': '#ffffff', // Text color for secondary elements
          accent: '#e63946', // Customize accent color (e.g., used for accent buttons)
          'accent-content': '#000000', // Text color for accent elements
          info: '#808080', // Customize info color
          success: '#2a9d8f', // Customize success color (e.g., used for success buttons)
          warning: '#e9c46a', // Customize warning color
          error: '#e76f51', // Customize error color (e.g., used for error buttons)
        },
      },
      'light', // Include default themes if you still want them
      'dark',
    ],
  },
};

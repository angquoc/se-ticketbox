import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        seat: {
          available: '#4CAF50',
          reserved: '#FFC107',
          sold: '#BDBDBD',
          selected: '#2196F3',
          hover: '#FF9800',
        },
      },
    },
  },
  plugins: [],
};

export default config;

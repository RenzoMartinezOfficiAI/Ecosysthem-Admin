import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matte: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
        },
        neon: {
          blue: '#22d3ee',
          green: '#a3e635',
          purple: '#c084fc',
        }
      },
      boxShadow: {
        'glow-blue': '0 0 10px rgba(34, 211, 238, 0.3)',
        'glow-green': '0 0 10px rgba(163, 230, 53, 0.3)',
        'glow-purple': '0 0 10px rgba(192, 132, 252, 0.3)',
      }
    },
  },
  plugins: [
    tailwindcssAnimate,
  ],
}

/**
 * Tailwind configuration (ESM) — uses `export default` to match the
 * project's `type: "module"` and enables class-based dark mode.
 */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

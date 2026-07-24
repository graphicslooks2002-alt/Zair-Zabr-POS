/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Structural tokens — resolve to CSS vars so they flip with the theme.
        base: 'var(--c-base)',        // app background
        surface: 'var(--c-surface)',  // cards / panels
        panel: 'var(--c-panel)',      // inputs / secondary panels
        elevated: 'var(--c-elevated)',// hover / raised chips
        hover: 'var(--c-hover)',      // hover on surfaces
        line: 'var(--c-line)',        // borders / dividers
        main: 'var(--c-main)',        // primary text
        muted: 'var(--c-muted)',      // secondary text
        faint: 'var(--c-faint)',      // tertiary text
        // Brand + status — same in both themes.
        accent: '#e85d04',
        warn: '#f6b100',
        success: '#02ca3a',
        info: '#025cca',
        danger: '#d00000',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}

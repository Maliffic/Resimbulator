/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        chip: {
          regular:    '#4b5563',
          exclusive:  '#dc2626',
          nnn:        '#d97706',
          fractured:  '#2563eb',
          implicit:   '#6b7280',
        },
      },
    },
  },
  plugins: [],
};

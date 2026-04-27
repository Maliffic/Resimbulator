/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // PoE clipboard-accurate palette.
        poe: {
          rare:       '#ffff77',
          magic:      '#8888ff',
          unique:     '#af6025',
          gem:        '#1ba29b',
          implicit:   '#aa9e82',
          crafted:    '#b8daf0',
          fractured:  '#a29260',
          corrupted:  '#d20000',
          augmented:  '#8888ff',
          bg:         '#0a0805',
          panel:      '#100c08',
          border:     '#3a3127',
          divider:    '#2a221a',
          text:       '#c8c8c8',
          dim:        '#7f7f7f',
          deepdim:    '#5a5048',
        },
        chip: {
          regular:    '#3b3024',
          exclusive:  '#7e2d20',
          nnn:        '#9e6b1b',
          fractured:  '#665a3a',
          implicit:   '#594c34',
        },
      },
      fontFamily: {
        poe: ['"Fontin SmallCaps"', '"Fontin"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

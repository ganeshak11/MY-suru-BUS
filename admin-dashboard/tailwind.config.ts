import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.tsx',
    './src/components/**/*.tsx',
    './src/app/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-main-background)',
        foreground: 'var(--color-primary-text)',
        card: 'var(--color-card-background)',
        'card-foreground': 'var(--color-primary-text)',
        primary: 'var(--color-primary-accent)',
        'primary-foreground': 'var(--color-button-text)',
        secondary: 'var(--color-secondary-text)',
        'secondary-foreground': 'var(--color-primary-text)',
        border: 'var(--color-border)',
        table: {
          DEFAULT: 'var(--color-table-background)',
          header: 'var(--color-table-header-background)',
          'row-hover': 'var(--color-table-row-hover-background)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;

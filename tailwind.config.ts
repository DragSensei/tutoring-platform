import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#131315',
        'carbon-base': '#0A0A0C',
        surface: {
          DEFAULT: '#131315',
          dim: '#131315',
          bright: '#39393b',
          'container-lowest': '#0e0e10',
          'container-low': '#1c1b1d',
          container: '#201f21',
          'container-high': '#2a2a2c',
          'container-highest': '#353437',
          variant: '#353437',
        },
        'on-surface': {
          DEFAULT: '#e5e1e4',
          variant: '#e6bdb8',
        },
        primary: {
          DEFAULT: '#ffb4ab',
          action: '#dc2626',
          bright: '#ef4444',
          container: '#dc2626',
          'on-primary': '#690005',
          'on-container': '#fff6f5',
        },
        secondary: {
          DEFAULT: '#b9c8de',
          slate: '#94a3b8',
          container: '#39485a',
          'on-secondary': '#233143',
        },
        tertiary: {
          DEFAULT: '#ffb3ad',
          container: '#d63135',
        },
        outline: {
          DEFAULT: '#ac8884',
          variant: '#5c403c',
          silver: '#475569',
          hairline: '#22242b',
        },
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem', // 2px
        DEFAULT: '0.25rem', // 4px
        md: '0.375rem', // 6px
        lg: '0.5rem', // 8px
        xl: '0.75rem', // 12px
      },
      boxShadow: {
        'crimson-glow': '0 0 24px -4px rgba(220, 38, 38, 0.35)',
        'crimson-rim': '0 0 16px rgba(220, 38, 38, 0.4)',
        'metallic-frame': '0 0 0 1px rgba(148, 163, 184, 0.22)',
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";
import projectTheme from "./theme.config";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const neutral = {
  50: token('background'), 100: token('canvas-subtle'), 200: token('border-subtle'),
  300: token('border-strong'), 400: token('text-subtle'), 500: token('text-muted'),
  600: token('text-muted'), 700: token('text-primary'), 800: token('text-primary'),
  900: token('text-primary'), 950: token('text-primary'),
};
const statusFamily = (name: string) => ({
  50: token(`status-${name}-soft`), 100: token(`status-${name}-soft`),
  200: `rgb(var(--status-${name}) / <alpha-value>)`, 300: `rgb(var(--status-${name}) / <alpha-value>)`,
  400: token(`status-${name}`), 500: token(`status-${name}`), 600: token(`status-${name}`),
  700: token(`status-${name}`), 800: token(`status-${name}`), 900: token(`status-${name}`),
});
const statusBackgroundFamily = (name: string) => ({
  ...statusFamily(name),
  600: token(`status-${name}-solid`), 700: token(`status-${name}-solid`),
  800: token(`status-${name}-solid`), 900: token(`status-${name}-solid`),
});

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./_vault/**/*.{js,ts,jsx,tsx}",
    "../../../_vault/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        ...projectTheme.ui.legacyTokens.spacing,
      },
      colors: {
        brand: {
          primary: token('brand-primary'), hover: token('brand-hover'),
          subtle: token('brand-subtle'), border: token('brand-border'),
        },
        white: token('surface'),
        slate: neutral,
        stone: neutral,
        emerald: statusFamily('success'),
        green: statusFamily('success'),
        amber: statusFamily('warning'),
        yellow: statusFamily('warning'),
        red: statusFamily('error'),
        rose: statusFamily('error'),
        blue: statusFamily('info'),
        indigo: statusFamily('info'),
        text: {
          primary: token('text-primary'),
          muted: token('text-muted'),
          subtle: token('text-subtle'),
        },
        border: {
          subtle: token('border-subtle'),
          strong: token('border-strong'),
        },
        canvas: {
          DEFAULT: token('canvas'),
          subtle: token('canvas-subtle'),
          dark: token('marketing-background'),
        },
        background: token('background'),
        marketing: {
          background: token('marketing-background'),
          foreground: token('marketing-foreground'),
        },
        ...projectTheme.ui.legacyTokens.colors,
        status: {
          success: token('status-success'), warning: token('status-warning'),
          error: token('status-error'), info: token('status-info'),
        },
      },
      backgroundColor: {
        slate: { ...neutral, 700: token('neutral-bg-dark'), 800: token('neutral-bg-darker'), 900: token('neutral-bg-darkest'), 950: token('neutral-bg-darkest') },
        stone: { ...neutral, 700: token('neutral-bg-dark'), 800: token('neutral-bg-darker'), 900: token('neutral-bg-darkest'), 950: token('neutral-bg-darkest') },
        emerald: statusBackgroundFamily('success'),
        green: statusBackgroundFamily('success'),
        amber: statusBackgroundFamily('warning'),
        yellow: statusBackgroundFamily('warning'),
        red: statusBackgroundFamily('error'),
        rose: statusBackgroundFamily('error'),
        blue: statusBackgroundFamily('info'),
        indigo: statusBackgroundFamily('info'),
      },
      textColor: { white: projectTheme.ui.legacyTokens.whiteForeground, brand: { primary: token('brand-link'), subtle: projectTheme.ui.legacyTokens.colors.primary['on-container'] } },
      ringWidth: { 2: 'var(--focus-ring-width)' },
      fontFamily: { sans: [...projectTheme.ui.typography.sans], mono: [...projectTheme.ui.typography.mono] },
      borderRadius: projectTheme.ui.radii,
      boxShadow: {
        ...projectTheme.ui.legacyTokens.shadows,
        sm: projectTheme.ui.components.cardShadow,
        card: projectTheme.ui.components.cardShadow,
      },
    },
  },
  plugins: [],
};
export default config;

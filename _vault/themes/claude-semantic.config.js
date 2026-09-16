/**
 * Claude-Inspired Semantic Design Tokens for Tailwind CSS.
 * Replaces generic cold tech palettes with warm paper surfaces, 
 * tactile hairline borders, and confident editorial typography.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FBFBF9', // Warm Bone/Parchment: Calming, organic backdrop
          subtle: '#F4F3EE',  // Sand 100: Table headers & subtle inset tracks
          dark: '#141413',    // Warm Charcoal (when dark mode is explicitly enabled)
        },
        surface: {
          DEFAULT: '#FFFFFF', // Crisp White: Elevated content containers
          raised: '#FFFFFF',
          sunken: '#F5F5F0',  // Muted card fills and interactive wells
        },
        main: {
          primary: '#191817', // Deep Warm Ink: High legibility body & headings
          muted: '#6B685B',   // Muted Ochre/Slate: Non-distracting secondary copy
          subtle: '#9E9B8F',  // Stone: Hairline outlines, metadata, and icons
        },
        border: {
          subtle: '#E7E5DE',  // Warm Hairline: Crisp 1px structural dividers
          strong: '#D1CEBD',  // Tactile Input Borders: Focused structural edges
        },
        brand: {
          // [REQUIRED PER-PROJECT OVERRIDE]: Every new project MUST override these placeholder
          // brand tokens in its own project-specific theme.config.ts (never inherit silently).
          primary: '#18181B', // Neutral Dark Charcoal Placeholder (REQUIRED PROJECT OVERRIDE)
          hover: '#27272A',   // Neutral Hover Placeholder (REQUIRED PROJECT OVERRIDE)
          subtle: '#F4F4F5',  // Neutral Tint Placeholder (REQUIRED PROJECT OVERRIDE)
          border: '#E4E4E7',  // Neutral Border Placeholder (REQUIRED PROJECT OVERRIDE)
        },
        state: {
          success: '#2E7D32',
          successBg: '#F1F8E9',
          warning: '#B45309',
          warningBg: '#FEF3C7',
          danger: '#C5221F',
          dangerBg: '#FCE8E6',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Newsreader', 'Tiempos Text', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'tactile': '0 1px 2px 0 rgba(25, 24, 23, 0.05)',
        'elevated': '0 4px 12px -2px rgba(25, 24, 23, 0.06), 0 2px 4px -1px rgba(25, 24, 23, 0.03)',
      }
    }
  }
};

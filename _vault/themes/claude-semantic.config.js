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
          primary: '#DC2626',   // Crimson Red
          hover: '#B91C1C',     // Deep Crimson
          subtle: '#FEF2F2',    // Soft Rose 50
          border: '#FECACA',    // Soft Rose 200
        },
        state: {
          success: '#2E7D32',
          successBg: '#F1F8E9',
          warning: '#B45309',
          warningBg: '#FEF3C7',
          danger: '#B91C1C',
          dangerBg: '#FEF2F2',
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

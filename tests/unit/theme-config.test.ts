import { describe, expect, it } from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config';
import { projectTheme, themeCssVariables } from '../../theme.config';

const resolvedTailwind = resolveConfig(tailwindConfig);

function rgb(value: string) {
  return value.split(' ').map(Number);
}

function luminance(value: string) {
  const [r, g, b] = rgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('project theme configuration', () => {
  it('renders CSS variables from the selected server default mode', () => {
    expect(themeCssVariables()).toEqual(themeCssVariables(projectTheme.ui.defaultMode));
    expect(themeCssVariables('light')['--background']).toBe(themeCssVariables('light')['--canvas']);
    expect(themeCssVariables('dark')['--background']).not.toBe(themeCssVariables('dark')['--canvas']);
  });

  it('keeps semantic palette tokens aligned across modes', () => {
    const light = themeCssVariables('light');
    const dark = themeCssVariables('dark');
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
    expect(light['--background']).not.toBe(dark['--background']);
    expect(light['--surface']).not.toBe(dark['--surface']);
  });

  it.each(['light', 'dark'] as const)('keeps normal and status text readable in %s mode', (mode) => {
    const tokens = themeCssVariables(mode);
    expect(contrast(tokens['--text-primary'], tokens['--background'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--text-muted'], tokens['--canvas'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens['--brand-link'], tokens['--canvas'])).toBeGreaterThanOrEqual(4.5);

    for (const status of ['success', 'warning', 'error', 'info']) {
      expect(contrast(tokens[`--status-${status}`], tokens[`--status-${status}-soft`])).toBeGreaterThanOrEqual(4.5);
      expect(contrast('255 255 255', tokens[`--status-${status}-solid`])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['light', 'dark'] as const)('keeps the white action label readable on the primary color in %s mode', (mode) => {
    expect(contrast('255 255 255', themeCssVariables(mode)['--brand-primary'])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps legacy Tailwind foreground and background aliases semantically distinct', () => {
    const colors = resolvedTailwind.theme.colors;
    const textColor = resolvedTailwind.theme.textColor;
    const backgroundColor = resolvedTailwind.theme.backgroundColor;
    expect(colors.white).toBe('rgb(var(--surface) / <alpha-value>)');
    expect(textColor.white).toBe(projectTheme.ui.legacyTokens.whiteForeground);
    expect((backgroundColor.slate as Record<string, string>)[900]).toBe('rgb(var(--neutral-bg-darkest) / <alpha-value>)');
    expect((colors.slate as Record<string, string>)[900]).toContain('--text-primary');
    expect((colors.emerald as Record<string, string>)[200]).toContain('<alpha-value>');
    expect((backgroundColor.rose as Record<string, string>)[700]).toContain('--status-error-solid');
    expect((resolvedTailwind.theme.colors.rose as Record<string, string>)[700]).toContain('--status-error');
  });
});

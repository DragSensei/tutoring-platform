import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Combobox } from '@/shared/components/combobox';

describe('Custom Modern Combobox Primitive', () => {
  const options = [
    { value: 'tutor-1', label: 'Eng. Omar Ashraf', sublabel: 'omar@tutor.com' },
    { value: 'tutor-2', label: 'Dr. Sarah Smith', sublabel: 'sarah@tutor.com' },
  ];

  it('renders combobox with placeholder when no option is selected', () => {
    const html = renderToString(
      <Combobox
        options={options}
        value=""
        onChange={vi.fn()}
        placeholder="Select Tutor..."
      />
    );

    expect(html).toContain('Select Tutor...');
    expect(html).toContain('aria-haspopup="listbox"');
  });

  it('renders selected option label and sublabel correctly', () => {
    const html = renderToString(
      <Combobox
        options={options}
        value="tutor-1"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('Eng. Omar Ashraf');
    expect(html).toContain('omar@tutor.com');
  });

  it('renders hidden input when name prop is provided for form submission', () => {
    const html = renderToString(
      <Combobox
        options={options}
        value="tutor-2"
        onChange={vi.fn()}
        name="tutorId"
        required
      />
    );

    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="tutorId"');
    expect(html).toContain('value="tutor-2"');
  });
});

/**
 * Project-Specific Theme & Domain Configuration: Big Hero Robotics Tutoring Platform
 * 
 * Extracted from shared vault to guarantee clean isolation between generic templates
 * and client-specific branding, currency, and domain configurations.
 */

export const projectTheme = {
  // Client Brand Palette (Big Hero Robotics Academy)
  brand: {
    primary: '#DC2626',   // Crimson Red
    hover: '#B91C1C',     // Deep Crimson
    subtle: '#FEF2F2',    // Soft Rose 50
    border: '#FECACA',    // Soft Rose 200
  },

  // Localization & Currency
  locale: 'ar-EG',
  currency: {
    code: 'EGP',
    symbol: 'EGP',
    name: 'Egyptian Pound',
  },

  // Domain & Business Policy Configuration
  domain: {
    clientName: 'Big Hero Robotics Academy',
    scheduleTerm: 'Gadwal',
    attendanceDeadlineHours: 4,
  },
};

export default projectTheme;

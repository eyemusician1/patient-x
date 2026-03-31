export const typography = {
  /**
   * The "Trust" Font.
   * Use this for massive headers, the "Iris" logo, and doctor names.
   * Make sure 'Merriweather-Regular.ttf' is in assets/fonts/
   */
  serif: 'Merriweather-Regular',

  /**
   * The "Clinical" Font.
   * Use this for chat bubbles, instructions, dates, and buttons.
   * Make sure 'Inter-Medium.ttf' is in assets/fonts/
   */
  sans: 'Inter-Medium',

  /**
   * The "Data" Font.
   * Use this strictly for medical values (e.g., "150 mg", "120/80 mmHg").
   * Make sure 'Inter-SemiBold.ttf' is in assets/fonts/
   */
  data: 'Inter-SemiBold',
} as const;
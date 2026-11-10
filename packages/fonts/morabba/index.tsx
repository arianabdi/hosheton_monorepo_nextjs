// Import the CSS that contains @font-face declarations
import './morabba.module.scss';

// Export the font family name as a constant
export const morabba = 'morabba';

// Optional: Export the CSS module classes if needed
export { default as morabbaStyles } from './morabba.module.scss';

// Export a helper to get the font family string
export const getMorabbaFontFamily = () => 'morabba';
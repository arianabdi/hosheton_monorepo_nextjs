// Import the CSS that contains @font-face declarations
import './shilia.module.scss';

// Export the font family name as a constant
export const shilia = 'shilia';

// Optional: Export the CSS module classes if needed
export { default as shiliaStyles } from './shilia.module.scss';

// Export a helper to get the font family string
export const getShiliaFontFamily = () => 'shilia';
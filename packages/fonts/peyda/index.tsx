// Import the CSS that contains @font-face declarations
import './peyda.module.scss';

// Export the font family name as a constant
export const peyda = 'peyda';

// Optional: Export the CSS module classes if needed
export { default as peydaStyles } from './peyda.module.scss';

// Export a helper to get the font family string
export const getPeydaFontFamily = () => 'peyda';
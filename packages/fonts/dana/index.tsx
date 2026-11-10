// Import the CSS that contains @font-face declarations
import './dana.module.scss';

// Export the font family name as a constant
export const dana = 'dana';

// Optional: Export the CSS module classes if needed
export { default as danaStyles } from './dana.module.scss';

// Export a helper to get the font family string
export const getDanaFontFamily = () => 'dana';
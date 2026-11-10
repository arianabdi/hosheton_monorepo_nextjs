// Import the CSS that contains @font-face declarations
import './rokh.module.scss';

// Export the font family name as a constant
export const rokh = 'rokh';

// Optional: Export the CSS module classes if needed
export { default as rokhStyles } from './rokh.module.scss';

// Export a helper to get the font family string
export const getRokhFontFamily = () => 'rokh';
// Import the CSS that contains @font-face declarations
import './yekanbakh.module.scss';

// Export the font family name as a constant
export const yekanbakh = 'yekanbakh';

// Optional: Export the CSS module classes if needed
export { default as yekanbakhStyles } from './yekanbakh.module.scss';

// Export a helper to get the font family string
export const getYekanbakhFontFamily = () => 'yekanbakh';
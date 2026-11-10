// Import the CSS that contains @font-face declarations
import './byekan.module.scss';

// Export the font family name as a constant
export const byekan = 'byekan';

// Optional: Export the CSS module classes if needed
export { default as byekanStyles } from './byekan.module.scss';

// Export a helper to get the font family string
export const getByekanFontFamily = () => 'byekan';
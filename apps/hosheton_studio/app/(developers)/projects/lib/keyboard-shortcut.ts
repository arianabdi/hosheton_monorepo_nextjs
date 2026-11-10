/** Ctrl/Cmd + letter, independent of keyboard layout and input language. */
export function isModLetter(event: KeyboardEvent, letter: string): boolean {
    if (!(event.ctrlKey || event.metaKey) || letter.length !== 1) return false;
    const lower = letter.toLowerCase();
    if (event.key.toLowerCase() === lower) return true;
    return event.code === `Key${lower.toUpperCase()}`;
}

export function extractVariables(prompt: string) {
    const regex = /\{\{\s*name:(\w+),\s*label:"([^"]+)"\s*\}\}/g;
    const matches: Array<{ name: string; label: string }> = [];
    let match;

    while ((match = regex.exec(prompt)) !== null) {
        matches.push({ name: match[1], label: match[2] });
    }

    return matches;
}

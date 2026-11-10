export function generateUniqueNumber() {
    // Get current timestamp in milliseconds
    const timestamp = Date.now().toString(); // e.g., "1634567890123"

    // Extract last 7 digits of the timestamp
    const timeComponent = timestamp.slice(-7); // e.g., "7890123"

    // Generate a random 4-digit number
    const randomComponent = Math.floor(1000 + Math.random() * 9000).toString(); // e.g., "2557"

    // Combine to form an 11-digit unique number
    return randomComponent + timeComponent; // e.g., "25577890123"
}
interface ProfileLike {
    fullName?: string | null;
    fullname?: string | null;
    email?: string | null;
}

export function needsProfileCompletion(user: ProfileLike | null | undefined): boolean {
    if (!user) return true;

    const fullName = (user.fullName ?? user.fullname ?? '').trim();
    const email = (user.email ?? '').trim();

    return !fullName || !email;
}

export function splitFullName(fullName?: string | null) {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);

    return {
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' '),
    };
}

export function buildFullName(firstName: string, lastName: string) {
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

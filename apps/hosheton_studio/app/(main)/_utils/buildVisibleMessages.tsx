// @ts-nocheck
const ROOT_KEY = '__root__';

function keyOf(id) {
    return id ? String(id) : ROOT_KEY;
}

export function buildVisibleMessages(
    messages,
    activeVersionByParent = {}
) {

    // parent -> children[]
    const childrenByParent = new Map();

    for (const msg of messages) {

        const parentKey = keyOf(msg.parentMessageId);

        if (!childrenByParent.has(parentKey)) {
            childrenByParent.set(parentKey, []);
        }

        childrenByParent.get(parentKey).push(msg);
    }

    // sort by createdAt
    for (const items of childrenByParent.values()) {
        items.sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );
    }

    const output = [];

    function traverse(parentKey) {

        const children =
            childrenByParent.get(parentKey) || [];

        if (!children.length) {
            return;
        }

        // assistants under current node
        const assistants =
            children.filter(m => m.role === 'assistant');

        // render assistants
        for (const assistant of assistants) {
            output.push(assistant);
        }

        // user versions under current node
        const users =
            children.filter(m => m.role === 'user');

        if (!users.length) {
            return;
        }

        // versions = same logical message
        // grouped by parent
        const versions = [...users]
            .sort((a, b) => a.version - b.version);

        const activeIndex = Math.min(
            activeVersionByParent[parentKey]
            ?? versions.length - 1,
            versions.length - 1
        );

        const selectedUser =
            versions[activeIndex];

        output.push({
            ...selectedUser,
            multi: versions.length > 1,
            total: versions.length,
            current: activeIndex + 1,
            versions
        });

        // IMPORTANT:
        // continue ONLY selected branch
        traverse(String(selectedUser._id));
    }

    // root user
    const rootMessages =
        childrenByParent.get(ROOT_KEY) || [];

    const rootUser =
        rootMessages.find(m => m.role === 'user');

    if (!rootUser) {
        return [];
    }

    output.push(rootUser);

    // continue tree
    traverse(String(rootUser._id));

    return output;
}
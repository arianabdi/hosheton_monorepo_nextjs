export type GalleryMediaType = 'image' | 'video' | 'audio';
export type GalleryMediaFilter = 'all' | GalleryMediaType;

export interface Photo {
    id: string;
    type: GalleryMediaType;
    /** Compressed thumb for the grid (never the multi‑MB original when a preview exists). */
    src: string;
    /** Full-resolution URL shown in the lightbox on click. */
    originalSrc: string;
    alt: string;
    width: number;
    height: number;
    date: string; // ISO format: "2026-05-14"
    durationSeconds?: number;
    /** حجم فایل اصلی اگر از API معلوم است (وگرنه با HEAD خوانده می‌شود) */
    sizeBytes?: number;
}

export interface CalculatedPhoto extends Photo {
    computedWidth: number;
    computedHeight: number;
}

export interface PhotoGroup {
    date: string;
    rows: CalculatedPhoto[][];
}

export function groupAndLayoutPhotos(
    photos: Photo[],
    containerWidth: number,
    targetRowHeight: number = 220,
    gap: number = 4
): PhotoGroup[] {
    if (containerWidth <= 0) return [];

    // 1. Group by Date (newest groups first — Google Photos style)
    const groupedMap = photos.reduce((acc, photo) => {
        if (!acc[photo.date]) acc[photo.date] = [];
        acc[photo.date].push(photo);
        return acc;
    }, {} as Record<string, Photo[]>);

    // 2. Process each group into aspect-ratio justified rows
    return Object.entries(groupedMap)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, items]) => {
            const rows: CalculatedPhoto[][] = [];
            let currentRow: Photo[] = [];
            let currentAspectSum = 0;

            items.forEach((photo) => {
                const aspect = photo.width / photo.height;
                currentRow.push(photo);
                currentAspectSum += aspect;

                const availableWidth = containerWidth - (currentRow.length - 1) * gap;
                const computedHeight = availableWidth / currentAspectSum;

                // When adding this image brings row height close to or below target, lock the row
                if (computedHeight <= targetRowHeight) {
                    rows.push(
                        currentRow.map((p) => ({
                            ...p,
                            computedWidth: computedHeight * (p.width / p.height),
                            computedHeight,
                        }))
                    );
                    currentRow = [];
                    currentAspectSum = 0;
                }
            });

            // Handle last remaining row in a date group
            if (currentRow.length > 0) {
                const availableWidth = containerWidth - (currentRow.length - 1) * gap;
                let computedHeight = availableWidth / currentAspectSum;

                // Cap the height so a single photo doesn't stretch huge across the row
                if (computedHeight > targetRowHeight) {
                    computedHeight = targetRowHeight;
                }

                rows.push(
                    currentRow.map((p) => ({
                        ...p,
                        computedWidth: computedHeight * (p.width / p.height),
                        computedHeight,
                    }))
                );
            }

            return { date, rows };
        });
}

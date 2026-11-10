# Studio Gallery module

Shared media gallery for Hosheton Studio. Every call site that opens the gallery
must import from `@/app/(developers)/gallery` so uploaded and generated media
load through the same pipeline.

## Layout

```
gallery/
  GalleryModal.tsx              # portal shell (search, scope chrome, select footer)
  GalleryModal.module.scss
  index.ts                      # public exports
  README.md
  components/
    PhotoGallery.tsx            # justified date-grouped grid (gallery2 UI)
    GalleryTypeFilter.tsx       # file-type select (all / photo / video / audio)
    galleryFileToPhoto.ts       # GalleryFileItem → Photo
    galleryUtils.ts             # layout algorithm
  hooks/
    useGalleryFiles.ts          # only loader — scope → API(s) → dedupe
  lib/
    gallery-types.ts            # GalleryFileItem, scope/tab/mode types
    gallery-api.ts              # HTTP client for media endpoints
    gallery-adapters.ts         # maps gallery items → studio/preview media
```

## Scopes → data sources

| `scope` | API(s) | What you see |
|---------|--------|--------------|
| `project` | **merge** `GET /api/studio/media/projects/:projectId/files` + `GET /api/studio/media/chats/files?projectId=` | Uploads (`assetRef`) + generated outputs on that workflow, plus uploads/generations of the personal (main) chat and **this project's** chats — never other projects |
| `personal` | `GET /api/studio/media/chats/files?chatId=` | Chat attachments across all owned chats (personal + project chats) |
| `all` | **merge** `GET /api/studio/media/files` + `GET /api/studio/media/chats/files` | All workflow media **and** all chat uploads/generations |

`useGalleryFiles` always runs results through `uniqueGalleryFiles` (dedupe by
`fileId` → `fileKey` → `url` → `id`).

## Modes

- `view` — open lightbox (compressed thumb → full original)
- `select` — single pick via `onSelect`, then close
- `multi-select` — toggle picks, confirm via `onSelectMany`

## Adding a call site

```tsx
import {
  GalleryModal,
  galleryItemToPreviewMedia,
} from '@/app/(developers)/gallery';

<GalleryModal
  open={open}
  onClose={() => setOpen(false)}
  scope="all"                 // or "project" / "personal"
  projectId={projectId}       // required for scope="project"
  chatId={chatId}             // optional for scope="personal"
  mode="multi-select"
  initialTab="image"          // seeds the type filter
  selectedIds={[...]}
  onSelectMany={(items) => {
    addAttachments(items.map(galleryItemToPreviewMedia));
  }}
/>
```

Rules:

1. Do **not** call `mediaGalleryApi` directly from UI for listing — use the modal
   or `useGalleryFiles`.
2. Prefer `scope="project"` inside a project chat / project navbar so the list
   matches that workflow.
3. Prefer `scope="all"` for cross-project pickers (AssetRef, templates, assets
   library import) so personal uploads are included.
4. Pass `initialTab` when the host only cares about one media kind.

## Compatibility re-exports

Older imports under `projects/components/GalleryModal` and
`projects/lib/media-gallery-api` re-export this module so gradual migration
does not break builds. New code should only use `@/app/(developers)/gallery`.

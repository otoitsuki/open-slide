import type { Folder, FolderIcon, FoldersManifest } from '../app/lib/sdk.ts';

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SAFE_ID_RE = /^[a-z0-9_-]+$/i;

function emptyManifest(): FoldersManifest {
  return { folders: [], assignments: {} };
}

function validateIcon(v: unknown): FolderIcon | null {
  if (!v || typeof v !== 'object') return null;
  const icon = v as { type?: unknown; value?: unknown };
  if (icon.type === 'emoji') {
    if (typeof icon.value !== 'string') return null;
    if (icon.value.length < 1 || icon.value.length > 8) return null;
    return { type: 'emoji', value: icon.value };
  }
  if (icon.type === 'color') {
    if (typeof icon.value !== 'string' || !COLOR_RE.test(icon.value)) return null;
    return { type: 'color', value: icon.value };
  }
  return null;
}

function titleFromId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeFolder(v: unknown): Folder | null {
  if (typeof v === 'string') {
    const id = v.trim();
    if (!SAFE_ID_RE.test(id)) return null;
    return {
      id,
      name: titleFromId(id) || id,
      icon: { type: 'emoji', value: '🗂️' },
    };
  }

  if (!v || typeof v !== 'object') return null;
  const raw = v as { id?: unknown; name?: unknown; icon?: unknown };
  if (typeof raw.id !== 'string' || !SAFE_ID_RE.test(raw.id)) return null;
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : titleFromId(raw.id);
  const icon = validateIcon(raw.icon) ?? { type: 'emoji', value: '🗂️' };
  return { id: raw.id, name, icon };
}

export function normalizeFoldersManifest(raw: unknown): FoldersManifest {
  if (!raw || typeof raw !== 'object') return emptyManifest();
  const parsed = raw as { folders?: unknown; assignments?: unknown };

  const folders: Folder[] = [];
  const seen = new Set<string>();
  if (Array.isArray(parsed.folders)) {
    for (const item of parsed.folders) {
      const folder = normalizeFolder(item);
      if (!folder || seen.has(folder.id)) continue;
      seen.add(folder.id);
      folders.push(folder);
    }
  }

  const assignments: Record<string, string> = {};
  if (parsed.assignments && typeof parsed.assignments === 'object') {
    for (const [slideId, folderId] of Object.entries(parsed.assignments)) {
      if (typeof folderId !== 'string') continue;
      if (!SAFE_ID_RE.test(slideId) || !seen.has(folderId)) continue;
      assignments[slideId] = folderId;
    }
  }

  return { folders, assignments };
}

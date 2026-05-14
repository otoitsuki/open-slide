---
name: build-slide-from-markdown
description: Turn one Slidev-compatible markdown file into a full runnable slide folder (slides/<id>/<id>.md + index.tsx + working Design panel tokens). Use when the user gives a path to a .md deck, says build slides from markdown file, md path to deck, or wants one-shot markdown→slides with design tokens. Follow markdown-slide-deck for layout rules.
---

# Build slide deck from a markdown file path

Use this skill when the user **names a single markdown file** (absolute or workspace-relative path) and expects **everything runnable**: `slides/<id>/index.tsx`, canonical **`slides/<id>/<id>.md`**, **`export const design`** so **`var(--osd-*)`** and the Design panel work.

Do **not** use for pasted markdown without a path — use **`create-slide`** (Markdown-first path) instead.

## Read first

1. **`markdown-slide-deck`** — slide delimiter, layouts, chart tables, checklist.
2. **`slide-authoring`** — canvas, `Page[]` contract, osd tokens, SVG `<text>` rule.

## Inputs

| Input | Notes |
| --- | --- |
| Path to `.md` | Must follow **`markdown-slide-deck`** shape (`---` slides, per-slide frontmatter, `#` titles). |
| Optional collision policy | If `slides/<id>/` exists, ask once: overwrite `index.tsx` / `.md` vs pick new id. |

## Slide id (`slides/<id>/`)

1. Basename without `.md` **must equal** parent folder name when the file already lives under `slides/<foo>/<foo>.md` → **`id = foo`**.
2. Otherwise **`id =`** basename without extension (e.g. `reports/q4.md` → `q4`), and you create **`slides/q4/q4.md`** (canonical layout).
3. If that id collides with another folder and user did not allow overwrite, append `-deck` or ask once.

## Outputs (always)

| File | Purpose |
| --- | --- |
| **`slides/<id>/<id>.md`** | Canonical markdown copy (normalize line endings). Preserve content; **keep** optional deck-level keys in YAML (`design`, `theme`) — see below. |
| **`slides/<id>/index.tsx`** | Full deck: imports, **`design`**, **`meta`**, `export default [ … ]`. |
| **`slides/.folders.json`** | Folder manifest with object folders (`id`, `name`, `icon`) and `assignments[id] = folderId`. Never emit legacy string folders such as `["deck-id"]`. |
| **`slides/<id>/assets/`** | Create when `split` slides reference `./assets/...`. Use **`<ImagePlaceholder>`** from `@open-slide/core` if the file is missing and the user must supply art later. |

Do **not** change `package.json`, `open-slide.config.ts`, or unrelated slides.

## Design tokens (Design panel + `var(--osd-*)`)

Emitted **`index.tsx` must**:

1. Import from **`@open-slide/core`**:

```tsx
import {
  defaultDesign,
  mergeDesign,
  type DesignSystem,
  type Page,
  type SlideMeta,
} from '@open-slide/core';
```

2. Define:

```tsx
export const design: DesignSystem = mergeDesign(defaultDesign, {
  /* partial patch */
} as Partial<DesignSystem>);
```

3. Drive visuals with **`var(--osd-*)`** everywhere (palette, fonts, type sizes, spacing, shadow, radius) — same discipline as **`apps/demo/slides/lightweight-siem/index.tsx`** when that repo is available.

### Where the patch comes from

| Source | Action |
| --- | --- |
| **First slide YAML `design:`** | Nested keys matching **`DesignSystem`** (`palette`, `fonts`, `typeScale`, `spacing`, `shadow`, `radius`). Omit keys to keep defaults. Convert YAML → TypeScript object literal inside `mergeDesign(defaultDesign, { … })`. |
| **`theme: <id>`** in first YAML (no `design:` or merge on top) | Read **`themes/<id>.md`** and translate its palette / typography / spacing into the same **`mergeDesign`** patch (same burden as **`create-slide`** picking a theme). |
| Neither | Use **`mergeDesign(defaultDesign, {})`** so tokens equal shipped defaults — still emit **`design`** so the panel sliders work. |

Remove **`design`** and **`theme`** from the generated **TSX** body logic — they live in YAML + this merge call only.

When starting from a scaffold/template, delete or replace any existing starter `const design` before adding the `mergeDesign(...)` export. A generated `index.tsx` must never contain both `const design` and `export const design`.

## Transpile markdown → pages

For **each** slide block after the first `---` separator:

- Map **`layout`** to page implementations (hero, bullets, split, chart, table) exactly as **`markdown-slide-deck`** describes.
- Reuse structural patterns from **`lightweight-siem`** when present in the workspace; otherwise reproduce equivalent layouts per **`slide-authoring`**.
- Charts: parse GFM tables into arrays; SVG axis labels use **`style={{ fontSize: 'var(--osd-size-chart-label)', … }}`**, not presentation **`fontSize="var(...)"`**.

## Verification

- [ ] `export default` is a non-empty **`Page[]`** in slide order.
- [ ] **`export const meta`** uses first-block **`title:`** or first `#`.
- [ ] **`design`** is always **`mergeDesign(...)`** output typed **`DesignSystem`**.
- [ ] Source contains exactly one top-level `design` declaration.
- [ ] `slides/.folders.json` contains folder objects with `icon.type`, and the generated slide id is assigned to one of those folder ids.
- [ ] No stray `README` in the slide folder (`.md` companion is allowed — **`markdown-slide-deck`**).

Tell the user to run **`pnpm dev`** (or project equivalent) and open **`/s/<id>`** (or the home list). Offer to run **`pnpm check`** only when Biome applies to their tree.

## Hand-off message

Include: slide **id**, paths to **`.md`** and **`index.tsx`**, note that **Design panel** edits **`design`** in TSX until they re-sync from YAML (or re-run this skill after editing **`design:`** in the markdown file).

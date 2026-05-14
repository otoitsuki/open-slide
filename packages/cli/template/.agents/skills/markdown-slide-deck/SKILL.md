---
name: markdown-slide-deck
description: Slidev-compatible markdown as the source of truth for an open-slide deck. Use when the user pastes Slidev-style markdown, invokes /create-slide with markdown only, asks for a markdown-first deck, or needs the frontmatter/layout ↔ TSX mapping. Produces slides/<id>/<id>.md plus index.tsx transpiled from this spec. Reference implementation apps/demo/slides/lightweight-siem/.
---

# Markdown slide deck (Slidev-compatible source)

open-slide **runs `index.tsx`**, not Markdown. This skill defines a **standard authoring format**: keep **`slides/<id>/<id>.md`** as the Slidev-shaped source and maintain **`slides/<id>/index.tsx`** as the executable deck by transpiling (agent or human).

## Files

| Path | Role |
| --- | --- |
| `slides/<id>/<id>.md` | Slidev-compatible markdown — slides separated by `---`, YAML frontmatter per slide. |
| `slides/<id>/index.tsx` | `Page[]`, `meta`, optional `design` — must implement what the markdown declares. |
| `slides/<id>/assets/` | Images referenced from split-layout slides (`./assets/...`). |

Naming: markdown basename **matches** the folder id (`rust-intro/rust-intro.md`).

## Slide delimiter

- **Deck-level block** (optional): first `--- … ---` may include `title:` used for `export const meta: SlideMeta`.
- **Between slides**: a line containing only `---` separates slides (Slidev convention).
- Per-slide frontmatter opens with `---` and closes with `---` before the markdown body.

## Frontmatter keys

Common:

| Key | Used when | Maps to TSX |
| --- | --- | --- |
| `layout` | Always per slide | Chooses page layout component pattern |
| `label` | Optional | Footer / eyebrow context string |
| `title` | First slide optional | `meta.title` if present |
| `design` | First slide only (optional) | Nested YAML matching **`DesignSystem`** fields (`palette`, `fonts`, `typeScale`, `spacing`, `shadow`, `radius`). Emitted as **`mergeDesign(defaultDesign, patch)`** in `index.tsx` — see **`build-slide-from-markdown`**. |
| `theme` | First slide only (optional) | Theme id (`themes/<id>.md`). Agent reads prose theme and fills the same **`mergeDesign`** patch; omit if using explicit **`design:`**. |

### `layout: hero`

Cover-style page: `#` title, optional paragraph below.

### `layout: bullets`

`#` title then `-` bullet list.

### `layout: split`

Side-by-side copy and image.

| Key | Values |
| --- | --- |
| `image` | Path under slide folder, e.g. `./assets/hero.svg` |
| `imageSide` | `left` \| `right` |
| `imageFit` | e.g. `contain`, `cover` |

Body: `#` heading + one paragraph (or short block).

### `layout: chart`

Data is a **single markdown table** in the slide body after the `#` title.

| Key | Values / notes |
| --- | --- |
| `chartType` | `bar` \| `line` \| `pie` \| `scatter` |
| `chartOrientation` | `horizontal` \| `vertical` (bar) |
| `valueFormat` | e.g. `currency`, `percent` (drives tick/label formatting in TSX) |

**Table columns (conventions):**

- **bar (vertical)**: `| Label | Value |` — numeric second column.
- **bar (horizontal)**: `| Option | Value |` — label + number (e.g. cost).
- **line**: `| Month / X | Y |` — first column categories, second numeric.
- **pie**: `| Segment | Share |` — shares as numbers (agent normalizes to % in UI).
- **scatter**: `| Point | Likelihood | Impact |` — two numeric columns after the name column.

### `layout: table`

Comparison tables: `#` title + markdown table only.

## Body markdown rules

- One `#` heading per slide = page title (`PageTitle`).
- Paragraphs = body copy (`hero`, `split`).
- Bullet lines must start with `- `.
- Tables use standard GFM pipes; align numeric columns with `---:` where helpful.

## Design tokens

Transpiled `index.tsx` should **`export const design: DesignSystem`**, **`import { defaultDesign, mergeDesign } from '@open-slide/core'`**, and use:

```tsx
export const design: DesignSystem = mergeDesign(defaultDesign, {
  /* optional partial from first-slide YAML `design:` or derived from `theme:` */
} as Partial<DesignSystem>);
```

Use **`var(--osd-*)`** for typography/colors/spacing so the Design panel works. Patterns: **`slide-authoring`** + **`apps/demo/slides/lightweight-siem/index.tsx`** when available. One-shot builds from a file path: **`build-slide-from-markdown`**.

### SVG `<text>`

Put osd font sizes on **`style={{ fontSize: 'var(--osd-size-chart-label)', … }}`** — not the JSX `fontSize="var(...)"` attribute — see **`slide-authoring`**.

## Agent transpilation checklist

- [ ] Slide count in `export default [ … ]` matches markdown slide blocks.
- [ ] Each slide’s `layout` and frontmatter keys reflected in JSX (chart type, split image path, footer `label`).
- [ ] Chart slides parse table rows into data arrays for the chart component.
- [ ] `meta.title` set from first frontmatter `title` or first `#`.
- [ ] Assets referenced in `image:` exist under `assets/` (or add `<ImagePlaceholder>` if user TBD).
- [ ] **`design`** emitted via **`mergeDesign(defaultDesign, …)`** when YAML `design:` / `theme:` present or defaults otherwise.

## Canonical example

Full real deck: **`apps/demo/slides/lightweight-siem/lightweight-siem.md`** ↔ **`apps/demo/slides/lightweight-siem/index.tsx`**.

## Empty starter

Copy **`skills/markdown-slide-deck/template.md`** (beside this skill in `@open-slide/core`) into `slides/<id>/<id>.md` and fill slides.

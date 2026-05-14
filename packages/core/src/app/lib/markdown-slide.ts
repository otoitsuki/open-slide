import { type CSSProperties, createElement } from 'react';
import type { DesignSystem } from './design';
import type { Page, SlideModule } from './sdk';

type MarkdownMeta = Record<string, string>;

type MarkdownBlock =
  | { kind: 'heading'; depth: number; text: string; line: number; column: number }
  | { kind: 'paragraph'; text: string; line: number; column: number }
  | { kind: 'bullets'; items: Array<{ text: string; line: number; column: number }> }
  | {
      kind: 'table';
      headers: string[];
      rows: string[][];
      line: number;
      column: number;
    };

type MarkdownLayout = 'hero' | 'title-body' | 'bullets' | 'split' | 'chart' | 'table';

type ParsedMarkdownSlide = {
  meta: MarkdownMeta;
  blocks: MarkdownBlock[];
  layout: MarkdownLayout;
};

type ParsedMarkdownDeck = {
  meta: MarkdownMeta;
  slides: ParsedMarkdownSlide[];
};

export function parseMarkdownDeck(raw: string): ParsedMarkdownDeck {
  const sections = splitMarkdownSections(raw.replace(/\r\n/g, '\n'));
  const deckMeta =
    sections[0]?.text.trim() === '' && sections[1] ? parseFrontmatter(sections[1].text) : {};
  const slides: ParsedMarkdownSlide[] = [];
  let pendingMeta: MarkdownMeta = sections[0]?.text.trim() === '' ? { ...deckMeta } : {};
  const start = sections[0]?.text.trim() === '' ? 2 : 0;

  for (let i = start; i < sections.length; i += 1) {
    const section = sections[i];
    if (!section || section.text.trim() === '') continue;
    const meta = parseFrontmatter(section.text);
    if (Object.keys(meta).length > 0 && isFrontmatterOnly(section.text, meta)) {
      pendingMeta = meta;
      continue;
    }
    const blocks = parseBlocks(section.text, section.startLine);
    if (blocks.length === 0) continue;
    const layout = normalizeLayout(pendingMeta.layout) ?? inferLayout(blocks);
    slides.push({ meta: pendingMeta, blocks, layout });
    pendingMeta = {};
  }

  return { meta: deckMeta, slides };
}

function splitMarkdownSections(raw: string): Array<{ text: string; startLine: number }> {
  const out: Array<{ text: string; startLine: number }> = [];
  const lines = raw.split('\n');
  let buf: string[] = [];
  let startLine = 1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^---\s*$/.test(lines[i])) {
      out.push({ text: buf.join('\n'), startLine });
      buf = [];
      startLine = i + 2;
      continue;
    }
    buf.push(lines[i]);
  }
  out.push({ text: buf.join('\n'), startLine });
  return out;
}

export const markdownDefaultDesign: DesignSystem = {
  palette: {
    bg: '#08090a',
    text: '#e6e6e6',
    accent: '#a8a8ff',
    accent2: '#5e6ad2',
    surface: '#0e0f12',
    surfaceAlt: '#1a1c21',
    muted: '#6f727c',
    border: '#2a2d35',
    code: '#f7f8f8',
    comment: '#6f727c',
  },
  fonts: {
    display: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
    body: '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
  },
  typeScale: {
    hero: 146,
    heading: 80,
    body: 54,
    code: 24,
    label: 22,
    chartLabel: 28,
    caption: 18,
  },
  radius: 16,
};

export function markdownToSlideModule(
  raw: string,
  opts: { id: string; design?: DesignSystem; assetBase?: string },
): SlideModule {
  const deck = parseMarkdownDeck(raw);
  const pages = deck.slides.map((slide) => makeMarkdownPage(slide, opts));
  return {
    default: pages,
    design: mergeDesign(markdownDefaultDesign, opts.design),
    meta: {
      title: deck.meta.title ?? firstHeading(deck.slides[0]?.blocks ?? []) ?? opts.id,
    },
  };
}

function mergeDesign(base: DesignSystem, patch: DesignSystem | undefined): DesignSystem {
  if (!patch) return base;
  return {
    palette: { ...base.palette, ...patch.palette },
    fonts: { ...base.fonts, ...patch.fonts },
    typeScale: { ...base.typeScale, ...patch.typeScale },
    radius: patch.radius ?? base.radius,
  };
}

function parseFrontmatter(raw: string): MarkdownMeta {
  const out: MarkdownMeta = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!match) return {};
    out[match[1]] = stripQuotes(match[2]);
  }
  return out;
}

function isFrontmatterOnly(raw: string, meta: MarkdownMeta): boolean {
  if (Object.keys(meta).length === 0) return false;
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .every((line) => /^([A-Za-z][\w-]*)\s*:/.test(line) || line.startsWith('#'));
}

function parseBlocks(raw: string, startLine: number): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = raw.split('\n');
  let paragraph: Array<{ text: string; line: number; column: number }> = [];
  let bullets: Array<{ text: string; line: number; column: number }> = [];
  let table: {
    headers: string[];
    rows: string[][];
    line: number;
    column: number;
    separatorSeen: boolean;
  } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      kind: 'paragraph',
      text: paragraph.map((part) => part.text).join(' '),
      line: paragraph[0].line,
      column: paragraph[0].column,
    });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push({ kind: 'bullets', items: bullets });
    bullets = [];
  };
  const flushTable = () => {
    if (!table) return;
    if (table.headers.length > 0 && table.rows.length > 0) {
      blocks.push({
        kind: 'table',
        headers: table.headers,
        rows: table.rows,
        line: table.line,
        column: table.column,
      });
    }
    table = null;
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const lineNumber = startLine + idx;
    const trimmed = line.trim();
    if (/^<!--\s*@slide-comment\b/.test(trimmed)) continue;
    if (!trimmed) {
      flushParagraph();
      flushBullets();
      flushTable();
      continue;
    }
    if (trimmed.includes('|')) {
      flushParagraph();
      flushBullets();
      const cells = parseTableCells(trimmed);
      if (cells.length >= 2) {
        if (!table) {
          table = {
            headers: cells,
            rows: [],
            line: lineNumber,
            column: line.search(/\|/) + 1,
            separatorSeen: false,
          };
        } else if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
          table.separatorSeen = true;
        } else if (table.separatorSeen) {
          table.rows.push(cells);
        }
        continue;
      }
    }
    flushTable();
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushBullets();
      blocks.push({
        kind: 'heading',
        depth: heading[1].length,
        text: stripMarkdown(heading[2]),
        line: lineNumber,
        column: line.indexOf('#') + 1,
      });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      bullets.push({
        text: stripMarkdown(bullet[1]),
        line: lineNumber,
        column: line.search(/[-*]/) + 1,
      });
      continue;
    }
    flushBullets();
    paragraph.push({
      text: stripMarkdown(trimmed),
      line: lineNumber,
      column: line.search(/\S/) + 1,
    });
  }

  flushParagraph();
  flushBullets();
  flushTable();
  return blocks;
}

function normalizeLayout(layout: string | undefined): MarkdownLayout | null {
  if (
    layout === 'hero' ||
    layout === 'title-body' ||
    layout === 'bullets' ||
    layout === 'split' ||
    layout === 'chart' ||
    layout === 'table'
  ) {
    return layout;
  }
  return null;
}

function inferLayout(blocks: MarkdownBlock[]): MarkdownLayout {
  if (blocks.some((block) => block.kind === 'bullets')) return 'bullets';
  const paragraphs = blocks.filter((block) => block.kind === 'paragraph');
  if (paragraphs.length === 0) return 'hero';
  return 'title-body';
}

function makeMarkdownPage(slide: ParsedMarkdownSlide, opts: { assetBase?: string }): Page {
  return function MarkdownPage() {
    const heading = firstHeading(slide.blocks);
    const paragraphs = slide.blocks.filter(
      (block): block is Extract<MarkdownBlock, { kind: 'paragraph' }> => block.kind === 'paragraph',
    );
    const bullets = slide.blocks.find(
      (block): block is Extract<MarkdownBlock, { kind: 'bullets' }> => block.kind === 'bullets',
    );
    const table = slide.blocks.find(
      (block): block is Extract<MarkdownBlock, { kind: 'table' }> => block.kind === 'table',
    );
    const isHero = slide.layout === 'hero';
    const isSplit = slide.layout === 'split';
    const isChart = slide.layout === 'chart';
    const isTable = slide.layout === 'table';
    const base: CSSProperties = {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
      padding: isHero ? '150px 170px' : '118px 150px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isHero ? 'center' : 'flex-start',
    };
    const content = createElement(
      'div',
      {
        style: {
          maxWidth: isHero ? 1320 : isSplit ? 760 : isChart || isTable ? '100%' : 1400,
          width: isChart || isTable ? '100%' : undefined,
          flex: isChart || isTable ? '0 0 auto' : undefined,
          minWidth: 0,
        },
      },
      renderHeading(slide, heading),
      renderParagraphs(paragraphs),
      !isChart && renderBullets(bullets),
    );

    return createElement(
      'section',
      { style: base },
      renderLabel(slide),
      isSplit ? renderSplit(slide, content, opts.assetBase) : content,
      isChart && renderChart(table, slide),
      isTable && renderTable(table),
    );
  };
}

function renderLabel(slide: ParsedMarkdownSlide) {
  return createElement(
    'div',
    {
      style: {
        position: 'absolute',
        left: 170,
        top: 92,
        minHeight: 'var(--osd-size-label)',
        fontFamily: 'var(--osd-font-mono)',
        fontSize: 'var(--osd-size-label)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--osd-muted)',
      },
    },
    slide.meta.label ?? slide.meta.eyebrow ?? '',
  );
}

function renderHeading(slide: ParsedMarkdownSlide, heading: string | undefined) {
  if (!heading) return null;
  return createElement(
    'h1',
    {
      'data-slide-loc': `${headingBlock(slide.blocks)?.line ?? 1}:${headingBlock(slide.blocks)?.column ?? 1}`,
      style: {
        margin: 0,
        fontFamily: 'var(--osd-font-display)',
        fontSize: slide.layout === 'hero' ? 'var(--osd-size-hero)' : 'var(--osd-size-heading)',
        lineHeight: slide.layout === 'hero' ? 0.98 : 1.05,
        letterSpacing: 0,
        fontWeight: 650,
      },
    },
    heading,
  );
}

function renderParagraphs(paragraphs: Array<Extract<MarkdownBlock, { kind: 'paragraph' }>>) {
  return paragraphs.map((p, index) =>
    createElement(
      'p',
      {
        key: `p-${index}`,
        'data-slide-loc': `${p.line}:${p.column}`,
        style: {
          margin: index === 0 ? '36px 0 0' : '20px 0 0',
          maxWidth: 1240,
          color: 'color-mix(in srgb, var(--osd-text) 72%, var(--osd-muted))',
          fontSize: 'var(--osd-size-body)',
          lineHeight: 1.32,
        },
      },
      p.text,
    ),
  );
}

function renderBullets(bullets: Extract<MarkdownBlock, { kind: 'bullets' }> | undefined) {
  if (!bullets) return null;
  return createElement(
    'ul',
    {
      style: {
        margin: '46px 0 0',
        padding: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 24,
        maxWidth: 1120,
      },
    },
    bullets.items.map((item, index) =>
      createElement(
        'li',
        {
          key: `b-${index}`,
          'data-slide-loc': `${item.line}:${item.column}`,
          style: {
            display: 'flex',
            gap: 22,
            alignItems: 'baseline',
            padding: '18px 22px',
            border: '1px solid var(--osd-border)',
            borderRadius: 'var(--osd-radius)',
            background: 'var(--osd-surface)',
            fontSize: 'var(--osd-size-body)',
            lineHeight: 1.24,
            color: 'var(--osd-text)',
          },
        },
        createElement('span', { style: { color: 'var(--osd-accent)' } }, '•'),
        createElement('span', null, item.text),
      ),
    ),
  );
}

function renderSplit(
  slide: ParsedMarkdownSlide,
  content: ReturnType<typeof createElement>,
  assetBase?: string,
) {
  const side = slide.meta.imageSide === 'left' ? 'left' : 'right';
  const image = resolveAsset(slide.meta.image, assetBase);
  const imagePane = createElement(
    'div',
    {
      style: {
        flex: '1 1 0',
        minWidth: 0,
        height: 720,
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
        overflow: 'hidden',
        background: 'var(--osd-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    image
      ? createElement('img', {
          src: image,
          alt: slide.meta.imageAlt ?? '',
          style: { width: '100%', height: '100%', objectFit: slide.meta.imageFit ?? 'cover' },
        })
      : createElement(
          'span',
          {
            style: {
              fontFamily: 'var(--osd-font-mono)',
              fontSize: 'var(--osd-size-caption)',
              color: 'var(--osd-muted)',
            },
          },
          'image',
        ),
  );
  return createElement(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: '0.9fr 1.1fr',
        gap: 76,
        alignItems: 'center',
        minHeight: 760,
      },
    },
    side === 'left' ? imagePane : content,
    side === 'left' ? content : imagePane,
  );
}

type ChartPoint = { label: string; value: number; x?: number; y?: number };

function renderChart(
  table: Extract<MarkdownBlock, { kind: 'table' }> | undefined,
  slide?: ParsedMarkdownSlide,
) {
  if (!table) return null;
  const points = chartPoints(table);
  const type = chartType(slide?.meta.chartType, table);
  const valueFormat = slide?.meta.valueFormat;
  return createElement(
    'div',
    {
      'data-slide-loc': `${table.line}:${table.column}`,
      style: {
        marginTop: 46,
        flex: '1 1 0',
        minHeight: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      },
    },
    type === 'line'
      ? renderLineChart(points, valueFormat)
      : type === 'pie'
        ? renderPieChart(points, valueFormat)
        : type === 'scatter'
          ? renderScatterChart(points)
          : renderBarChart(points, valueFormat, slide?.meta.chartOrientation),
  );
}

function renderBarChart(
  points: ChartPoint[],
  valueFormat: string | undefined,
  orientation: string | undefined,
) {
  const max = Math.max(1, ...points.map((row) => row.value));
  const vertical = orientation === 'vertical';
  if (vertical) {
    return createElement(
      'div',
      {
        style: {
          flex: '1 1 0',
          minHeight: 0,
          height: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
          gap: 24,
          alignItems: 'end',
        },
      },
      points.map((row, index) =>
        createElement(
          'div',
          { key: row.label, style: { display: 'grid', gap: 14, alignItems: 'end' } },
          createElement('div', {
            style: {
              height: `${Math.max(4, (row.value / max) * 100)}%`,
              minHeight: 6,
              borderRadius: 'var(--osd-radius) var(--osd-radius) 4px 4px',
              background: index % 2 === 0 ? 'var(--osd-accent)' : 'var(--osd-accent-2)',
            },
          }),
          createElement(
            'div',
            {
              style: {
                minHeight: 64,
                fontSize: 'var(--osd-size-caption)',
                color: 'var(--osd-muted)',
                textAlign: 'center',
              },
            },
            row.label,
          ),
        ),
      ),
    );
  }
  return createElement(
    'div',
    {
      style: {
        flex: '1 1 0',
        minHeight: 0,
        display: 'grid',
        gridAutoRows: 'clamp(52px, calc(var(--osd-size-chart-label) * 1.7), 82px)',
        gap: 10,
        alignContent: 'center',
      },
    },
    points.map((row, index) =>
      createElement(
        'div',
        {
          key: row.label,
          style: {
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 340px) minmax(0, 1fr) minmax(120px, 160px)',
            gap: 18,
            alignItems: 'center',
            minHeight: 0,
            fontSize: 'clamp(16px, calc(var(--osd-size-chart-label) * 1.15), 56px)',
            lineHeight: 1.1,
            color: 'var(--osd-text)',
          },
        },
        createElement(
          'div',
          {
            style: {
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'color-mix(in srgb, var(--osd-text) 74%, var(--osd-muted))',
            },
          },
          row.label,
        ),
        createElement(
          'div',
          {
            style: {
              height: 18,
              borderRadius: 'var(--osd-radius)',
              background: 'var(--osd-surface)',
              border: '1px solid var(--osd-border)',
              overflow: 'hidden',
            },
          },
          createElement('div', {
            style: {
              width: `${Math.max(4, (row.value / max) * 100)}%`,
              height: '100%',
              borderRadius: 'inherit',
              background:
                index % 2 === 0
                  ? 'linear-gradient(90deg, var(--osd-accent), var(--osd-accent-2))'
                  : 'var(--osd-accent-2)',
            },
          }),
        ),
        createElement(
          'div',
          {
            style: {
              textAlign: 'right',
              fontFamily: 'var(--osd-font-mono)',
              whiteSpace: 'nowrap',
              color: 'var(--osd-code)',
            },
          },
          formatNumber(row.value, valueFormat),
        ),
      ),
    ),
  );
}

function renderLineChart(points: ChartPoint[], valueFormat: string | undefined) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const w = 1260;
  const h = 500;
  const pad = 54;
  const coords = points.map((point, index) => {
    const x = pad + (index / Math.max(1, points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((point.value - min) / Math.max(1, max - min)) * (h - pad * 2);
    return { ...point, x, y };
  });
  const path = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return createElement(
    'svg',
    {
      viewBox: `0 0 ${w} ${h}`,
      preserveAspectRatio: 'none',
      style: { width: '100%', height: '100%', flex: '1 1 0', minHeight: 0, overflow: 'visible' },
    },
    createElement('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 18,
      fill: 'var(--osd-surface)',
      stroke: 'var(--osd-border)',
    }),
    createElement('path', {
      d: path,
      fill: 'none',
      stroke: 'var(--osd-accent)',
      strokeWidth: 8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    coords.map((p) =>
      createElement(
        'g',
        { key: p.label },
        createElement('circle', { cx: p.x, cy: p.y, r: 11, fill: 'var(--osd-accent-2)' }),
        createElement(
          'text',
          { x: p.x, y: h - 18, textAnchor: 'middle', fill: 'var(--osd-muted)', fontSize: 20 },
          p.label,
        ),
        createElement(
          'text',
          { x: p.x, y: p.y - 22, textAnchor: 'middle', fill: 'var(--osd-code)', fontSize: 22 },
          formatNumber(p.value, valueFormat),
        ),
      ),
    ),
  );
}

function renderPieChart(points: ChartPoint[], valueFormat: string | undefined) {
  const total = Math.max(
    1,
    points.reduce((sum, p) => sum + Math.max(0, p.value), 0),
  );
  let acc = 0;
  return createElement(
    'div',
    {
      style: {
        flex: '1 1 0',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 0.9fr) 1fr',
        gap: 74,
        alignItems: 'center',
      },
    },
    createElement(
      'svg',
      { viewBox: '0 0 520 520', style: { width: '100%', height: '100%', maxHeight: '100%' } },
      points.map((p, index) => {
        const start = acc / total;
        acc += Math.max(0, p.value);
        const end = acc / total;
        return createElement('path', {
          key: p.label,
          d: donutArc(260, 260, 210, 108, start, end),
          fill: chartColor(index),
        });
      }),
    ),
    createElement(
      'div',
      { style: { display: 'grid', gap: 18 } },
      points.map((p, index) =>
        createElement(
          'div',
          {
            key: p.label,
            style: {
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              gap: 16,
              alignItems: 'center',
              fontSize: 'var(--osd-size-chart-label)',
            },
          },
          createElement('span', {
            style: { width: 18, height: 18, borderRadius: 4, background: chartColor(index) },
          }),
          createElement('span', { style: { color: 'var(--osd-text)' } }, p.label),
          createElement(
            'span',
            { style: { fontFamily: 'var(--osd-font-mono)', color: 'var(--osd-code)' } },
            formatNumber(p.value, valueFormat),
          ),
        ),
      ),
    ),
  );
}

function renderScatterChart(points: ChartPoint[]) {
  const xs = points.map((p) => p.x ?? 0);
  const ys = points.map((p) => p.y ?? p.value);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const w = 1260;
  const h = 500;
  const pad = 58;
  return createElement(
    'svg',
    {
      viewBox: `0 0 ${w} ${h}`,
      preserveAspectRatio: 'none',
      style: { width: '100%', height: '100%', flex: '1 1 0', minHeight: 0 },
    },
    createElement('rect', {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 18,
      fill: 'var(--osd-surface)',
      stroke: 'var(--osd-border)',
    }),
    points.map((p, index) => {
      const x = pad + (((p.x ?? 0) - minX) / Math.max(1, maxX - minX)) * (w - pad * 2);
      const y = h - pad - (((p.y ?? p.value) - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);
      return createElement(
        'g',
        { key: p.label },
        createElement('circle', { cx: x, cy: y, r: 14, fill: chartColor(index), opacity: 0.92 }),
        createElement(
          'text',
          { x: x + 18, y: y - 14, fill: 'var(--osd-muted)', fontSize: 20 },
          p.label,
        ),
      );
    }),
  );
}

function renderTable(table: Extract<MarkdownBlock, { kind: 'table' }> | undefined) {
  if (!table) return null;
  return createElement(
    'div',
    {
      'data-slide-loc': `${table.line}:${table.column}`,
      style: {
        marginTop: 46,
        flex: '1 1 0',
        minHeight: 0,
        width: '100%',
        maxWidth: 'none',
        boxSizing: 'border-box',
        border: '1px solid var(--osd-border)',
        borderRadius: 'var(--osd-radius)',
        overflow: 'hidden',
        background: 'var(--osd-surface)',
        alignSelf: 'stretch',
      },
    },
    createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${table.headers.length}, minmax(0, 1fr))`,
          background: 'var(--osd-surface-alt)',
          borderBottom: '1px solid var(--osd-border)',
        },
      },
      table.headers.map((header) =>
        createElement(
          'div',
          {
            key: header,
            style: {
              padding: '24px 28px',
              fontFamily: 'var(--osd-font-mono)',
              fontSize: 'var(--osd-size-caption)',
              color: 'var(--osd-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            },
          },
          header,
        ),
      ),
    ),
    table.rows.map((row, rowIndex) =>
      createElement(
        'div',
        {
          key: `row-${rowIndex}`,
          style: {
            display: 'grid',
            gridTemplateColumns: `repeat(${table.headers.length}, minmax(0, 1fr))`,
            borderBottom:
              rowIndex === table.rows.length - 1 ? 'none' : '1px solid var(--osd-border)',
          },
        },
        table.headers.map((header, colIndex) =>
          createElement(
            'div',
            {
              key: `${header}-${colIndex}`,
              style: {
                padding: '24px 28px',
                fontSize: 'var(--osd-size-chart-label)',
                lineHeight: 1.2,
                color:
                  colIndex === 0
                    ? 'var(--osd-text)'
                    : 'color-mix(in srgb, var(--osd-text) 72%, var(--osd-muted))',
                fontFamily: colIndex === 0 ? 'var(--osd-font-body)' : 'var(--osd-font-mono)',
                textAlign: colIndex === 0 ? 'left' : 'right',
              },
            },
            row[colIndex] ?? '',
          ),
        ),
      ),
    ),
  );
}

function firstHeading(blocks: MarkdownBlock[]): string | undefined {
  return headingBlock(blocks)?.text;
}

function headingBlock(
  blocks: MarkdownBlock[],
): Extract<MarkdownBlock, { kind: 'heading' }> | undefined {
  return blocks.find(
    (block): block is Extract<MarkdownBlock, { kind: 'heading' }> => block.kind === 'heading',
  );
}

function parseTableCells(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => stripMarkdown(cell.trim()));
}

function parseNumber(value: string): number {
  const n = Number(value.replace(/[$,%\s,]/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
}

function chartPoints(table: Extract<MarkdownBlock, { kind: 'table' }>): ChartPoint[] {
  const scatter = table.headers.length >= 3;
  return table.rows
    .map((row) => {
      const label = row[0] ?? '';
      const first = parseNumber(row[1] ?? '');
      const second = parseNumber(row[2] ?? '');
      return scatter ? { label, value: second, x: first, y: second } : { label, value: first };
    })
    .filter((row) => row.label && Number.isFinite(row.value));
}

function chartType(
  value: string | undefined,
  table: Extract<MarkdownBlock, { kind: 'table' }>,
): 'bar' | 'line' | 'pie' | 'scatter' {
  if (value === 'bar' || value === 'line' || value === 'pie' || value === 'scatter') return value;
  if (table.headers.length >= 3) return 'scatter';
  return 'bar';
}

function chartColor(index: number): string {
  const colors = [
    'var(--osd-accent)',
    'var(--osd-accent-2)',
    'color-mix(in srgb, var(--osd-accent) 56%, var(--osd-text))',
    'color-mix(in srgb, var(--osd-accent-2) 56%, var(--osd-text))',
    'color-mix(in srgb, var(--osd-accent) 62%, var(--osd-muted))',
    'color-mix(in srgb, var(--osd-accent-2) 62%, var(--osd-muted))',
  ];
  return colors[index % colors.length];
}

function donutArc(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const a0 = start * Math.PI * 2 - Math.PI / 2;
  const a1 = end * Math.PI * 2 - Math.PI / 2;
  const large = end - start > 0.5 ? 1 : 0;
  const p0 = [cx + outer * Math.cos(a0), cy + outer * Math.sin(a0)];
  const p1 = [cx + outer * Math.cos(a1), cy + outer * Math.sin(a1)];
  const p2 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
  const p3 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
  return `M ${p0[0]} ${p0[1]} A ${outer} ${outer} 0 ${large} 1 ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} A ${inner} ${inner} 0 ${large} 0 ${p3[0]} ${p3[1]} Z`;
}

function formatNumber(value: number, format?: string): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'percent') {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)}%`;
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

function resolveAsset(value: string | undefined, assetBase: string | undefined): string | null {
  if (!value) return null;
  if (/^(https?:|data:|\/)/.test(value)) return value;
  if (!assetBase) return value;
  return `${assetBase.replace(/\/$/, '')}/${value.replace(/^\.\//, '')}`;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

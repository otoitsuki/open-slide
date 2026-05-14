export type DesignPalette = {
  bg: string;
  text: string;
  accent: string;
  accentSecondary: string;
  surface: string;
  surfaceAlt: string;
  mutedText: string;
  border: string;
  codeText: string;
  commentText: string;
};

export type DesignFonts = {
  display: string;
  body: string;
  mono: string;
};

export type DesignTypeScale = {
  hero: number;
  heading1: number;
  body: number;
  small: number;
  code: number;
  label: number;
  chartLabel: number;
  caption: number;
};

export type DesignSpacing = {
  pageMargin: number;
  sectionGap: number;
  itemGap: number;
};

export type DesignShadow = {
  card: string;
};

export type DesignSystem = {
  palette: DesignPalette;
  fonts: DesignFonts;
  typeScale: DesignTypeScale;
  spacing: DesignSpacing;
  shadow: DesignShadow;
  radius: number;
};

export type PartialDesignSystem = {
  palette?: Partial<DesignPalette>;
  fonts?: Partial<DesignFonts>;
  typeScale?: Partial<DesignTypeScale>;
  spacing?: Partial<DesignSpacing>;
  shadow?: Partial<DesignShadow>;
  radius?: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stripLegacyTypeScale(design: DesignSystem): void {
  const ts = design.typeScale as unknown as Record<string, unknown>;
  delete ts.heading2;
  delete ts.heading3;
}

export function mergeDesign(base: DesignSystem, patch: PartialDesignSystem): DesignSystem {
  const out = JSON.parse(JSON.stringify(base)) as DesignSystem;
  const apply = (target: Record<string, unknown>, src: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(src)) {
      if (isPlainObject(v) && isPlainObject(target[k])) {
        apply(target[k] as Record<string, unknown>, v);
      } else {
        target[k] = v;
      }
    }
  };
  if (isPlainObject(patch))
    apply(out as unknown as Record<string, unknown>, patch as Record<string, unknown>);
  stripLegacyTypeScale(out);
  return out;
}

export function designToCssVars(d: DesignSystem): Record<string, string> {
  const p = d.palette;
  const f = d.fonts;
  const t = d.typeScale;
  const s = d.spacing;
  return {
    '--osd-bg': p.bg,
    '--osd-text': p.text,
    '--osd-accent': p.accent,
    '--osd-accent-secondary': p.accentSecondary,
    '--osd-surface': p.surface,
    '--osd-surface-alt': p.surfaceAlt,
    '--osd-muted-text': p.mutedText,
    '--osd-border': p.border,
    '--osd-code-text': p.codeText,
    '--osd-comment-text': p.commentText,
    '--osd-font-display': f.display,
    '--osd-font-body': f.body,
    '--osd-font-mono': f.mono,
    '--osd-size-hero': `${t.hero}px`,
    '--osd-size-heading-1': `${t.heading1}px`,
    '--osd-size-heading-2': `${t.heading1}px`,
    '--osd-size-heading-3': `${t.heading1}px`,
    '--osd-size-body': `${t.body}px`,
    '--osd-size-small': `${t.small}px`,
    '--osd-size-code': `${t.code}px`,
    '--osd-size-label': `${t.label}px`,
    '--osd-size-chart-label': `${t.chartLabel}px`,
    '--osd-size-caption': `${t.caption}px`,
    '--osd-spacing-page-margin': `${s.pageMargin}px`,
    '--osd-spacing-section-gap': `${s.sectionGap}px`,
    '--osd-spacing-item-gap': `${s.itemGap}px`,
    '--osd-shadow-card': d.shadow.card,
    '--osd-radius': `${d.radius}px`,
  };
}

export function cssVarsToString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

export const defaultDesign: DesignSystem = {
  palette: {
    bg: '#f7f5f0',
    text: '#1a1814',
    accent: '#6d4cff',
    accentSecondary: '#9580ff',
    surface: '#eeeee9',
    surfaceAlt: '#e6e4dc',
    mutedText: '#6f6963',
    border: '#dad6cd',
    codeText: '#5b21b6',
    commentText: '#9c9288',
  },
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
    mono: '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  },
  typeScale: {
    hero: 168,
    heading1: 96,
    body: 36,
    small: 28,
    code: 26,
    label: 22,
    chartLabel: 20,
    caption: 22,
  },
  spacing: {
    pageMargin: 120,
    sectionGap: 48,
    itemGap: 24,
  },
  shadow: {
    card: '0 12px 40px rgba(26, 24, 20, 0.08)',
  },
  radius: 12,
};

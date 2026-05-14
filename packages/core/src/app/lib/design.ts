export type DesignPalette = {
  bg: string;
  text: string;
  accent: string;
  accent2: string;
  surface: string;
  surfaceAlt: string;
  muted: string;
  border: string;
  code: string;
  comment: string;
};

export type DesignFonts = {
  display: string;
  body: string;
  mono: string;
};

export type DesignTypeScale = {
  hero: number;
  heading: number;
  body: number;
  code: number;
  label: number;
  chartLabel: number;
  caption: number;
};

export type DesignSystem = {
  palette: DesignPalette;
  fonts: DesignFonts;
  typeScale: DesignTypeScale;
  radius: number;
};

export type PartialDesignSystem = {
  palette?: Partial<DesignPalette>;
  fonts?: Partial<DesignFonts>;
  typeScale?: Partial<DesignTypeScale>;
  radius?: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stripLegacyTypeScale(design: DesignSystem): void {
  const ts = design.typeScale as unknown as Record<string, unknown>;
  delete ts.heading1;
  delete ts.heading2;
  delete ts.heading3;
  delete ts.small;
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
  return {
    '--osd-bg': d.palette.bg,
    '--osd-text': d.palette.text,
    '--osd-accent': d.palette.accent,
    '--osd-accent-2': d.palette.accent2,
    '--osd-surface': d.palette.surface,
    '--osd-surface-alt': d.palette.surfaceAlt,
    '--osd-muted': d.palette.muted,
    '--osd-border': d.palette.border,
    '--osd-code': d.palette.code,
    '--osd-comment': d.palette.comment,
    '--osd-font-display': d.fonts.display,
    '--osd-font-body': d.fonts.body,
    '--osd-font-mono': d.fonts.mono,
    '--osd-size-hero': `${d.typeScale.hero}px`,
    '--osd-size-heading': `${d.typeScale.heading}px`,
    '--osd-size-body': `${d.typeScale.body}px`,
    '--osd-size-code': `${d.typeScale.code}px`,
    '--osd-size-label': `${d.typeScale.label}px`,
    '--osd-size-chart-label': `${d.typeScale.chartLabel}px`,
    '--osd-size-caption': `${d.typeScale.caption}px`,
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
    accent2: '#4f46e5',
    surface: '#ffffff',
    surfaceAlt: '#f4f1ea',
    muted: '#888078',
    border: '#ded6c9',
    code: '#2f2a24',
    comment: '#7a736a',
  },
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    body: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
    mono: '"SF Mono", "JetBrains Mono", Menlo, monospace',
  },
  typeScale: {
    hero: 168,
    heading: 84,
    body: 36,
    code: 26,
    label: 22,
    chartLabel: 28,
    caption: 18,
  },
  radius: 12,
};

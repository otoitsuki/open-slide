import { Palette, Shuffle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field, NumberField, Section } from '@/components/panel/panel-fields';
import { PanelShell, usePanelMount } from '@/components/panel/panel-shell';
import { useLocale } from '@/lib/use-locale';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
import { useDesignPanelState } from './design-provider';

const FONT_PRESETS: Array<{ label: string; value: string }> = [
  {
    label: 'System sans',
    value: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'SF Mono', value: '"SF Mono", "JetBrains Mono", Menlo, monospace' },
];

type DesignPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function DesignPanel({ open, onClose }: DesignPanelProps) {
  const { draft, exists, warning, loaded, dirty, update, shuffle } = useDesignPanelState();
  const { mounted, animVisible } = usePanelMount(open);
  const t = useLocale();

  if (!loaded) return null;
  if (!mounted) return null;
  if (!draft) return null;

  return (
    <PanelShell
      uiAttr="design"
      animVisible={animVisible}
      header={
        <>
          <div className="flex min-w-0 items-center gap-2">
            <Palette className="size-3.5 text-muted-foreground" />
            <span className="font-heading text-[12px] font-semibold tracking-tight">
              {t.stylePanel.designTokens}
            </span>
            {!exists && (
              <span className="rounded-[3px] border border-hairline bg-muted/60 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {t.stylePanel.draftBadge}
              </span>
            )}
            {dirty && (
              <span
                className="size-1.5 rounded-full bg-brand"
                title={t.stylePanel.unsavedTitle}
                aria-hidden
              />
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={shuffle}
              aria-label={t.stylePanel.shuffleAria}
              title={t.stylePanel.shuffleTitle}
            >
              <Shuffle className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label={t.stylePanel.closePanelAria}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </>
      }
      banner={
        warning && (
          <div className="flex gap-2 border-b border-hairline bg-[oklch(0.97_0.04_85)] px-3 py-2 text-[11px] leading-relaxed text-[oklch(0.35_0.08_45)] dark:bg-[oklch(0.25_0.04_60)] dark:text-[oklch(0.85_0.08_85)]">
            <span aria-hidden className="mt-0.5 size-1.5 shrink-0 rounded-full bg-brand" />
            <span>{warning}</span>
          </div>
        )
      }
    >
      <Section title={t.stylePanel.colorsSection}>
        <ColorField
          label={t.stylePanel.backgroundLabel}
          value={draft.palette.bg}
          onChange={(v) =>
            update((d) => {
              d.palette.bg = v;
            }, 'design:palette.bg')
          }
        />
        <ColorField
          label={t.stylePanel.textLabel}
          value={draft.palette.text}
          onChange={(v) =>
            update((d) => {
              d.palette.text = v;
            }, 'design:palette.text')
          }
        />
        <ColorField
          label={t.stylePanel.accentLabel}
          value={draft.palette.accent}
          onChange={(v) =>
            update((d) => {
              d.palette.accent = v;
            }, 'design:palette.accent')
          }
        />
        <ColorField
          label={t.stylePanel.accentSecondaryLabel}
          value={draft.palette.accentSecondary}
          onChange={(v) =>
            update((d) => {
              d.palette.accentSecondary = v;
            }, 'design:palette.accentSecondary')
          }
        />
        <ColorField
          label={t.stylePanel.surfaceLabel}
          value={draft.palette.surface}
          onChange={(v) =>
            update((d) => {
              d.palette.surface = v;
            }, 'design:palette.surface')
          }
        />
        <ColorField
          label={t.stylePanel.surfaceAltLabel}
          value={draft.palette.surfaceAlt}
          onChange={(v) =>
            update((d) => {
              d.palette.surfaceAlt = v;
            }, 'design:palette.surfaceAlt')
          }
        />
        <ColorField
          label={t.stylePanel.mutedTextLabel}
          value={draft.palette.mutedText}
          onChange={(v) =>
            update((d) => {
              d.palette.mutedText = v;
            }, 'design:palette.mutedText')
          }
        />
        <ColorField
          label={t.stylePanel.borderLabel}
          value={draft.palette.border}
          onChange={(v) =>
            update((d) => {
              d.palette.border = v;
            }, 'design:palette.border')
          }
        />
        <ColorField
          label={t.stylePanel.codeTextLabel}
          value={draft.palette.codeText}
          onChange={(v) =>
            update((d) => {
              d.palette.codeText = v;
            }, 'design:palette.codeText')
          }
        />
        <ColorField
          label={t.stylePanel.commentTextLabel}
          value={draft.palette.commentText}
          onChange={(v) =>
            update((d) => {
              d.palette.commentText = v;
            }, 'design:palette.commentText')
          }
        />
      </Section>

      <Separator />

      <Section title={t.stylePanel.typographySection}>
        <FontField
          label={t.stylePanel.displayFontLabel}
          value={draft.fonts.display}
          onChange={(v) =>
            update((d) => {
              d.fonts.display = v;
            }, 'design:fonts.display')
          }
        />
        <FontField
          label={t.stylePanel.bodyFontLabel}
          value={draft.fonts.body}
          onChange={(v) =>
            update((d) => {
              d.fonts.body = v;
            }, 'design:fonts.body')
          }
        />
        <FontField
          label={t.stylePanel.monoFontLabel}
          value={draft.fonts.mono}
          onChange={(v) =>
            update((d) => {
              d.fonts.mono = v;
            }, 'design:fonts.mono')
          }
        />
        <Separator />
        <SliderField
          label={t.stylePanel.heroLabel}
          value={draft.typeScale.hero}
          min={48}
          max={240}
          step={2}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.hero = n;
            }, 'design:typeScale.hero')
          }
        />
        <SliderField
          label={t.stylePanel.headingLabel}
          value={draft.typeScale.heading1}
          min={28}
          max={140}
          step={2}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.heading1 = n;
            }, 'design:typeScale.heading1')
          }
        />
        <SliderField
          label={t.stylePanel.bodyLabel}
          value={draft.typeScale.body}
          min={16}
          max={72}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.body = n;
            }, 'design:typeScale.body')
          }
        />
        <SliderField
          label={t.stylePanel.smallLabel}
          value={draft.typeScale.small}
          min={18}
          max={44}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.small = n;
            }, 'design:typeScale.small')
          }
        />
        <SliderField
          label={t.stylePanel.codeSizeLabel}
          value={draft.typeScale.code}
          min={18}
          max={40}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.code = n;
            }, 'design:typeScale.code')
          }
        />
        <SliderField
          label={t.stylePanel.labelSizeLabel}
          value={draft.typeScale.label}
          min={16}
          max={36}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.label = n;
            }, 'design:typeScale.label')
          }
        />
        <SliderField
          label={t.stylePanel.chartLabelSizeLabel}
          value={draft.typeScale.chartLabel}
          min={14}
          max={32}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.chartLabel = n;
            }, 'design:typeScale.chartLabel')
          }
        />
        <SliderField
          label={t.stylePanel.captionLabel}
          value={draft.typeScale.caption}
          min={16}
          max={36}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.typeScale.caption = n;
            }, 'design:typeScale.caption')
          }
        />
      </Section>

      <Separator />

      <Section title={t.stylePanel.spacingSection}>
        <SliderField
          label={t.stylePanel.pageMarginLabel}
          value={draft.spacing.pageMargin}
          min={48}
          max={220}
          step={4}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.spacing.pageMargin = n;
            }, 'design:spacing.pageMargin')
          }
        />
        <SliderField
          label={t.stylePanel.sectionGapLabel}
          value={draft.spacing.sectionGap}
          min={16}
          max={96}
          step={4}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.spacing.sectionGap = n;
            }, 'design:spacing.sectionGap')
          }
        />
        <SliderField
          label={t.stylePanel.itemGapLabel}
          value={draft.spacing.itemGap}
          min={8}
          max={64}
          step={2}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.spacing.itemGap = n;
            }, 'design:spacing.itemGap')
          }
        />
      </Section>

      <Separator />

      <Section title={t.stylePanel.shadowsSection}>
        <TextField
          label={t.stylePanel.cardShadowLabel}
          value={draft.shadow.card}
          onChange={(v) =>
            update((d) => {
              d.shadow.card = v;
            }, 'design:shadow.card')
          }
        />
      </Section>

      <Separator />

      <Section title={t.stylePanel.shapeSection}>
        <SliderField
          label={t.stylePanel.radiusLabel}
          value={draft.radius}
          min={0}
          max={80}
          step={1}
          suffix="px"
          onChange={(n) =>
            update((d) => {
              d.radius = n;
            }, 'design:radius')
          }
        />
      </Section>
    </PanelShell>
  );
}

export function DesignToggleButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const t = useLocale();
  if (import.meta.env.PROD) return null;
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'ghost'}
      onClick={onToggle}
      data-design-ui
      title={t.stylePanel.designToggleTitle}
    >
      <Palette className="size-3.5" />
      <span className="hidden md:inline">{t.stylePanel.designToggle}</span>
    </Button>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-0 flex-1 font-mono text-[11px]"
        spellCheck={false}
      />
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [hexDraft, setHexDraft] = useState(value);
  useEffect(() => setHexDraft(value), [value]);

  return (
    <Field label={label}>
      <label className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-background shadow-xs">
        <span className="size-5 rounded-sm" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={normalizeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        type="text"
        value={hexDraft}
        onChange={(e) => {
          const v = e.target.value;
          setHexDraft(v);
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
        }}
        onBlur={() => {
          if (!/^#[0-9a-fA-F]{6}$/.test(hexDraft)) setHexDraft(value);
        }}
        className="h-8 flex-1 font-mono text-[11px] uppercase"
        spellCheck={false}
      />
    </Field>
  );
}

function FontField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const matched = FONT_PRESETS.find((p) => p.value === value);
  const tFont = useLocale();
  return (
    <Field label={label}>
      <Select
        value={matched ? matched.value : '__custom__'}
        onValueChange={(v) => {
          if (v !== '__custom__') onChange(v);
        }}
      >
        <SelectTrigger size="sm" className="h-8 flex-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_PRESETS.map((p) => (
            <SelectItem key={p.label} value={p.value} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
          {!matched && (
            <SelectItem value="__custom__" className="text-xs">
              {tFont.stylePanel.fontPresetCustom}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? value)}
        className="flex-1"
      />
      <NumberField
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        suffix={suffix}
      />
    </Field>
  );
}

function normalizeHex(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

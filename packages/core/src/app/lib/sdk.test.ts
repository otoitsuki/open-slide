import { describe, expect, it } from 'vitest';
import { type DesignSystem, defaultDesign } from './design.ts';
import { resolveSlideDesign } from './sdk.ts';

describe('resolveSlideDesign', () => {
  it('returns defaults when design is omitted', () => {
    const d = resolveSlideDesign({});
    expect(d.palette.bg).toBe(defaultDesign.palette.bg);
    expect(d.typeScale.hero).toBe(defaultDesign.typeScale.hero);
    expect(d.radius).toBe(defaultDesign.radius);
  });

  it('deep-merges partial slide design over defaults', () => {
    const d = resolveSlideDesign({
      design: { palette: { accent: '#ff0000' } } as unknown as DesignSystem,
    });
    expect(d.palette.accent).toBe('#ff0000');
    expect(d.palette.bg).toBe(defaultDesign.palette.bg);
    expect(d.typeScale.body).toBe(defaultDesign.typeScale.body);
  });
});

export type { ImagePlaceholderProps } from './app/components/image-placeholder.tsx';
export { ImagePlaceholder } from './app/components/image-placeholder.tsx';
export type {
  DesignFonts,
  DesignPalette,
  DesignShadow,
  DesignSpacing,
  DesignSystem,
  DesignTypeScale,
} from './app/lib/design.ts';
export { cssVarsToString, defaultDesign, designToCssVars, mergeDesign } from './app/lib/design.ts';
export type { Page, SlideMeta, SlideModule } from './app/lib/sdk.ts';
export { CANVAS_HEIGHT, CANVAS_WIDTH, resolveSlideDesign } from './app/lib/sdk.ts';
export type { OpenSlideConfig } from './config.ts';
export type { Locale, Plural } from './locale/types.ts';

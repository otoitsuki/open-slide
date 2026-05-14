import { describe, expect, it } from 'vitest';
import {
  duplicatePageInDefaultExportInSource,
  mimeForFilename,
  removePageFromDefaultExportInSource,
  reorderDefaultExportPagesInSource,
  reorderNotesArrayInSource,
  updateMetaTitleInSource,
  validateAssetName,
  validateIcon,
  validateName,
  validateSlideName,
} from './files-plugin.ts';
import { normalizeFoldersManifest } from './folders-manifest.ts';

describe('normalizeFoldersManifest', () => {
  it('upgrades legacy string folder entries to valid folder objects', () => {
    expect(
      normalizeFoldersManifest({
        folders: ['game-proposal'],
        assignments: { 'game-proposal': 'game-proposal' },
      }),
    ).toEqual({
      folders: [
        {
          id: 'game-proposal',
          name: 'Game Proposal',
          icon: { type: 'emoji', value: '🗂️' },
        },
      ],
      assignments: { 'game-proposal': 'game-proposal' },
    });
  });

  it('fills missing object icons and drops assignments to unknown folders', () => {
    expect(
      normalizeFoldersManifest({
        folders: [{ id: 'proposal', name: 'Proposal' }],
        assignments: { one: 'proposal', two: 'missing' },
      }),
    ).toEqual({
      folders: [
        {
          id: 'proposal',
          name: 'Proposal',
          icon: { type: 'emoji', value: '🗂️' },
        },
      ],
      assignments: { one: 'proposal' },
    });
  });
});

describe('validateName', () => {
  it('trims whitespace and accepts non-empty strings', () => {
    expect(validateName('  hello  ')).toBe('hello');
    expect(validateName('a')).toBe('a');
  });

  it('rejects non-strings', () => {
    expect(validateName(null)).toBeNull();
    expect(validateName(undefined)).toBeNull();
    expect(validateName(42)).toBeNull();
    expect(validateName({})).toBeNull();
  });

  it('rejects empty / whitespace-only / overlong strings', () => {
    expect(validateName('')).toBeNull();
    expect(validateName('   ')).toBeNull();
    expect(validateName('x'.repeat(41))).toBeNull();
  });

  it('accepts a 40-character name (boundary)', () => {
    expect(validateName('x'.repeat(40))).toBe('x'.repeat(40));
  });
});

describe('validateSlideName', () => {
  it('accepts longer slide names than folder names', () => {
    expect(validateSlideName('x'.repeat(80))).toBe('x'.repeat(80));
    expect(validateSlideName('x'.repeat(81))).toBeNull();
  });

  it('rejects empty input', () => {
    expect(validateSlideName('')).toBeNull();
    expect(validateSlideName('   ')).toBeNull();
  });
});

describe('validateIcon', () => {
  it('accepts a valid emoji icon', () => {
    expect(validateIcon({ type: 'emoji', value: '🎉' })).toEqual({ type: 'emoji', value: '🎉' });
  });

  it('accepts a valid color icon', () => {
    expect(validateIcon({ type: 'color', value: '#abcdef' })).toEqual({
      type: 'color',
      value: '#abcdef',
    });
  });

  it('rejects malformed colors', () => {
    expect(validateIcon({ type: 'color', value: 'red' })).toBeNull();
    expect(validateIcon({ type: 'color', value: '#abc' })).toBeNull();
    expect(validateIcon({ type: 'color', value: '#GGGGGG' })).toBeNull();
  });

  it('rejects empty or overlong emoji values', () => {
    expect(validateIcon({ type: 'emoji', value: '' })).toBeNull();
    expect(validateIcon({ type: 'emoji', value: 'x'.repeat(9) })).toBeNull();
  });

  it('rejects unknown types and non-objects', () => {
    expect(validateIcon({ type: 'image', value: 'foo' })).toBeNull();
    expect(validateIcon(null)).toBeNull();
    expect(validateIcon('emoji')).toBeNull();
  });
});

describe('updateMetaTitleInSource', () => {
  it('replaces an existing single-quoted title literal', () => {
    const source = `export const meta: SlideMeta = { title: 'old' };\nexport default [];\n`;
    const out = updateMetaTitleInSource(source, 'new');
    expect(out).toContain("title: 'new'");
    expect(out).not.toContain("'old'");
  });

  it('replaces an existing double-quoted title literal', () => {
    const source = `export const meta = { title: "old" };\nexport default [];\n`;
    const out = updateMetaTitleInSource(source, 'new');
    expect(out).toContain("title: 'new'");
  });

  it('escapes single quotes inside the new title', () => {
    const source = `export const meta = { title: 'old' };\nexport default [];\n`;
    const out = updateMetaTitleInSource(source, "it's new");
    expect(out).toContain("title: 'it\\'s new'");
  });

  it('escapes backslashes inside the new title', () => {
    const source = `export const meta = { title: 'old' };\nexport default [];\n`;
    const out = updateMetaTitleInSource(source, 'a\\b');
    expect(out).toContain("title: 'a\\\\b'");
  });

  it('injects a title into a meta object that lacks one', () => {
    const source = `export const meta = {\n  notes: 'x',\n};\nexport default [];\n`;
    const out = updateMetaTitleInSource(source, 'first');
    expect(out).toMatch(/title:\s*'first'/);
    expect(out).toContain("notes: 'x'");
  });

  it('injects a fresh meta export when none exists', () => {
    const source = `export default [];\n`;
    const out = updateMetaTitleInSource(source, 'fresh');
    expect(out).toContain("export const meta: SlideMeta = { title: 'fresh' };");
    expect(out).toContain('export default []');
  });

  it('returns null if there is no meta and no default export', () => {
    expect(updateMetaTitleInSource('// nothing here', 'x')).toBeNull();
  });
});

describe('reorderDefaultExportPagesInSource', () => {
  const withSatisfies = `import type { Page } from '@open-slide/core';
const A = () => null;
const B = () => null;
const C = () => null;
export const meta = { title: 't' };
export default [
  A,
  B,
  C,
] satisfies Page[];
`;

  const withoutSatisfies = `const A = () => null;
const B = () => null;
const C = () => null;
export default [A, B, C];
`;

  it('reorders a 3-element multi-line array', () => {
    const out = reorderDefaultExportPagesInSource(withSatisfies, [2, 0, 1]);
    expect(out).not.toBeNull();
    expect(out).toContain('export default [\n  C,\n  A,\n  B,\n] satisfies Page[];');
    // surrounding source untouched
    expect(out).toContain("import type { Page } from '@open-slide/core';");
    expect(out).toContain("export const meta = { title: 't' };");
  });

  it('reorders an inline array without satisfies', () => {
    const out = reorderDefaultExportPagesInSource(withoutSatisfies, [1, 2, 0]);
    expect(out).toContain('export default [B, C, A];');
  });

  it('is a no-op for the identity permutation (returns input unchanged)', () => {
    expect(reorderDefaultExportPagesInSource(withSatisfies, [0, 1, 2])).toBe(withSatisfies);
  });

  it('returns null on length mismatch', () => {
    expect(reorderDefaultExportPagesInSource(withSatisfies, [0, 1])).toBeNull();
    expect(reorderDefaultExportPagesInSource(withSatisfies, [0, 1, 2, 3])).toBeNull();
  });

  it('returns null on duplicate indices', () => {
    expect(reorderDefaultExportPagesInSource(withSatisfies, [0, 0, 2])).toBeNull();
  });

  it('returns null on out-of-range indices', () => {
    expect(reorderDefaultExportPagesInSource(withSatisfies, [0, 1, 5])).toBeNull();
    expect(reorderDefaultExportPagesInSource(withSatisfies, [-1, 1, 2])).toBeNull();
  });

  it('returns null when the default export is not an array', () => {
    const source = `const A = () => null;\nexport default A;\n`;
    expect(reorderDefaultExportPagesInSource(source, [0])).toBeNull();
  });

  it('returns null when there is no default export', () => {
    expect(reorderDefaultExportPagesInSource('// nothing\n', [])).toBeNull();
  });

  it('returns the input unchanged for an empty array (zero-length identity)', () => {
    const empty = `export default [];\n`;
    expect(reorderDefaultExportPagesInSource(empty, [])).toBe(empty);
  });

  it('preserves the rest of the file (component bodies, imports, meta)', () => {
    const out = reorderDefaultExportPagesInSource(withSatisfies, [2, 1, 0]);
    expect(out).not.toBeNull();
    expect(out).toContain('const A = () => null;');
    expect(out).toContain('const B = () => null;');
    expect(out).toContain('const C = () => null;');
  });
});

describe('reorderNotesArrayInSource', () => {
  it('returns the source unchanged when there is no notes export', () => {
    const source = `export default [];\n`;
    expect(reorderNotesArrayInSource(source, [])).toBe(source);
  });

  it('reorders notes alongside pages', () => {
    const source = [
      'export const notes: (string | undefined)[] = [',
      '  "first",',
      '  "second",',
      '  "third",',
      '];',
      'export default [A, B, C];',
      '',
    ].join('\n');
    const out = reorderNotesArrayInSource(source, [2, 0, 1]);
    expect(out).not.toBeNull();
    expect(out).toContain(
      'export const notes: (string | undefined)[] = [\n  "third",\n  "first",\n  "second",\n];',
    );
  });

  it('preserves template-literal notes verbatim', () => {
    const source = [
      'export const notes = [',
      '  `multi',
      'line`,',
      '  "second",',
      '];',
      'export default [A, B];',
      '',
    ].join('\n');
    const out = reorderNotesArrayInSource(source, [1, 0]);
    expect(out).not.toBeNull();
    expect(out).toContain('export const notes = [\n  "second",\n  `multi\nline`,\n];');
  });

  it('pads with undefined when notes is shorter than pages', () => {
    const source = ['export const notes = ["only"];', 'export default [A, B, C];', ''].join('\n');
    const out = reorderNotesArrayInSource(source, [2, 0, 1]);
    expect(out).not.toBeNull();
    expect(out).toContain('export const notes = [\n  undefined,\n  "only",\n];');
  });

  it('trims trailing undefined entries', () => {
    const source = [
      'export const notes = [',
      '  undefined,',
      '  "kept",',
      '  undefined,',
      '];',
      'export default [A, B, C];',
      '',
    ].join('\n');
    const out = reorderNotesArrayInSource(source, [2, 0, 1]);
    expect(out).not.toBeNull();
    expect(out).toContain('export const notes = [\n  undefined,\n  undefined,\n  "kept",\n];');
  });

  it('collapses to [] when reorder leaves only undefineds', () => {
    const source = ['export const notes = [', '  "x",', '];', 'export default [A, B];', ''].join(
      '\n',
    );
    const out = reorderNotesArrayInSource(source, [1, 1]);
    expect(out).not.toBeNull();
    expect(out).toContain('export const notes = [];');
  });

  it('returns the source unchanged for an identity-like reorder of an empty notes array', () => {
    const source = `export const notes = [];\nexport default [A, B];\n`;
    expect(reorderNotesArrayInSource(source, [0, 1])).toBe(source);
  });

  it('returns null on out-of-range indices', () => {
    const source = `export const notes = ["a", "b"];\nexport default [A, B];\n`;
    expect(reorderNotesArrayInSource(source, [-1, 0])).toBeNull();
  });

  it('returns null when notes is not an array literal', () => {
    const source = `export const notes = "oops";\nexport default [A];\n`;
    expect(reorderNotesArrayInSource(source, [0])).toBeNull();
  });
});

describe('removePageFromDefaultExportInSource', () => {
  const multiline = `import type { Page } from '@open-slide/core';
const A = () => null;
const B = () => null;
const C = () => null;
export default [
  A,
  B,
  C,
] satisfies Page[];
`;

  const inline = `const A = () => null;
const B = () => null;
const C = () => null;
export default [A, B, C];
`;

  it('removes the first element', () => {
    const out = removePageFromDefaultExportInSource(multiline, 0);
    expect(out).not.toBeNull();
    expect(out).toContain('export default [\n  B,\n  C,\n] satisfies Page[];');
  });

  it('removes a middle element', () => {
    const out = removePageFromDefaultExportInSource(multiline, 1);
    expect(out).not.toBeNull();
    expect(out).toContain('export default [\n  A,\n  C,\n] satisfies Page[];');
  });

  it('removes the last element', () => {
    const out = removePageFromDefaultExportInSource(multiline, 2);
    expect(out).not.toBeNull();
    expect(out).toContain('export default [\n  A,\n  B,\n] satisfies Page[];');
  });

  it('handles inline arrays', () => {
    expect(removePageFromDefaultExportInSource(inline, 1)).toContain('export default [A, C];');
  });

  it('collapses to an empty array when removing the only element', () => {
    const single = `const A = () => null;\nexport default [A];\n`;
    const out = removePageFromDefaultExportInSource(single, 0);
    expect(out).toContain('export default [];');
  });

  it('returns null on out-of-range indices', () => {
    expect(removePageFromDefaultExportInSource(multiline, -1)).toBeNull();
    expect(removePageFromDefaultExportInSource(multiline, 3)).toBeNull();
  });

  it('returns null when the default export is not an array', () => {
    expect(removePageFromDefaultExportInSource(`export default A;\n`, 0)).toBeNull();
  });
});

describe('duplicatePageInDefaultExportInSource', () => {
  const multiline = `import type { Page } from '@open-slide/core';
const A = () => null;
const B = () => null;
const C = () => null;
export default [
  A,
  B,
  C,
] satisfies Page[];
`;

  const inline = `const A = () => null;\nconst B = () => null;\nexport default [A, B];\n`;

  it('duplicates a middle element after itself', () => {
    const out = duplicatePageInDefaultExportInSource(multiline, 1);
    expect(out).not.toBeNull();
    expect(out).toContain('export default [\n  A,\n  B,\n  B,\n  C,\n] satisfies Page[];');
  });

  it('duplicates the first element', () => {
    const out = duplicatePageInDefaultExportInSource(multiline, 0);
    expect(out).toContain('export default [\n  A,\n  A,\n  B,\n  C,\n] satisfies Page[];');
  });

  it('duplicates the last element', () => {
    const out = duplicatePageInDefaultExportInSource(multiline, 2);
    expect(out).toContain('export default [\n  A,\n  B,\n  C,\n  C,\n] satisfies Page[];');
  });

  it('handles inline arrays', () => {
    expect(duplicatePageInDefaultExportInSource(inline, 0)).toContain('export default [A, A, B];');
  });

  it('duplicates the only element in a single-element array', () => {
    const single = `const A = () => null;\nexport default [A];\n`;
    const out = duplicatePageInDefaultExportInSource(single, 0);
    expect(out).toContain('export default [A, A];');
  });

  it('returns null on out-of-range indices', () => {
    expect(duplicatePageInDefaultExportInSource(multiline, -1)).toBeNull();
    expect(duplicatePageInDefaultExportInSource(multiline, 3)).toBeNull();
  });

  it('returns null when the default export is not an array', () => {
    expect(duplicatePageInDefaultExportInSource(`export default A;\n`, 0)).toBeNull();
  });
});

describe('validateAssetName', () => {
  it('accepts simple filenames with extensions', () => {
    expect(validateAssetName('logo.svg')).toBe('logo.svg');
    expect(validateAssetName('a-b_c.1.png')).toBe('a-b_c.1.png');
  });

  it('accepts spaces, parens, and unicode in names', () => {
    expect(validateAssetName('hello world.png')).toBe('hello world.png');
    expect(validateAssetName('IMG (1).jpg')).toBe('IMG (1).jpg');
    expect(validateAssetName('café.png')).toBe('café.png');
    expect(validateAssetName('截圖.png')).toBe('截圖.png');
  });

  it('rejects names without an extension', () => {
    expect(validateAssetName('README')).toBeNull();
    expect(validateAssetName('foo.')).toBeNull();
  });

  it('rejects path-traversal and separators', () => {
    expect(validateAssetName('../foo.png')).toBeNull();
    expect(validateAssetName('foo/bar.png')).toBeNull();
    expect(validateAssetName('foo\\bar.png')).toBeNull();
  });

  it('rejects leading dots, tildes, and shell-unsafe characters', () => {
    expect(validateAssetName('.hidden.png')).toBeNull();
    expect(validateAssetName('~foo.png')).toBeNull();
    expect(validateAssetName('foo\x00bar.png')).toBeNull();
    expect(validateAssetName('foo*.png')).toBeNull();
    expect(validateAssetName('foo?.png')).toBeNull();
  });

  it('rejects empty / non-string / overlong names', () => {
    expect(validateAssetName('')).toBeNull();
    expect(validateAssetName(null)).toBeNull();
    expect(validateAssetName(42)).toBeNull();
    expect(validateAssetName(`${'x'.repeat(120)}.png`)).toBeNull();
  });
});

describe('mimeForFilename', () => {
  it('maps known extensions', () => {
    expect(mimeForFilename('a.png')).toBe('image/png');
    expect(mimeForFilename('a.JPG')).toBe('image/jpeg');
    expect(mimeForFilename('a.svg')).toBe('image/svg+xml');
    expect(mimeForFilename('a.woff2')).toBe('font/woff2');
    expect(mimeForFilename('a.mp4')).toBe('video/mp4');
  });

  it('falls back to octet-stream for unknown / missing extensions', () => {
    expect(mimeForFilename('a.xyz')).toBe('application/octet-stream');
    expect(mimeForFilename('noext')).toBe('application/octet-stream');
  });
});

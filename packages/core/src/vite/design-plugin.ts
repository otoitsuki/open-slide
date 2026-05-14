import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { parse as babelParse } from '@babel/parser';
import type { Connect, Plugin, ViteDevServer } from 'vite';
import { type DesignSystem, defaultDesign, mergeDesign } from '../app/lib/design.ts';
import type { AstNode } from './babel-walk.ts';

const SLIDE_ID_RE = /^[a-z0-9_-]+$/i;

async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

type ResolvedSlidePath = {
  entry: string;
  designPath: string;
  isMarkdown: boolean;
};

function resolveSlidePath(
  userCwd: string,
  slidesDir: string,
  slideId: string,
): ResolvedSlidePath | null {
  if (!SLIDE_ID_RE.test(slideId)) return null;
  const slidesRoot = path.resolve(userCwd, slidesDir);
  const slideRoot = path.resolve(slidesRoot, slideId);
  if (!slideRoot.startsWith(`${slidesRoot}${path.sep}`)) return null;
  const tsx = path.join(slideRoot, 'index.tsx');
  const md = path.join(slideRoot, 'index.md');
  const entry = existsSync(tsx) ? tsx : existsSync(md) ? md : tsx;
  return {
    entry,
    designPath: path.join(slideRoot, 'design.json'),
    isMarkdown: entry.endsWith('.md'),
  };
}

function parseSource(source: string): AstNode | null {
  try {
    return babelParse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    }) as unknown as AstNode;
  } catch {
    return null;
  }
}

type DesignDeclLocation = {
  declStart: number;
  declEnd: number;
  objectStart: number;
  objectEnd: number;
};

type DesignDeclInfo = DesignDeclLocation & {
  kind: 'merge' | 'object';
  exported: boolean;
  objectNode: AstNode;
};

function unwrapTypeAssertion(node: AstNode): AstNode {
  if (node.type === 'TSSatisfiesExpression' || node.type === 'TSAsExpression') {
    const expr = (node as unknown as { expression?: AstNode }).expression;
    if (expr) return expr;
  }
  return node;
}

function extractMergeDesignPatchNode(callNode: AstNode): AstNode | null {
  const callee = (callNode as unknown as { callee?: { type?: string; name?: string } }).callee;
  if (callee?.type !== 'Identifier' || callee.name !== 'mergeDesign') return null;
  const args = (callNode as unknown as { arguments?: AstNode[] }).arguments ?? [];
  if (args.length < 2) return null;
  const patch = unwrapTypeAssertion(args[1]);
  return patch.type === 'ObjectExpression' ? patch : null;
}

function enumerateDesignDeclarations(ast: AstNode): DesignDeclInfo[] {
  const body = (ast as unknown as { program?: { body?: AstNode[] } }).program?.body ?? [];
  const out: DesignDeclInfo[] = [];
  for (const node of body) {
    let varDecl: AstNode | null = null;
    let exported = false;
    if (node.type === 'VariableDeclaration') {
      varDecl = node;
    } else if (node.type === 'ExportNamedDeclaration') {
      const decl = (node as unknown as { declaration?: AstNode | null }).declaration;
      if (decl?.type === 'VariableDeclaration') {
        varDecl = decl;
        exported = true;
      }
    }
    if (!varDecl) continue;
    const declarations = (varDecl as unknown as { declarations?: AstNode[] }).declarations ?? [];
    for (const d of declarations) {
      const id = (d as unknown as { id?: { type?: string; name?: string } }).id;
      if (!id || id.type !== 'Identifier' || id.name !== 'design') continue;
      const init = (d as unknown as { init?: AstNode | null }).init;
      if (!init) continue;
      const inner = unwrapTypeAssertion(init);
      if (inner.type === 'ObjectExpression') {
        out.push({
          declStart: node.start,
          declEnd: node.end,
          objectStart: inner.start,
          objectEnd: inner.end,
          kind: 'object',
          exported,
          objectNode: inner,
        });
      } else if (inner.type === 'CallExpression') {
        const patch = extractMergeDesignPatchNode(inner);
        if (patch) {
          out.push({
            declStart: node.start,
            declEnd: node.end,
            objectStart: patch.start,
            objectEnd: patch.end,
            kind: 'merge',
            exported,
            objectNode: patch,
          });
        }
      }
    }
  }
  return out;
}

function rankDesignDecl(d: DesignDeclInfo): number {
  if (d.kind === 'merge' && d.exported) return 0;
  if (d.kind === 'merge') return 1;
  if (d.exported) return 2;
  return 3;
}

function pickPrimaryDesignDecl(decls: DesignDeclInfo[]): DesignDeclInfo | null {
  if (decls.length === 0) return null;
  return decls.reduce((best, cur) => {
    const rb = rankDesignDecl(best);
    const rc = rankDesignDecl(cur);
    if (rc < rb) return cur;
    if (rc > rb) return best;
    return cur.declStart > best.declStart ? cur : best;
  });
}

function literalToValue(node: AstNode): unknown {
  switch (node.type) {
    case 'StringLiteral':
      return (node as unknown as { value: string }).value;
    case 'NumericLiteral':
      return (node as unknown as { value: number }).value;
    case 'BooleanLiteral':
      return (node as unknown as { value: boolean }).value;
    case 'NullLiteral':
      return null;
    case 'UnaryExpression': {
      const op = (node as unknown as { operator: string }).operator;
      const arg = (node as unknown as { argument: AstNode }).argument;
      const v = literalToValue(arg);
      if (op === '-' && typeof v === 'number') return -v;
      if (op === '+' && typeof v === 'number') return v;
      throw new Error(`unsupported unary operator ${op}`);
    }
    case 'TemplateLiteral': {
      const quasis = (node as unknown as { quasis: AstNode[] }).quasis;
      const expressions = (node as unknown as { expressions: AstNode[] }).expressions;
      if (expressions.length > 0) throw new Error('template literal has expressions');
      return ((quasis[0] as unknown as { value: { cooked?: string; raw: string } }).value.cooked ??
        (quasis[0] as unknown as { value: { raw: string } }).value.raw) as string;
    }
    case 'ArrayExpression': {
      const elements = (node as unknown as { elements: (AstNode | null)[] }).elements;
      return elements.map((el) => {
        if (!el) throw new Error('array has hole');
        return literalToValue(el);
      });
    }
    case 'ObjectExpression': {
      const properties = (node as unknown as { properties: AstNode[] }).properties;
      const out: Record<string, unknown> = {};
      for (const prop of properties) {
        if (prop.type !== 'ObjectProperty') {
          throw new Error('object has spread or method');
        }
        const p = prop as unknown as {
          computed?: boolean;
          key: { type?: string; name?: string; value?: string };
          value: AstNode;
        };
        if (p.computed) throw new Error('object has computed key');
        let key: string;
        if (p.key.type === 'Identifier' && typeof p.key.name === 'string') key = p.key.name;
        else if (p.key.type === 'StringLiteral' && typeof p.key.value === 'string') {
          key = p.key.value;
        } else throw new Error('unsupported object key');
        out[key] = literalToValue(p.value);
      }
      return out;
    }
    default:
      throw new Error(`unsupported node type ${node.type}`);
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function jsString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function serializeValue(value: unknown, level: number): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return jsString(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non-finite number');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = value.map((el) => serializeValue(el, level + 1)).join(', ');
    return `[${inner}]`;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const childIndent = indent(level + 1);
    const lines = entries.map(([k, v]) => {
      const key = isValidIdentifier(k) ? k : jsString(k);
      return `${childIndent}${key}: ${serializeValue(v, level + 1)},`;
    });
    return `{\n${lines.join('\n')}\n${indent(level)}}`;
  }
  throw new Error(`unsupported value type ${typeof value}`);
}

export function serializeDesign(design: DesignSystem): string {
  return serializeValue(design as unknown as Record<string, unknown>, 0);
}

function serializeDesignJson(design: DesignSystem): string {
  return `${JSON.stringify(design, null, 2)}\n`;
}

async function readMarkdownDesign(
  file: string,
): Promise<{ design: DesignSystem; exists: boolean; warning: string | null }> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesignSystem>;
    return { design: mergeDesign(defaultDesign, parsed), exists: true, warning: null };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { design: defaultDesign, exists: false, warning: null };
    }
    return {
      design: defaultDesign,
      exists: true,
      warning: `design.json could not be parsed: ${(err as Error).message}`,
    };
  }
}

export type ParsedSlideDesign =
  | { ok: true; design: DesignSystem; loc: DesignDeclLocation }
  | { ok: false; exists: false }
  | { ok: false; exists: true; error: string };

export function parseSlideDesign(source: string): ParsedSlideDesign {
  const ast = parseSource(source);
  if (!ast) return { ok: false, exists: true, error: 'could not parse slide source' };
  const primary = pickPrimaryDesignDecl(enumerateDesignDeclarations(ast));
  if (!primary) return { ok: false, exists: false };
  let value: unknown;
  try {
    value = literalToValue(primary.objectNode);
  } catch (err) {
    return { ok: false, exists: true, error: (err as Error).message };
  }
  const merged = mergeDesign(defaultDesign, value as Partial<DesignSystem>);
  const loc: DesignDeclLocation = {
    declStart: primary.declStart,
    declEnd: primary.declEnd,
    objectStart: primary.objectStart,
    objectEnd: primary.objectEnd,
  };
  return { ok: true, design: merged, loc };
}

type ImportInfo = { node: AstNode; source: string; specifiers: AstNode[] };

function findImports(ast: AstNode): ImportInfo[] {
  const body = (ast as unknown as { program?: { body?: AstNode[] } }).program?.body ?? [];
  const out: ImportInfo[] = [];
  for (const node of body) {
    if (node.type !== 'ImportDeclaration') continue;
    const src = (node as unknown as { source?: { value?: unknown } }).source?.value;
    if (typeof src !== 'string') continue;
    const specs = (node as unknown as { specifiers?: AstNode[] }).specifiers ?? [];
    out.push({ node, source: src, specifiers: specs });
  }
  return out;
}

function ensureDesignSystemImport(
  source: string,
  ast: AstNode,
): { source: string; offsetShift: number } {
  const imports = findImports(ast);
  const coreImport = imports.find((imp) => imp.source === '@open-slide/core');
  if (coreImport) {
    const hasDesignSystem = coreImport.specifiers.some((spec) => {
      if (spec.type !== 'ImportSpecifier') return false;
      const imported = (spec as unknown as { imported?: { name?: string } }).imported;
      return imported?.name === 'DesignSystem';
    });
    if (hasDesignSystem) return { source, offsetShift: 0 };

    // Insert DesignSystem into the existing import list. Find the closing brace.
    const node = coreImport.node;
    const importText = source.slice(node.start, node.end);
    const braceClose = importText.lastIndexOf('}');
    if (braceClose === -1) return { source, offsetShift: 0 };
    const absoluteBrace = node.start + braceClose;
    // Detect if last named specifier already typed; we add `type DesignSystem` to keep it type-only.
    const insertText =
      coreImport.specifiers.length > 0 ? ', type DesignSystem' : 'type DesignSystem';
    const next = `${source.slice(0, absoluteBrace)}${insertText}${source.slice(absoluteBrace)}`;
    return { source: next, offsetShift: insertText.length };
  }

  // No @open-slide/core import — add one after the last import (or at top).
  const stmt = `import type { DesignSystem } from '@open-slide/core';\n`;
  if (imports.length > 0) {
    const last = imports[imports.length - 1];
    const insertAt = last.node.end;
    const trail = source[insertAt] === '\n' ? '' : '\n';
    const next = `${source.slice(0, insertAt)}\n${stmt.slice(0, -1)}${trail}${source.slice(insertAt)}`;
    return { source: next, offsetShift: 1 + stmt.length - (trail ? 0 : 1) };
  }
  const next = `${stmt}\n${source}`;
  return { source: next, offsetShift: stmt.length + 1 };
}

function findInsertionPoint(source: string, ast: AstNode): number {
  const imports = findImports(ast);
  if (imports.length === 0) return 0;
  const last = imports[imports.length - 1];
  let off = last.node.end;
  // Walk past trailing whitespace on the same line to land at the next line break.
  while (off < source.length && source[off] !== '\n') off++;
  if (off < source.length) off++;
  return off;
}

export type WriteResult =
  | { ok: true; source: string; created: boolean }
  | { ok: false; status: number; error: string };

export function applyDesignWrite(source: string, next: DesignSystem): WriteResult {
  let body: string;
  try {
    body = serializeDesign(next);
  } catch (err) {
    return { ok: false, status: 422, error: `serialize failed: ${(err as Error).message}` };
  }

  const ast = parseSource(source);
  if (!ast) return { ok: false, status: 422, error: 'could not parse slide source' };

  const decls = enumerateDesignDeclarations(ast);
  const primary = pickPrimaryDesignDecl(decls);
  if (primary) {
    let s = source;
    const others = decls.filter((d) => d !== primary);
    others.sort((a, b) => b.declStart - a.declStart);
    for (const o of others) {
      s = s.slice(0, o.declStart) + s.slice(o.declEnd);
    }
    const ast2 = parseSource(s);
    if (!ast2)
      return { ok: false, status: 422, error: 'could not parse slide source after cleanup' };
    const primary2 = pickPrimaryDesignDecl(enumerateDesignDeclarations(ast2));
    if (!primary2) {
      return { ok: false, status: 422, error: 'lost design declaration after removing duplicates' };
    }
    const out = s.slice(0, primary2.objectStart) + body + s.slice(primary2.objectEnd);
    return { ok: true, source: out, created: false };
  }

  const withImport = ensureDesignSystemImport(source, ast);
  const ast2 = parseSource(withImport.source);
  if (!ast2) {
    return { ok: false, status: 422, error: 'failed to re-parse after adding import' };
  }
  const insertAt = findInsertionPoint(withImport.source, ast2);
  const block = `\nconst design: DesignSystem = ${body};\n`;
  const out = withImport.source.slice(0, insertAt) + block + withImport.source.slice(insertAt);
  return { ok: true, source: out, created: true };
}

export type DesignPluginOptions = {
  userCwd: string;
  slidesDir?: string;
};

export function designPlugin(opts: DesignPluginOptions): Plugin {
  const userCwd = opts.userCwd;
  const slidesDir = opts.slidesDir ?? 'slides';

  return {
    name: 'open-slide:design',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__design', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://local');
        const method = req.method ?? 'GET';
        const slideId = url.searchParams.get('slideId') ?? '';
        const resolved = resolveSlidePath(userCwd, slidesDir, slideId);
        if (!resolved) return json(res, 400, { error: 'invalid slideId' });

        try {
          if (method === 'GET' && url.pathname === '/') {
            if (resolved.isMarkdown) {
              const markdownDesign = await readMarkdownDesign(resolved.designPath);
              return json(res, 200, markdownDesign);
            }
            let source: string;
            try {
              source = await fs.readFile(resolved.entry, 'utf8');
            } catch {
              return json(res, 404, { error: 'slide not found' });
            }
            const parsed = parseSlideDesign(source);
            if (parsed.ok) {
              return json(res, 200, { design: parsed.design, exists: true, warning: null });
            }
            if (parsed.exists === false) {
              return json(res, 200, { design: defaultDesign, exists: false, warning: null });
            }
            return json(res, 200, { design: defaultDesign, exists: true, warning: parsed.error });
          }

          if (method === 'PUT' && url.pathname === '/') {
            const body = (await readBody(req)) as { patch?: Partial<DesignSystem> };
            const patch = body.patch;
            if (!patch || typeof patch !== 'object') {
              return json(res, 400, { error: 'missing patch object' });
            }
            if (resolved.isMarkdown) {
              const current = await readMarkdownDesign(resolved.designPath);
              if (current.warning) return json(res, 422, { error: current.warning });
              const merged = mergeDesign(current.design, patch);
              await fs.writeFile(resolved.designPath, serializeDesignJson(merged), 'utf8');
              return json(res, 200, { ok: true, design: merged, created: !current.exists });
            }
            let source: string;
            try {
              source = await fs.readFile(resolved.entry, 'utf8');
            } catch {
              return json(res, 404, { error: 'slide not found' });
            }
            const parsed = parseSlideDesign(source);
            const baseDesign = parsed.ok ? parsed.design : defaultDesign;
            if (!parsed.ok && parsed.exists) {
              return json(res, 422, { error: parsed.error });
            }
            const merged = mergeDesign(baseDesign, patch);
            const written = applyDesignWrite(source, merged);
            if (!written.ok) return json(res, written.status, { error: written.error });
            if (written.source !== source)
              await fs.writeFile(resolved.entry, written.source, 'utf8');
            return json(res, 200, { ok: true, design: merged, created: written.created });
          }

          if (method === 'POST' && url.pathname === '/reset') {
            if (resolved.isMarkdown) {
              await fs.writeFile(resolved.designPath, serializeDesignJson(defaultDesign), 'utf8');
              return json(res, 200, { ok: true, design: defaultDesign, created: true });
            }
            let source: string;
            try {
              source = await fs.readFile(resolved.entry, 'utf8');
            } catch {
              return json(res, 404, { error: 'slide not found' });
            }
            const written = applyDesignWrite(source, defaultDesign);
            if (!written.ok) return json(res, written.status, { error: written.error });
            if (written.source !== source)
              await fs.writeFile(resolved.entry, written.source, 'utf8');
            return json(res, 200, { ok: true, design: defaultDesign, created: written.created });
          }

          return next();
        } catch (err) {
          json(res, 500, { error: String((err as Error).message ?? err) });
        }
      });
    },
  };
}

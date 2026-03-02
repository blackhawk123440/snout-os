#!/usr/bin/env tsx
/**
 * CI guard: flag raw <button>, <input>, <textarea>, <select> in app/components.
 * Use Button, Input, Textarea, Select from @/components/ui instead.
 * Exceptions: components/ui (primitives), // ui-primitive-ok
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(process.cwd(), 'src');
const APP = join(SRC, 'app');
const COMPONENTS = join(SRC, 'components');

// Match raw HTML only (lowercase tags). React components use PascalCase (Button, Input).
const RAW_PATTERNS = [
  { re: /<\s*button[\s>]/g, tag: 'button' },
  { re: /<\s*input[\s\/>]/g, tag: 'input' },
  { re: /<\s*textarea[\s>]/g, tag: 'textarea' },
  { re: /<\s*select[\s>]/g, tag: 'select' },
];

const EXCLUDE_DIRS = ['node_modules', '__tests__', '.next'];
const EXCLUDE_PATTERNS = [
  /[\\/]ui[\\/]/,           // components/ui (primitives)
  /-legacy\./,
  /-old\./,
  /-backup\./,
  /page-legacy/,
  /page-old/,
];

function shouldExcludePath(filePath: string): boolean {
  const rel = filePath.replace(process.cwd() + '/', '').replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some((p) => p.test(rel));
}

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(e.name)) {
          collectTsxFiles(full, acc);
        }
      } else if (e.name.endsWith('.tsx')) {
        acc.push(full);
      }
    }
  } catch {
    // skip
  }
  return acc;
}

interface Violation {
  file: string;
  line: number;
  tag: string;
  excerpt: string;
}

function checkFile(filePath: string): Violation[] {
  if (shouldExcludePath(filePath)) return [];
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const prevLine = i > 0 ? lines[i - 1] : '';
    const hasExemption = line.includes('// ui-primitive-ok') || prevLine.trim().endsWith('// ui-primitive-ok');
    if (hasExemption) continue;

    for (const { re, tag } of RAW_PATTERNS) {
      const regex = new RegExp(re.source, re.flags);
      if (regex.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          tag,
          excerpt: line.trim().slice(0, 80),
        });
        break;
      }
    }
  }
  return violations;
}

const appFiles = collectTsxFiles(APP);
const componentFiles = collectTsxFiles(COMPONENTS).filter((f) => !f.includes('/ui/'));
const allFiles = [...appFiles, ...componentFiles];

const allViolations: Violation[] = [];
for (const f of allFiles) {
  allViolations.push(...checkFile(f));
}

if (allViolations.length > 0) {
  console.error('UI guard: use Button/Input/Textarea/Select from @/components/ui instead of raw HTML. Add // ui-primitive-ok to exempt.\n');
  const byFile = new Map<string, Violation[]>();
  for (const v of allViolations) {
    const rel = v.file.replace(process.cwd() + '/', '');
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel)!.push(v);
  }
  for (const [file, vs] of byFile) {
    console.error(`  ${file}:`);
    for (const v of vs.slice(0, 3)) {
      console.error(`    L${v.line}: <${v.tag}> - ${v.excerpt}${v.excerpt.length >= 80 ? '...' : ''}`);
    }
    if (vs.length > 3) console.error(`    ... and ${vs.length - 3} more`);
    console.error('');
  }
  process.exit(1);
}

console.log('UI guard: no raw button/input/textarea/select in app/components (excluding ui primitives and legacy)');
process.exit(0);

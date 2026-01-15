#!/usr/bin/env tsx
/**
 * UI Constitution Enforcement - Hardcoded Values Checker
 * 
 * Checks src/app/** files for violations:
 * - Hardcoded px, rem, %, vh, vw, hex, rgba values
 * - Overflow/overflow-y/overflow-auto outside approved components
 * - Tailwind layout classes used directly in pages
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const VIOLATIONS: Array<{ file: string; line: number; message: string }> = [];

// Approved components that can use overflow
const APPROVED_OVERFLOW_COMPONENTS = [
  'Modal',
  'Drawer',
  'BottomSheet',
  'Toast',
  'Table',
  'DataTable',
  'CardList',
];

// Approved overflow usage patterns
const APPROVED_OVERFLOW_PATTERNS = [
  /overflow-x:\s*hidden/, // Horizontal overflow prevention is OK
  /overflow:\s*hidden/, // In global styles
  /overflow-wrap/, // Text wrapping
  /word-wrap/, // Text wrapping
];

// Hardcoded value patterns to check
const HARDCODED_PATTERNS = [
  // Units
  /\b\d+px\b(?!['"])/g,  // px values (excluding strings)
  /\b\d+rem\b(?!['"])/g,  // rem values
  /\b\d+%\b(?!['"])/g,    // % values (excluding strings)
  /\b\d+vh\b(?!['"])/g,   // vh values
  /\b\d+vw\b(?!['"])/g,   // vw values
  // Colors
  /#[0-9a-fA-F]{3,6}\b(?!['"])/g,  // hex colors (excluding strings)
  /rgba?\([^)]+\)/g,  // rgba/rgb functions
];

// Tailwind layout classes to flag
const TAILWIND_LAYOUT_CLASSES = [
  'container',
  'mx-auto',
  'flex',
  'grid',
  'block',
  'inline-block',
  'hidden',
  'absolute',
  'relative',
  'fixed',
  'sticky',
];

function checkFile(filePath: string, relativePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Skip if it's an approved component
  const isApprovedComponent = APPROVED_OVERFLOW_COMPONENTS.some(comp => 
    relativePath.includes(`components/ui/${comp}`) || 
    relativePath.includes(`components/${comp}`)
  );
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();
    
    // Skip comments and strings
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
      return;
    }
    
    // Check for hardcoded values (but skip in string literals and comments)
    HARDCODED_PATTERNS.forEach((pattern, patternIndex) => {
      const matches = line.match(pattern);
      if (matches) {
        // Check if it's in a string literal or comment
        const beforeMatch = line.substring(0, line.indexOf(matches[0]));
        const inString = (beforeMatch.match(/['"`]/g) || []).length % 2 !== 0;
        const inComment = beforeMatch.includes('//') || beforeMatch.includes('/*');
        
        if (!inString && !inComment) {
          // Allow some exceptions:
          // - In design-tokens.ts (source of truth)
          // - In globals.css (CSS variable definitions)
          // - In tailwind.config.js (config)
          if (!relativePath.includes('design-tokens') && 
              !relativePath.includes('globals.css') && 
              !relativePath.includes('tailwind.config')) {
            const patternNames = ['px', 'rem/%/vh/vw', 'hex', 'rgba/rgb'];
            VIOLATIONS.push({
              file: relativePath,
              line: lineNum,
              message: `Hardcoded ${patternNames[patternIndex] || 'value'} found: ${matches[0]}. Use tokens instead.`,
            });
          }
        }
      }
    });
    
    // Check for overflow violations (only in src/app/**)
    if (relativePath.startsWith('src/app/')) {
      if (/\boverflow(-y|-x)?(-auto|-hidden|-scroll)?\s*:/.test(line)) {
        const isApprovedPattern = APPROVED_OVERFLOW_PATTERNS.some(pattern => pattern.test(line));
        const isApprovedFile = isApprovedComponent;
        
        if (!isApprovedPattern && !isApprovedFile) {
          VIOLATIONS.push({
            file: relativePath,
            line: lineNum,
            message: 'Overflow property found outside approved components. Use UI kit components instead.',
          });
        }
      }
    }
    
    // Check for Tailwind layout classes in pages (only in src/app/**/page.tsx)
    if (relativePath.match(/src\/app\/[^/]+\/page\.tsx?$/)) {
      TAILWIND_LAYOUT_CLASSES.forEach(className => {
        if (new RegExp(`["'\`]${className}["'\`]`).test(line) || 
            new RegExp(`className.*${className}`).test(line)) {
          VIOLATIONS.push({
            file: relativePath,
            line: lineNum,
            message: `Tailwind layout class "${className}" found. Use UI kit components instead.`,
          });
        }
      });
    }
  });
}

function walkDirectory(dir: string, baseDir: string) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = relative(baseDir, fullPath);
    const stat = statSync(fullPath);
    
    // Skip node_modules, .next, etc.
    if (entry.startsWith('.') || entry === 'node_modules' || entry === '.next' || entry === 'dist') {
      continue;
    }
    
    if (stat.isDirectory()) {
      walkDirectory(fullPath, baseDir);
    } else if (stat.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.css'))) {
      // Only check src/app/** files for violations
      if (relativePath.startsWith('src/app/')) {
        checkFile(fullPath, relativePath);
      }
    }
  }
}

// Main execution
const srcDir = join(process.cwd(), 'src');
const appDir = join(srcDir, 'app');

console.log('🔍 Checking UI Constitution violations...\n');

try {
  walkDirectory(appDir, process.cwd());
  
  if (VIOLATIONS.length === 0) {
    console.log('✅ No UI Constitution violations found!\n');
    process.exit(0);
  } else {
    console.error(`❌ Found ${VIOLATIONS.length} UI Constitution violation(s):\n`);
    VIOLATIONS.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    ${v.message}\n`);
    });
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking files:', error);
  process.exit(1);
}

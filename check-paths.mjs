#!/usr/bin/env node
/**
 * Validates all package configuration files for proper syntax and paths
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname);

const errors = [];
const warnings = [];

function checkJSON(filePath, description) {
  try {
    const content = readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ ${description}: Valid JSON`);
    return true;
  } catch (error) {
    errors.push(`${description}: ${error.message}`);
    console.error(`❌ ${description}: ${error.message}`);
    return false;
  }
}

function checkFileExists(filePath, description) {
  const fullPath = resolve(rootDir, filePath);
  if (existsSync(fullPath)) {
    console.log(`✅ ${description}: File exists`);
    return true;
  } else {
    warnings.push(`${description}: File not found at ${fullPath}`);
    console.warn(`⚠️  ${description}: File not found`);
    return false;
  }
}

function checkScriptPaths(packageJson) {
  const scripts = packageJson.scripts || {};
  for (const [name, command] of Object.entries(scripts)) {
    // Extract file paths from commands
    const fileMatch = command.match(/node\s+([^\s]+)/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      if (!filePath.startsWith('node_modules')) {
        checkFileExists(filePath, `Script "${name}" references`);
      }
    }
  }
}

function checkTypeScriptConfig() {
  try {
    const tsconfig = JSON.parse(readFileSync(join(rootDir, 'tsconfig.json'), 'utf8'));
    
    // Check referenced configs
    if (tsconfig.references) {
      for (const ref of tsconfig.references) {
        const refPath = join(rootDir, ref.path);
        if (!existsSync(refPath)) {
          errors.push(`tsconfig.json references missing file: ${ref.path}`);
        } else {
          console.log(`✅ tsconfig.json reference: ${ref.path} exists`);
        }
      }
    }
    
    // Check path mappings
    if (tsconfig.compilerOptions?.paths) {
      for (const [alias, paths] of Object.entries(tsconfig.compilerOptions.paths)) {
        for (const pathPattern of paths) {
          // Remove wildcard to check base directory
          const basePath = pathPattern.replace('/*', '');
          const fullPath = resolve(rootDir, basePath);
          if (!existsSync(fullPath)) {
            errors.push(`Path alias "${alias}" points to non-existent directory: ${basePath}`);
          } else {
            console.log(`✅ Path alias "${alias}" -> "${basePath}" exists`);
          }
        }
      }
    }
    
    // Check tsconfig.app.json paths
    const tsconfigApp = JSON.parse(readFileSync(join(rootDir, 'tsconfig.app.json'), 'utf8'));
    if (tsconfigApp.compilerOptions?.paths) {
      for (const [alias, paths] of Object.entries(tsconfigApp.compilerOptions.paths)) {
        for (const pathPattern of paths) {
          const basePath = pathPattern.replace('/*', '');
          const fullPath = resolve(rootDir, basePath);
          if (!existsSync(fullPath)) {
            errors.push(`tsconfig.app.json path alias "${alias}" points to non-existent directory: ${basePath}`);
          }
        }
      }
    }
    
    // Check include paths
    if (tsconfigApp.include) {
      for (const includePath of tsconfigApp.include) {
        const fullPath = resolve(rootDir, includePath);
        // Check if it's a directory or file
        if (includePath.includes('*')) {
          const dirPath = includePath.replace(/\*.*$/, '');
          const dirFullPath = resolve(rootDir, dirPath);
          if (!existsSync(dirFullPath)) {
            warnings.push(`tsconfig.app.json include pattern "${includePath}" - directory "${dirPath}" not found`);
          }
        } else if (!existsSync(fullPath)) {
          warnings.push(`tsconfig.app.json includes non-existent path: ${includePath}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Error checking TypeScript config: ${error.message}`);
  }
}

function checkViteConfig() {
  try {
    const viteConfigPath = join(rootDir, 'vite.config.ts');
    if (existsSync(viteConfigPath)) {
      const content = readFileSync(viteConfigPath, 'utf8');
      // Check for path.resolve usage
      const pathResolveMatch = content.match(/path\.resolve\(__dirname,\s*['"]([^'"]+)['"]\)/);
      if (pathResolveMatch) {
        const resolvedPath = pathResolveMatch[1];
        // This is a relative check - the path should exist when resolved
        console.log(`✅ vite.config.ts: Uses path.resolve for aliases`);
      }
    }
  } catch (error) {
    warnings.push(`Could not fully validate vite.config.ts: ${error.message}`);
  }
}

// Main validation
console.log('🔍 Validating package files...\n');

// Check JSON files
checkJSON(join(rootDir, 'package.json'), 'package.json');
checkJSON(join(rootDir, 'tsconfig.json'), 'tsconfig.json');
checkJSON(join(rootDir, 'tsconfig.app.json'), 'tsconfig.app.json');
checkJSON(join(rootDir, 'tsconfig.node.json'), 'tsconfig.node.json');
checkJSON(join(rootDir, 'components.json'), 'components.json');
checkJSON(join(rootDir, 'workflows', 'jarvis-portable-fixed.json'), 'jarvis-portable-fixed.json');
checkJSON(join(rootDir, 'workflows', 'jarvis-cartesia-voice.json'), 'jarvis-cartesia-voice.json');

console.log('\n📁 Checking file references...\n');

// Check package.json scripts
try {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  checkScriptPaths(packageJson);
} catch (error) {
  errors.push(`Error checking package.json scripts: ${error.message}`);
}

// Check TypeScript configs
console.log('\n📝 Checking TypeScript configuration...\n');
checkTypeScriptConfig();

// Check Vite config
console.log('\n⚡ Checking Vite configuration...\n');
checkViteConfig();

// Check critical files
console.log('\n📄 Checking critical files...\n');
checkFileExists('vite.config.ts', 'vite.config.ts');
checkFileExists('vitest.config.ts', 'vitest.config.ts');
checkFileExists('eslint.config.js', 'eslint.config.js');
checkFileExists('postcss.config.js', 'postcss.config.js');
checkFileExists('tailwind.config.ts', 'tailwind.config.ts');
checkFileExists('vite-env.d.ts', 'vite-env.d.ts');

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Validation Summary');
console.log('='.repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All package files are valid with proper syntax and paths!');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.error(`\n❌ Errors found (${errors.length}):`);
    errors.forEach(err => console.error(`  - ${err}`));
  }
  if (warnings.length > 0) {
    console.warn(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(warn => console.warn(`  - ${warn}`));
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

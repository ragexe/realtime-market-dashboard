// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', 'rxjs', 'rxjs/*'],
              message: 'Domain must stay framework-free: it is shared with the Web Worker.',
            },
            {
              group: ['**/app/**', '**/worker/**'],
              message: 'Domain must not depend on app or worker code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Compiled by AssemblyScript too: only a plain enum of integer literals
    files: ['src/domain/market-update-field.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > :not(ExportNamedDeclaration)',
          message: 'Shared with AssemblyScript: only `export enum` is allowed here.',
        },
        {
          selector: 'ExportNamedDeclaration > :not(TSEnumDeclaration)',
          message: 'Shared with AssemblyScript: only `export enum` is allowed here.',
        },
        {
          selector: 'TSEnumDeclaration[const=true]',
          message: 'Use a plain enum: `const enum` is unreliable with isolatedModules.',
        },
        {
          selector: 'TSEnumMember:not([initializer.type="Literal"][initializer.raw=/^[0-9]+$/])',
          message: 'Shared with AssemblyScript: every member needs an explicit integer literal.',
        },
      ],
    },
  },
  prettier,
]);

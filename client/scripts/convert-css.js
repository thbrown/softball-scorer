/**
 * Convert main.pre.css to main.css with CSS variables
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/css/main.pre.css');
const outputFile = path.join(__dirname, '../src/css/main.css');

let content = fs.readFileSync(inputFile, 'utf8');

// Replacement mappings - order matters! Replace longer patterns first to avoid partial replacements
const replacements = [
  // Colors - handle specific ones before generic ones
  ['$css.colors.PRIMARY_LIGHT', 'var(--color-primary-light)'],
  ['$css.colors.PRIMARY_DARK', 'var(--color-primary-dark)'],
  ['$css.colors.PRIMARY', 'var(--color-primary)'],
  ['$css.colors.SECONDARY_LIGHT', 'var(--color-secondary-light)'],
  ['$css.colors.SECONDARY_DARK', 'var(--color-secondary-dark)'],
  ['$css.colors.SECONDARY', 'var(--color-secondary)'],
  ['$css.colors.BACKGROUND', 'var(--color-background)'],
  ['$css.colors.TEXT_LIGHT', 'var(--color-text-light)'],
  ['$css.colors.TEXT_GREY', 'var(--color-text-grey)'],
  ['$css.colors.TEXT_DARK', 'var(--color-text-dark)'],
  ['$css.colors.TEXT_DESC', 'var(--color-text-desc)'],
  ['$css.colors.CANCEL', 'var(--color-cancel)'],
  ['$css.colors.DELETE', 'var(--color-delete)'],
  ['$css.colors.WHITE', 'var(--color-white)'],
  ['$css.colors.BLACK', 'var(--color-black)'],
  ['$css.colors.INVISIBLE', 'var(--color-invisible)'],
  ['$css.colors.DISABLED', 'var(--color-disabled)'],
  ['$css.colors.SEMI_TRANSPARENT', 'var(--color-semi-transparent)'],

  // Sizes
  ['$css.sizes.ICON', 'var(--size-icon)'],
  ['$css.sizes.fixed-table-header-height', 'var(--size-fixed-table-header-height)'],
  ['$css.sizes.fixed-table-col-width', 'var(--size-fixed-table-col-width)'],

  // Typography - handle specific sizes before generic
  ['$css.typography.size.xxSmall', 'var(--typography-size-xx-small)'],
  ['$css.typography.size.xSmall', 'var(--typography-size-x-small)'],
  ['$css.typography.size.xLarge', 'var(--typography-size-x-large)'],
  ['$css.typography.size.small', 'var(--typography-size-small)'],
  ['$css.typography.size.medium', 'var(--typography-size-medium)'],
  ['$css.typography.size.large', 'var(--typography-size-large)'],

  // Border radius - handle xLarge before others
  ['$css.borderRadius.xLarge', 'var(--border-radius-x-large)'],
  ['$css.borderRadius.small', 'var(--border-radius-small)'],
  ['$css.borderRadius.medium', 'var(--border-radius-medium)'],
  ['$css.borderRadius.large', 'var(--border-radius-large)'],

  // Spacing - handle xx and x before generic
  ['$css.spacing.xxSmall', 'var(--spacing-xx-small)'],
  ['$css.spacing.xSmall', 'var(--spacing-x-small)'],
  ['$css.spacing.xLarge', 'var(--spacing-x-large)'],
  ['$css.spacing.small', 'var(--spacing-small)'],
  ['$css.spacing.medium', 'var(--spacing-medium)'],
  ['$css.spacing.large', 'var(--spacing-large)'],

  // Border (must come after borderRadius)
  ['$css.border', 'var(--border)'],

  // Config
  ['$css.config.SYNC_DELAY', 'var(--config-sync-delay)'],

  // Box shadow
  ['$css.boxShadow.paper', 'var(--box-shadow-paper)'],

  // Special case: darken function (line 937)
  // PRIMARY (#388e3c) darkened by 10% = approximately #2d7230
  ['darken(var(--color-primary), 10%)', '#2d7230'],
];

// Apply all replacements
for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

// Add CSS variables import at the top
const cssContent = `@import './variables.css';

${content}`;

fs.writeFileSync(outputFile, cssContent, 'utf8');

console.log(`✅ Converted main.pre.css to main.css`);
console.log(`   Input:  ${inputFile}`);
console.log(`   Output: ${outputFile}`);

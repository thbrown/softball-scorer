/**
 * Watch theme.js for changes and auto-regenerate CSS variables in dev mode
 * This enables hot reload when theme values are modified
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const themeFile = path.join(__dirname, '../src/css/theme.js');
const variablesFile = path.join(__dirname, '../src/css/variables.css');

console.log('👀 Watching theme.js for changes...');
console.log(`   Theme: ${themeFile}`);
console.log(`   Output: ${variablesFile}`);

// Initial generation
console.log('\n🔨 Generating initial CSS variables...');
try {
  execSync('node scripts/generate-css-vars.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Initial generation failed:', error.message);
  process.exit(1);
}

// Watch for changes
fs.watch(themeFile, (eventType) => {
  if (eventType === 'change') {
    console.log('\n🔄 theme.js changed, regenerating CSS variables...');
    try {
      execSync('node scripts/generate-css-vars.js', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('✅ CSS variables updated - Vite will hot reload\n');
    } catch (error) {
      console.error('❌ Generation failed:', error.message);
    }
  }
});

console.log('\n✨ Watching for theme.js changes (Ctrl+C to stop)\n');

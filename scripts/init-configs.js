// Copies config templates to their active locations if they don't already exist.
// Runs via the root postinstall hook (Yarn) or `yarn setup` / `npm run setup`.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const configs = [
  ['client/src/config.template.ts', 'client/src/config.ts'],
  ['server/config.template.jsonc', 'server/config.jsonc'],
];

for (const [template, target] of configs) {
  const src = path.join(root, template);
  const dst = path.join(root, target);
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log(`Created ${target} from template.`);
  }
}

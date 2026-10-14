// Usage: node preview/build-index.js edits.json > out.html
// Prints the claude.ai preview page (index.html) carrying the given saved text edits.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'ree-edit.js'), 'utf8');
const tpl = src.slice(0, src.indexOf('/* R.E.E'));
const window = {}; eval(tpl);
const edits = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : [];
process.stdout.write(window.__REE_PAGE(edits));

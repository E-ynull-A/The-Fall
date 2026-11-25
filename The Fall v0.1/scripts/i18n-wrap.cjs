/**
 * One-off codemod: wraps JSX text and user-facing string attributes in tr().
 * Uses the TypeScript parser so only real JSX text is touched.
 * Usage: node scripts/i18n-wrap.cjs <out.json>
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ATTRS = new Set(['title', 'subtitle', 'aria-label', 'label', 'placeholder']);
const found = new Set();

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

for (const file of [...walk(path.join(root, 'src/components')), ...walk(path.join(root, 'src/app'))]) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.JsxText) {
      const raw = node.getFullText(sf);
      if (/[A-Za-z]{2,}/.test(raw)) {
        const collapsed = raw.replace(/\s+/g, ' ');
        const trimmed = collapsed.trim();
        // JSX keeps a single space where text touches a sibling on the same line.
        const lead = /^\s/.test(raw) && !/^\s*\n/.test(raw) ? "{' '}" : '';
        const trail = /\s$/.test(raw) && !/\n\s*$/.test(raw) ? "{' '}" : '';
        found.add(trimmed);
        edits.push([node.getFullStart(), node.getEnd(), `${lead}{tr(${q(trimmed)})}${trail}`]);
      }
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf);
      const value = node.initializer.text;
      if (ATTRS.has(name) && /[A-Za-z]{2,}/.test(value)) {
        found.add(value);
        edits.push([node.initializer.getStart(sf), node.initializer.getEnd(), `{tr(${q(value)})}`]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (edits.length === 0) continue;

  let out = text;
  for (const [s, e, r] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e);
  if (!/import \{ tr \} from/.test(out)) {
    let rel = path.relative(path.dirname(file), path.join(root, 'src/i18n/i18n')).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    out = `import { tr } from '${rel}';\n` + out;
  }
  fs.writeFileSync(file, out);
}

fs.writeFileSync(process.argv[2] || 'ui-strings.json', JSON.stringify([...found].sort(), null, 1));
console.log(found.size, 'strings');

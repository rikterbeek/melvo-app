/**
 * A deliberately small YAML reader for the one workflow file this repository
 * owns. It supports block mappings, block sequences (always indented under
 * their key), quoted and plain scalars, and comments — nothing else.
 *
 * Keys are kept verbatim, so the workflow's `on:` stays the string "on"
 * instead of being folded to a boolean the way YAML 1.1 would.
 */

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function toLines(text) {
  return text
    .split('\n')
    .map(stripComment)
    .filter((line) => line.trim() !== '')
    .map((line) => ({ indent: line.length - line.trimStart().length, content: line.trim() }));
}

function parseScalar(raw) {
  const value = raw.trim();
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return value.slice(1, -1);
  return value;
}

function splitEntry(content) {
  const separator = content.match(/^([^:]+):(?:\s+(.*))?$/);
  return separator ? { key: parseScalar(separator[1]), rest: separator[2] ?? '' } : null;
}

function parseMapping(lines, start, indent) {
  const result = {};
  let i = start;
  while (i < lines.length && lines[i].indent === indent && !lines[i].content.startsWith('-')) {
    const entry = splitEntry(lines[i].content);
    if (!entry) break;
    i += 1;
    if (entry.rest !== '') {
      result[entry.key] = parseScalar(entry.rest);
    } else if (i < lines.length && lines[i].indent > indent) {
      const [value, next] = parseBlock(lines, i, lines[i].indent);
      result[entry.key] = value;
      i = next;
    } else {
      result[entry.key] = null;
    }
  }
  return [result, i];
}

function parseSequence(lines, start, indent) {
  const items = [];
  let i = start;
  while (i < lines.length && lines[i].indent === indent && lines[i].content.startsWith('- ')) {
    const itemIndent = indent + 2;
    const block = [{ indent: itemIndent, content: lines[i].content.slice(2).trim() }];
    i += 1;
    while (i < lines.length && lines[i].indent > indent) {
      block.push(lines[i]);
      i += 1;
    }
    const isScalar = block.length === 1 && splitEntry(block[0].content) === null;
    items.push(isScalar ? parseScalar(block[0].content) : parseBlock(block, 0, itemIndent)[0]);
  }
  return [items, i];
}

function parseBlock(lines, start, indent) {
  return lines[start].content.startsWith('- ')
    ? parseSequence(lines, start, indent)
    : parseMapping(lines, start, indent);
}

export function parseYamlSubset(text) {
  const lines = toLines(text);
  if (lines.length === 0) return {};
  return parseBlock(lines, 0, lines[0].indent)[0];
}

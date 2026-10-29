/**
 * Facts about the published HTML document, read straight from its source so a
 * test can assert the PRD-1 §6 page requirements without a browser.
 */

const ATTRIBUTE_REFERENCE = /\b(?:src|href|srcset)\s*=\s*["']([^"']+)["']/gi;
const SCRIPT_TAG = /<script\b[^>]*>/gi;
const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(value) {
  return value.replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity);
}

function toText(fragment) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attribute(html, tagPattern, name) {
  const tag = html.match(tagPattern);
  if (!tag) return null;
  const found = tag[0].match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return found ? found[1] : null;
}

function metaContent(html, metaName) {
  const pattern = new RegExp(`<meta\\b[^>]*\\bname\\s*=\\s*["']${metaName}["'][^>]*>`, 'i');
  return attribute(html, pattern, 'content');
}

function externalReferences(html) {
  return [...html.matchAll(ATTRIBUTE_REFERENCE)]
    .map((match) => match[1])
    .filter((value) => /^(?:https?:)?\/\//i.test(value));
}

function headings(html) {
  return [...html.matchAll(HEADING)].map((match) => toText(match[2]));
}

export function inspectHtmlDocument(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  return {
    hasDoctype: /^\s*<!doctype html>/i.test(html),
    lang: attribute(html, /<html\b[^>]*>/i, 'lang'),
    charset: attribute(html, /<meta\b[^>]*\bcharset\b[^>]*>/i, 'charset')?.toLowerCase() ?? null,
    viewport: metaContent(html, 'viewport'),
    title: toText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    headings: headings(html),
    scriptTags: html.match(SCRIPT_TAG) ?? [],
    externalReferences: externalReferences(html),
    text: toText(body ? body[1] : html),
  };
}

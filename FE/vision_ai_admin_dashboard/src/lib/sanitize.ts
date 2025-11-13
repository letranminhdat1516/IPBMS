import DOMPurify from 'dompurify';

const ALLOWED_STYLE_PROPERTIES = new Set(['color', 'background-color']);
const COLOR_VALUE_PATTERN =
  /^(#[0-9a-f]{3,8}|rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)|transparent|inherit|currentcolor|var\(--[\w-]+\))$/i;

const sanitizeStyleAttribute = (style: string): string | null => {
  const declarations = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean);

  const filtered = declarations
    .map((declaration) => {
      const [propertyRaw, valueRaw] = declaration.split(':');
      if (!propertyRaw || !valueRaw) return null;
      const property = propertyRaw.trim().toLowerCase();
      if (!ALLOWED_STYLE_PROPERTIES.has(property)) return null;

      const value = valueRaw.trim();
      if (
        (property === 'color' || property === 'background-color') &&
        !COLOR_VALUE_PATTERN.test(value)
      ) {
        return null;
      }

      return `${property}: ${value}`;
    })
    .filter(Boolean) as string[];

  return filtered.length > 0 ? filtered.join('; ') : null;
};

const cleanInlineStyles = (html: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('[style]').forEach((el) => {
      const current = el.getAttribute('style') ?? '';
      const sanitized = sanitizeStyleAttribute(current);
      if (sanitized) {
        el.setAttribute('style', sanitized);
      } else {
        el.removeAttribute('style');
      }
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

// Use DOMPurify in the browser if available; fallback to a conservative DOMParser-based sanitizer.
export function sanitizeHtml(input: string | undefined): string {
  if (!input) return '';

  try {
    // If running in a browser environment and DOMPurify is available, use it.
    if (typeof window !== 'undefined' && DOMPurify) {
      const purified = DOMPurify.sanitize(input, {
        SAFE_FOR_TEMPLATES: true,
        ADD_TAGS: ['mark'],
        ADD_ATTR: ['style'],
      });
      return cleanInlineStyles(purified);
    }
  } catch {
    // fallback to native parser method below
  }

  // Fallback: simple DOMParser approach
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');

    // Remove script/style elements
    doc.querySelectorAll('script, style').forEach((el) => el.remove());

    // Remove event handler attributes (on*) and javascript: links/src
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const toProcess: Element[] = [];
    while (walker.nextNode()) {
      toProcess.push(walker.currentNode as Element);
    }

    toProcess.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value || '';
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if (name === 'href' && val.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute('href');
        } else if (name === 'src' && val.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute('src');
        } else if (name === 'style') {
          const sanitized = sanitizeStyleAttribute(val);
          if (sanitized) el.setAttribute(attr.name, sanitized);
          else el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return input;
  }
}

export default sanitizeHtml;

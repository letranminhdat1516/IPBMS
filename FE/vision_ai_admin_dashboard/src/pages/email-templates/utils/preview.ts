// email-templates/utils/preview.ts
import DOMPurify from 'dompurify';

// Mock CSS inliner - replace with BE API call when available
export async function inlineCss(html: string): Promise<string> {
  // TODO: Call BE API: POST /api/email/inline-css
  // For now, return as-is
  return html;
}

// Extended sanitizer for email preview - allows email-safe attributes
export function sanitizeHtmlForEmail(input: string): string {
  if (!input) return '';

  try {
    if (typeof window !== 'undefined' && DOMPurify) {
      return DOMPurify.sanitize(input, {
        SAFE_FOR_TEMPLATES: true,
        ADD_TAGS: ['mark'],
        ADD_ATTR: [
          'style',
          'class',
          'align',
          'valign',
          'border',
          'cellpadding',
          'cellspacing',
          'width',
          'height',
          'colspan',
          'rowspan',
          'bgcolor',
          'role',
        ],
        ALLOWED_ATTR: [
          'style',
          'class',
          'align',
          'valign',
          'border',
          'cellpadding',
          'cellspacing',
          'width',
          'height',
          'colspan',
          'rowspan',
          'bgcolor',
          'role',
          'href',
          'name',
          'target',
          'rel',
          'src',
          'alt',
        ],
      });
    }
  } catch {
    // fallback
  }

  return input || '';
}

// Main preview function
export async function getEmailPreview(htmlRaw: string): Promise<string> {
  const inlined = await inlineCss(htmlRaw);
  return sanitizeHtmlForEmail(inlined);
}

// Strip HTML to plain text
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Remove script and style elements
  const scripts = tempDiv.querySelectorAll('script, style');
  scripts.forEach((script) => script.remove());

  // Get text content and clean up whitespace
  let text = tempDiv.textContent || tempDiv.innerText || '';

  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Convert common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  return text;
}

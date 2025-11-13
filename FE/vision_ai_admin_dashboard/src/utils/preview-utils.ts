// preview-utils.ts
import DOMPurify from 'dompurify';

// Extended sanitize for email preview - allows more attributes for proper email rendering
export function sanitizeHtmlForEmail(input: string | undefined): string {
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

  // Fallback: return input as-is for now
  return input || '';
}

// Mock inline CSS function - since BE doesn't have endpoint yet
// In production, this should call BE API: POST /api/email/inline-css
async function inlineCss(html: string): Promise<string> {
  // For now, return as-is. TODO: Implement proper CSS inlining
  // Example: Use a library like 'juice' or call BE endpoint
  return html;
}

export async function getPreviewHtml(htmlRaw: string): Promise<string> {
  // 1) Inline CSS (mock for now)
  const inlined = await inlineCss(htmlRaw);

  // 2) Sanitize with email-safe attributes
  return sanitizeHtmlForEmail(inlined);
}

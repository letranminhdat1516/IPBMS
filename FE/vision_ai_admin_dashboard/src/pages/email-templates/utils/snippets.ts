// email-templates/utils/snippets.ts
export interface EmailSnippet {
  label: string;
  html: string;
  description?: string;
}

export const EMAIL_SNIPPETS: Record<string, EmailSnippet> = {
  'table-basic': {
    label: 'Bảng cơ bản',
    description: 'Bảng đơn giản với header và content',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
  <tr style="background-color: #f8f9fa;">
    <td style="padding: 20px; text-align: center; border: 1px solid #ddd;">
      <h1 style="margin: 0; color: #333; font-size: 24px;">{{subject}}</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px; text-align: left; border: 1px solid #ddd;">
      <p style="margin: 0 0 15px 0; line-height: 1.6; color: #333;">{{content}}</p>
      <p style="margin: 0; line-height: 1.6; color: #666; font-size: 14px;">Trân trọng,<br>{{sender_name}}</p>
    </td>
  </tr>
</table>`,
  },
  'hero-section': {
    label: 'Hero Section',
    description: 'Phần hero với background và call-to-action',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: bold;">Chào mừng {{user_name}}!</h1>
      <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.6;">{{hero_message}}</p>
      <a href="{{cta_url}}" style="display: inline-block; padding: 15px 30px; background-color: #ffffff; color: #667eea; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">{{cta_text}}</a>
    </td>
  </tr>
</table>`,
  },
  'two-column': {
    label: '2 Cột',
    description: 'Layout 2 cột cho nội dung song song',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="width: 48%; padding: 20px; vertical-align: top; border-right: 1px solid #eee;">
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">{{column1_title}}</h3>
      <p style="margin: 0; line-height: 1.6; color: #666;">{{column1_content}}</p>
    </td>
    <td style="width: 48%; padding: 20px; vertical-align: top;">
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">{{column2_title}}</h3>
      <p style="margin: 0; line-height: 1.6; color: #666;">{{column2_content}}</p>
    </td>
  </tr>
</table>`,
  },
  'button-primary': {
    label: 'Nút CTA Chính',
    description: 'Nút call-to-action với style nổi bật',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 30px 20px; text-align: center;">
      <a href="{{button_url}}" style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,123,255,0.3);">{{button_text}}</a>
    </td>
  </tr>
</table>`,
  },
  footer: {
    label: 'Footer',
    description: 'Phần footer với thông tin liên hệ',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 20px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">{{footer_text}}</p>
      <p style="margin: 0; font-size: 12px; color: #999;">
        <a href="{{unsubscribe_url}}" style="color: #999; text-decoration: underline;">Hủy đăng ký</a> |
        <a href="{{privacy_url}}" style="color: #999; text-decoration: underline;">Chính sách bảo mật</a>
      </p>
    </td>
  </tr>
</table>`,
  },
  divider: {
    label: 'Đường kẻ ngang',
    description: 'Đường kẻ phân cách các section',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 20px;">
      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 0;">
    </td>
  </tr>
</table>`,
  },
};

export function getSnippetKeys(): string[] {
  return Object.keys(EMAIL_SNIPPETS);
}

export function getSnippet(key: string): EmailSnippet | undefined {
  return EMAIL_SNIPPETS[key];
}

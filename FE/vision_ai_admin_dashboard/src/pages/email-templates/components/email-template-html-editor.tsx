import type { editor } from 'monaco-editor';

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';

const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

export interface HtmlEditorProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export type HtmlEditorHandle = {
  insertText: (text: string) => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
  focus: () => void;
};

// Email-friendly HTML snippets with inline styles
const EMAIL_SNIPPETS = {
  'table-basic': {
    label: 'Bảng cơ bản',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 20px; text-align: center; background-color: #f8f9fa;">
      <h1 style="margin: 0; color: #333;">Tiêu đề</h1>
    </td>
  </tr>
  <tr>
    <td style="padding: 20px; text-align: left;">
      <p style="margin: 0; line-height: 1.6;">Nội dung email...</p>
    </td>
  </tr>
</table>`,
  },
  'hero-section': {
    label: 'Hero Section',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 40px 20px; text-align: center; background-color: #007bff; color: white;">
      <h1 style="margin: 0 0 10px 0; font-size: 28px;">Chào mừng!</h1>
      <p style="margin: 0; font-size: 16px; line-height: 1.6;">Mô tả ngắn gọn về nội dung email.</p>
    </td>
  </tr>
</table>`,
  },
  'two-column': {
    label: '2 Cột',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="width: 50%; padding: 20px; vertical-align: top;">
      <h3 style="margin: 0 0 10px 0;">Cột trái</h3>
      <p style="margin: 0; line-height: 1.6;">Nội dung cột trái...</p>
    </td>
    <td style="width: 50%; padding: 20px; vertical-align: top;">
      <h3 style="margin: 0 0 10px 0;">Cột phải</h3>
      <p style="margin: 0; line-height: 1.6;">Nội dung cột phải...</p>
    </td>
  </tr>
</table>`,
  },
  button: {
    label: 'Nút CTA',
    html: `<table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 0 auto;">
  <tr>
    <td style="padding: 20px; text-align: center;">
      <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Nhấn vào đây</a>
    </td>
  </tr>
</table>`,
  },
};

const EmailTemplateHtmlEditor = forwardRef<HtmlEditorHandle, HtmlEditorProps>(
  ({ value, onChange, className }, ref) => {
    const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Auto-format HTML when component mounts or value changes
    useEffect(() => {
      if (monacoRef.current) {
        // Delay formatting to ensure editor is ready
        setTimeout(() => {
          if (monacoRef.current) {
            monacoRef.current.getAction('editor.action.formatDocument')?.run();
          }
        }, 100);
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      insertText(text: string) {
        if (monacoRef.current) {
          const editor = monacoRef.current;
          const selection = editor.getSelection();
          const range = selection || {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          };
          editor.executeEdits('', [
            {
              range: {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.endColumn,
              },
              text,
            },
          ]);
        }
      },
      getHtml() {
        return monacoRef.current?.getValue() ?? String(value ?? '');
      },
      setHtml(html: string) {
        if (monacoRef.current) {
          monacoRef.current.setValue(html);
        } else {
          onChange(html);
        }
      },
      focus() {
        try {
          monacoRef.current?.focus();
        } catch {
          // noop
        }
      },
    }));

    return (
      <div className={cn('prose max-w-full', className)}>
        <div className='mb-3 flex items-center justify-between gap-3'>
          <Select
            onValueChange={(value) => {
              const snippet = EMAIL_SNIPPETS[value as keyof typeof EMAIL_SNIPPETS];
              if (snippet) {
                // support callback refs and object refs
                const currentRef = (ref as React.RefObject<HtmlEditorHandle>)?.current;
                if (currentRef) currentRef.insertText(snippet.html);
              }
            }}
          >
            <SelectTrigger className='w-80 max-w-[48vw]'>
              <SelectValue placeholder='Chèn snippet HTML...' />
            </SelectTrigger>
            <SelectContent side='bottom' align='start' className='max-h-[40vh] overflow-auto'>
              {Object.entries(EMAIL_SNIPPETS).map(([key, snippet]) => (
                <SelectItem key={key} value={key}>
                  <div className='flex flex-col'>
                    <span className='font-medium'>{snippet.label}</span>
                    {snippet.html && (
                      <span className='text-muted-foreground line-clamp-2 text-xs'>
                        {snippet.label}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type='button'
            className='text-muted-foreground text-sm hover:underline'
            onClick={() => {
              if (monacoRef.current) {
                monacoRef.current.getAction('editor.action.formatDocument')?.run();
              }
            }}
          >
            Định dạng
          </Button>
        </div>

        <React.Suspense
          fallback={<div className='rounded border p-4'>Đang tải trình soạn thảo…</div>}
        >
          <MonacoEditor
            // Use a viewport-based height so the editor fills more of the dialog
            height={'80vh'}
            language='html'
            value={value}
            onChange={(val: string | undefined) => onChange(val || '')}
            onMount={(editorInstance: editor.IStandaloneCodeEditor | null) => {
              monacoRef.current = editorInstance as editor.IStandaloneCodeEditor | null;
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
            }}
          />
        </React.Suspense>
      </div>
    );
  }
);

EmailTemplateHtmlEditor.displayName = 'EmailTemplateHtmlEditor';

export default EmailTemplateHtmlEditor;

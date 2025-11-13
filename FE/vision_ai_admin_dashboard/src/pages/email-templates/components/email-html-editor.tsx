// email-templates/components/email-html-editor.tsx
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

import { EMAIL_SNIPPETS } from '../utils/snippets';

const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

export interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export type HtmlEditorHandle = {
  insertText: (text: string) => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
  focus: () => void;
};

const EmailHtmlEditor = forwardRef<HtmlEditorHandle, HtmlEditorProps>(
  ({ value, onChange, className, placeholder }, ref) => {
    const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Auto-format HTML when component mounts or value changes
    useEffect(() => {
      if (monacoRef.current) {
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
        return monacoRef.current?.getValue() ?? value;
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

    const handleInsertSnippet = (snippetKey: string) => {
      const snippet = EMAIL_SNIPPETS[snippetKey];
      if (snippet && 'current' in ref! && ref.current) {
        ref.current.insertText(snippet.html);
      }
    };

    return (
      <div className={cn('space-y-3', className)}>
        {/* Snippet Selector */}
        <div className='flex items-center gap-3'>
          <Select onValueChange={handleInsertSnippet}>
            <SelectTrigger className='w-96 max-w-[55vw] sm:w-full'>
              <SelectValue placeholder='Chèn snippet HTML...' />
            </SelectTrigger>
            <SelectContent side='bottom' align='start' className='max-h-[40vh] overflow-auto'>
              {Object.entries(EMAIL_SNIPPETS).map(([key, snippet]) => (
                <SelectItem key={key} value={key}>
                  <div className='flex flex-col'>
                    <span className='font-medium'>{snippet.label}</span>
                    {snippet.description && (
                      <span className='text-muted-foreground text-xs'>{snippet.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              if (monacoRef.current) {
                monacoRef.current.getAction('editor.action.formatDocument')?.run();
              }
            }}
          >
            Định dạng
          </Button>
        </div>

        {/* Monaco Editor */}
        <div className='overflow-hidden rounded-md border'>
          <React.Suspense
            fallback={
              <div className='text-muted-foreground flex h-64 items-center justify-center'>
                Đang tải trình soạn thảo...
              </div>
            }
          >
            <div className='h-[50vh] sm:h-[60vh] md:h-[70vh]'>
              <MonacoEditor
                // fill the container height so the editor doesn't force viewport height
                height={'100%'}
                language='html'
                value={value}
                onChange={(val) => onChange(val || '')}
                onMount={(editor) => {
                  monacoRef.current = editor;
                }}
                options={(() => {
                  const opts: Partial<editor.IStandaloneEditorConstructionOptions> = {
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    // placeholder is not part of Monaco's IStandaloneEditorConstructionOptions type
                    // but @monaco-editor/react accepts it; keep it and cast below.
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    placeholder: placeholder || 'Nhập HTML cho email...',
                    suggest: {
                      showKeywords: true,
                      showSnippets: true,
                    },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                  };
                  return opts as editor.IStandaloneEditorConstructionOptions;
                })()}
              />
            </div>
          </React.Suspense>
        </div>

        {/* Help Text */}
        <div className='text-muted-foreground space-y-1 text-xs'>
          <p>
            <strong>Mẹo:</strong> Sử dụng inline styles (style=&quot;...&quot;) thay vì
            &lt;style&gt; tags để đảm bảo tương thích với email clients.
          </p>
          <p>
            Sử dụng <code>{'{{variable}}'}</code> để chèn biến động.
          </p>
        </div>
      </div>
    );
  }
);

EmailHtmlEditor.displayName = 'EmailHtmlEditor';

export default EmailHtmlEditor;

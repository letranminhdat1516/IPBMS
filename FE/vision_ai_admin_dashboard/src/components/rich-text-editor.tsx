import { Blockquote } from '@tiptap/extension-blockquote';
import { Bold } from '@tiptap/extension-bold';
import { BulletList } from '@tiptap/extension-bullet-list';
import { Code } from '@tiptap/extension-code';
import { Color } from '@tiptap/extension-color';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Heading } from '@tiptap/extension-heading';
import { Highlight } from '@tiptap/extension-highlight';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Italic } from '@tiptap/extension-italic';
import { Link } from '@tiptap/extension-link';
import { ListItem } from '@tiptap/extension-list-item';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  Bold as BoldIcon,
  Check,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Redo,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { sanitizeHtml } from '@/lib/sanitize';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
}

const TEXT_COLOR_PALETTE = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#cccccc',
  '#efefef',
  '#ffffff',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
];

const HIGHLIGHT_COLOR_PALETTE = [
  '#fff7ed',
  '#fef3c7',
  '#fef08a',
  '#dcfce7',
  '#bbf7d0',
  '#a5f3fc',
  '#bfdbfe',
  '#ddd6fe',
  '#fce7f3',
  '#fecaca',
];

const RichTextEditor = forwardRef<RichTextEditorHandle, Props>(
  ({ value, onChange, placeholder, className }, ref) => {
    const [textColorOpen, setTextColorOpen] = useState(false);
    const [highlightOpen, setHighlightOpen] = useState(false);

    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Code,
        Heading.configure({
          levels: [1, 2, 3],
        }),
        ListItem,
        BulletList,
        OrderedList,
        Blockquote,
        HardBreak,
        HorizontalRule,
        Underline,
        TextStyle,
        Color.configure({
          types: ['textStyle'],
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Link.configure({
          openOnClick: false,
        }),
        Placeholder.configure({
          placeholder: placeholder || '',
        }),
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        },
        handleKeyDown: (_view, event) => {
          if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
              case 'b': {
                event.preventDefault();
                editor?.chain().focus().toggleMark('bold').run();
                return true;
              }
              case 'i': {
                event.preventDefault();
                editor?.chain().focus().toggleMark('italic').run();
                return true;
              }
              case 'u': {
                event.preventDefault();
                editor?.chain().focus().toggleUnderline().run();
                return true;
              }
              case 'k': {
                event.preventDefault();
                const url = window.prompt('Nhập URL (bao gồm https://)');
                if (url)
                  editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                return true;
              }
              case '7': {
                if (event.shiftKey) {
                  event.preventDefault();
                  editor?.chain().focus().toggleOrderedList().run();
                  return true;
                }
                break;
              }
              case '8': {
                if (event.shiftKey) {
                  event.preventDefault();
                  editor?.chain().focus().toggleBulletList().run();
                  return true;
                }
                break;
              }
              case 'x': {
                if (event.shiftKey) {
                  event.preventDefault();
                  editor?.chain().focus().toggleMark('strike').run();
                  return true;
                }
                break;
              }
              case 'c': {
                if (event.shiftKey) {
                  event.preventDefault();
                  editor?.chain().focus().toggleMark('code').run();
                  return true;
                }
                break;
              }
            }
          }
          return false;
        },
      },
      content: value,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const sanitized = sanitizeHtml(html);
        onChange(sanitized);
      },
    });

    useEffect(() => {
      if (editor && value !== sanitizeHtml(editor.getHTML())) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }, [value, editor]);

    const insertText = (text: string) => {
      if (editor) {
        editor.commands.insertContent(text);
      }
    };

    useImperativeHandle(ref, () => ({
      insertText,
    }));

    const activeTextColor = (editor?.getAttributes('textStyle')?.color as string | undefined) || '';
    const activeHighlightColor =
      (editor?.getAttributes('highlight')?.color as string | undefined) || '';

    return (
      <div className={className}>
        <TooltipProvider>
          <div className='bg-muted/30 mb-4 flex flex-wrap gap-2 overflow-x-auto rounded-lg border p-3 shadow-sm'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('bold') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleMark('bold').run()}
                >
                  <BoldIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Đậm (Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation='vertical' className='mx-1 h-6' />
            <Popover open={textColorOpen} onOpenChange={setTextColorOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button size='sm' variant='outline' className='flex items-center gap-1.5'>
                      <Palette size={16} />
                      <span
                        className='border-border/80 h-2.5 w-5 rounded border'
                        style={{ backgroundColor: activeTextColor || '#000000' }}
                      />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Màu chữ</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className='grid w-52 grid-cols-6 gap-2' align='start'>
                {TEXT_COLOR_PALETTE.map((color) => {
                  const isActive = activeTextColor?.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type='button'
                      className='border-border/80 hover:border-primary/70 focus-visible:ring-ring/40 relative flex h-7 w-7 items-center justify-center rounded border transition focus-visible:ring-2 focus-visible:outline-none'
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor?.chain().focus().setColor(color).run();
                        setTextColorOpen(false);
                      }}
                    >
                      {isActive && <Check size={14} className='text-primary drop-shadow' />}
                    </button>
                  );
                })}
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='col-span-6 justify-start'
                  onClick={() => {
                    editor?.chain().focus().unsetColor().run();
                    setTextColorOpen(false);
                  }}
                >
                  Không màu
                </Button>
              </PopoverContent>
            </Popover>
            <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size='sm'
                      variant={editor?.isActive('highlight') ? 'default' : 'outline'}
                      className='flex items-center gap-1.5'
                    >
                      <Highlighter size={16} />
                      <span
                        className='border-border/80 h-2.5 w-5 rounded border'
                        style={{ backgroundColor: activeHighlightColor || '#fef08a' }}
                      />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tô nền</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className='grid w-52 grid-cols-5 gap-2' align='start'>
                {HIGHLIGHT_COLOR_PALETTE.map((color) => {
                  const isActive = activeHighlightColor?.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type='button'
                      className='border-border/80 hover:border-primary/70 focus-visible:ring-ring/40 relative flex h-7 w-7 items-center justify-center rounded border transition focus-visible:ring-2 focus-visible:outline-none'
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        editor?.chain().focus().setHighlight({ color }).run();
                        setHighlightOpen(false);
                      }}
                    >
                      {isActive && <Check size={14} className='text-primary drop-shadow' />}
                    </button>
                  );
                })}
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='col-span-5 justify-start'
                  onClick={() => {
                    editor?.chain().focus().unsetHighlight().run();
                    setHighlightOpen(false);
                  }}
                >
                  Không tô nền
                </Button>
              </PopoverContent>
            </Popover>
            <Separator orientation='vertical' className='mx-1 h-6' />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('italic') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleMark('italic').run()}
                >
                  <ItalicIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Nghiêng (Ctrl+I)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('underline') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Gạch dưới (Ctrl+U)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('strike') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleMark('strike').run()}
                >
                  <Strikethrough size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Gạch ngang (Ctrl+Shift+X)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('code') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleMark('code').run()}
                >
                  <CodeIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Code (Ctrl+Shift+C)</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation='vertical' className='mx-1 h-6' />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                  <Heading1 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tiêu đề 1</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  <Heading2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tiêu đề 2</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('heading', { level: 3 }) ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                  <Heading3 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tiêu đề 3</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation='vertical' className='mx-1 h-6' />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  <List size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Danh sách (Ctrl+Shift+8)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Danh sách số (Ctrl+Shift+7)</p>
              </TooltipContent>
            </Tooltip>
            <Separator orientation='vertical' className='mx-1 h-6' />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    const url = window.prompt('Nhập URL (bao gồm https://)');
                    if (url)
                      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                  }}
                >
                  <LinkIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Liên kết (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo}
                >
                  <Undo size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hoàn tác (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo}
                >
                  <Redo size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Làm lại (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => editor?.chain().focus().clearContent().run()}
                >
                  <Trash2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Xóa tất cả</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <EditorContent
          editor={editor}
          className='prose focus-within:ring-primary bg-background min-h-[150px] max-w-none rounded-lg border p-4 shadow-sm transition-all duration-200 focus-within:shadow-md focus-within:ring-2'
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

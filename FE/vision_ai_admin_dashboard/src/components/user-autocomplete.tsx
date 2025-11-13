import { useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { User } from '@/types/user';

import { getUserById, searchUsers } from '@/services/users';

interface UserItem {
  user_id: number | string;
  username?: string;
  full_name?: string | null;
}

interface UserAutocompleteProps {
  value?: string | number;
  placeholder?: string;
  onChange: (userId?: string) => void;
  // Optional callback with the full user object when selection is made
  onSelectUser?: (user: User) => void;
}

export default function UserAutocomplete({ value, placeholder, onChange }: UserAutocompleteProps) {
  const { onSelectUser } = arguments[0] as UserAutocompleteProps;
  const [text, setText] = useState<string>(() => (value ? String(value) : ''));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setText(value ? String(value) : '');
  }, [value]);

  // Debounced query using a small internal timer
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const { data } = useQuery<{ data: UserItem[]; total: number; page: number; limit: number }>({
    queryKey: ['searchUsers', debounced],
    queryFn: async () => {
      const q = debounced.trim();
      if (!q) return { data: [], total: 0, page: 1, limit: 5 };
      return await searchUsers({ q, limit: 6 });
    },
    enabled: debounced.trim().length > 0,
    staleTime: 30_000,
  });

  const loading = !!(debounced.trim().length > 0 && !data);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (!data || !Array.isArray(data.data)) return;
      const len = data.data.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(0, len - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = data.data[highlight];
        if (item) {
          onChange(String(item.user_id));
          setText(item.username || String(item.user_id));
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, data, highlight, onChange]);

  return (
    <div className='relative' ref={containerRef}>
      <div className='flex items-center gap-2'>
        <Input
          role='combobox'
          aria-expanded={open}
          aria-controls='user-autocomplete-list'
          aria-autocomplete='list'
          placeholder={placeholder || 'Nhập tên người dùng'}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlight(0);
            // clear selected id when editing
            if (!e.target.value) onChange(undefined);
          }}
          onFocus={() => setOpen(true)}
        />

        {text && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setText('');
              onChange(undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
        )}

        {loading && (
          <div className='ml-2'>
            <svg className='text-muted-foreground h-4 w-4 animate-spin' viewBox='0 0 24 24'>
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
                fill='none'
              ></circle>
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'
              ></path>
            </svg>
          </div>
        )}
      </div>

      {open && debounced.trim().length > 0 && (
        <div
          id='user-autocomplete-list'
          role='listbox'
          ref={listRef}
          className='bg-popover absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded border shadow'
        >
          {!data || data.data.length === 0 ? (
            <div className='text-muted-foreground px-3 py-2 text-sm'>Không tìm thấy người dùng</div>
          ) : (
            data.data.map((u: UserItem, idx: number) => (
              <button
                aria-selected={highlight === idx}
                key={String(u.user_id)}
                type='button'
                className={`w-full px-3 py-2 text-left text-sm ${highlight === idx ? 'bg-muted' : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => {
                  onChange(String(u.user_id));
                  setText(u.username || String(u.user_id));
                  setOpen(false);
                  // Try to resolve full user object and call onSelectUser if provided
                  if (typeof onSelectUser === 'function') {
                    getUserById(u.user_id)
                      .then((full) => {
                        try {
                          onSelectUser(full as User);
                        } catch (_err) {
                          // ignore
                        }
                      })
                      .catch(() => {
                        // ignore fetch failure
                      });
                  }
                }}
              >
                <div className='font-medium'>{u.full_name || u.username}</div>
                <div className='text-muted-foreground text-xs'>ID: {String(u.user_id)}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

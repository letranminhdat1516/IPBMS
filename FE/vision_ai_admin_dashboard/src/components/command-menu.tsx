import { useCallback, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import {
  IconArrowRightDashed,
  IconChevronRight,
  IconDeviceLaptop,
  IconMoon,
  IconSun,
} from '@tabler/icons-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

import { useSearch } from '@/context/search-context';
import { useTheme } from '@/context/theme-context';

import { useUnifiedSearch } from '@/services/search';

import { sidebarData } from './layout/data/sidebar-data';
import { ScrollArea } from './ui/scroll-area';

export function CommandMenu() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { open, setOpen } = useSearch();

  const [query, setQuery] = useState('');

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen]
  );

  const { data: searchResult, isFetching } = useUnifiedSearch(
    { q: query, page: 1, limit: 10 },
    Boolean(query && query.length > 0)
  );

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder='Nhập lệnh hoặc tìm kiếm...'
        value={query}
        onValueChange={(v: string) => setQuery(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim().length > 0) {
            // no-op here: useUnifiedSearch already runs when query changes
          }
        }}
      />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pr-1'>
          <CommandEmpty>{isFetching ? 'Đang tìm...' : 'Không tìm thấy kết quả.'}</CommandEmpty>
          {searchResult?.items && searchResult.items.length > 0 && (
            <CommandGroup heading='Kết quả tìm kiếm'>
              {searchResult.items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={String(
                    ((item.payload as Record<string, unknown> | undefined)?.[
                      'full_name'
                    ] as string) ??
                      ((item.payload as Record<string, unknown> | undefined)?.['name'] as string) ??
                      item.id
                  )}
                  onSelect={() => {
                    setOpen(false);
                    // Try to navigate if payload contains a url or route
                    const payload = item.payload as Record<string, unknown> | undefined;
                    const url =
                      (payload?.['url'] as string | undefined) ||
                      (payload?.['route'] as string | undefined);
                    if (url) navigate({ to: String(url) });
                  }}
                >
                  <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                    <IconArrowRightDashed className='text-muted-foreground/80 size-2' />
                  </div>
                  <div className='truncate'>
                    <div className='font-medium'>
                      {String(
                        ((item.payload as Record<string, unknown> | undefined)?.[
                          'full_name'
                        ] as string) ??
                          ((item.payload as Record<string, unknown> | undefined)?.[
                            'name'
                          ] as string) ??
                          item.id
                      )}
                    </div>
                    <div className='text-muted-foreground text-xs'>{item.type}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {sidebarData.navGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((navItem, i) => {
                if (navItem.url)
                  return (
                    <CommandItem
                      key={`${navItem.url}-${i}`}
                      value={navItem.title}
                      onSelect={() => {
                        runCommand(() => navigate({ to: navItem.url }));
                      }}
                    >
                      <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                        <IconArrowRightDashed className='text-muted-foreground/80 size-2' />
                      </div>
                      {navItem.title}
                    </CommandItem>
                  );

                return navItem.items?.map((subItem, i) => (
                  <CommandItem
                    key={`${navItem.title}-${subItem.url}-${i}`}
                    value={`${navItem.title}-${subItem.url}`}
                    onSelect={() => {
                      runCommand(() => navigate({ to: subItem.url }));
                    }}
                  >
                    <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                      <IconArrowRightDashed className='text-muted-foreground/80 size-2' />
                    </div>
                    {navItem.title} <IconChevronRight /> {subItem.title}
                  </CommandItem>
                ));
              })}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading='Giao diện'>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <IconSun /> <span>Sáng</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <IconMoon className='scale-90' />
              <span>Tối</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <IconDeviceLaptop />
              <span>Hệ thống</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  );
}

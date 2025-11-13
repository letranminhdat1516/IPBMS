import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { truncate } from '@/utils/string';

export default function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 120;
  if (text.length <= maxLength)
    return <div className='bg-muted text-muted-foreground rounded p-3'>{text}</div>;
  return (
    <div className='bg-muted text-muted-foreground rounded p-3'>
      {expanded ? text : truncate(text, maxLength)}
      <Button
        className='text-primary ml-2 text-xs underline'
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? 'Thu gọn' : 'Xem thêm'}
      </Button>
    </div>
  );
}

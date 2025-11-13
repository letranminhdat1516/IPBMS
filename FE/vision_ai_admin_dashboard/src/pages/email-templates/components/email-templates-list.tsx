// email-templates/components/email-templates-list.tsx
import { Copy, Edit, Eye, MoreHorizontal, Send, Trash2 } from 'lucide-react';

import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  useDeleteEmailTemplate,
  useDuplicateEmailTemplate,
  useEmailTemplates,
} from '@/services/emailTemplates';

import type { EmailTemplate } from '../utils/types';
import { EmailPreviewModal } from './email-preview-modal';
import { SendTestModal } from './send-test-modal';

interface EmailTemplatesListProps {
  search: string;
  typeFilter: string;
  statusFilter: string;
  onEdit: (template: EmailTemplate) => void;
}

export function EmailTemplatesList({
  search,
  typeFilter,
  statusFilter,
  onEdit,
}: EmailTemplatesListProps) {
  const [previewTemplate, setPreviewTemplate] = React.useState<EmailTemplate | null>(null);
  const [sendTestTemplate, setSendTestTemplate] = React.useState<EmailTemplate | null>(null);

  const filters = React.useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined,
    }),
    [search, typeFilter, statusFilter]
  );

  const { data, isLoading, error } = useEmailTemplates(filters);
  const deleteMutation = useDeleteEmailTemplate();
  const duplicateMutation = useDuplicateEmailTemplate();

  const templates = data?.data || [];

  const handleDelete = (template: EmailTemplate) => {
    if (confirm(`Bạn có chắc muốn xóa template "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    duplicateMutation.mutate(template.id);
  };

  if (isLoading) {
    return <div className='py-8 text-center'>Đang tải...</div>;
  }

  if (error) {
    return <div className='py-8 text-center text-red-500'>Lỗi tải dữ liệu</div>;
  }

  return (
    <>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className='w-12'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-muted-foreground py-8 text-center'>
                  Không có template nào
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template: EmailTemplate) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className='font-medium'>{template.name}</div>
                      <div className='text-muted-foreground text-sm'>
                        {template.variables.length} biến
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{template.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>
                      {new Date(template.updated_at).toLocaleDateString('vi-VN')}
                    </div>
                    {template.updatedBy && (
                      <div className='text-muted-foreground text-xs'>bởi {template.updatedBy}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                          <Eye className='mr-2 h-4 w-4' />
                          Xem trước
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSendTestTemplate(template)}>
                          <Send className='mr-2 h-4 w-4' />
                          Gửi test
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(template)}>
                          <Edit className='mr-2 h-4 w-4' />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className='mr-2 h-4 w-4' />
                          Nhân bản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template)}
                          className='text-red-600'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmailPreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      />

      <SendTestModal
        template={sendTestTemplate}
        open={!!sendTestTemplate}
        onOpenChange={(open) => !open && setSendTestTemplate(null)}
      />
    </>
  );
}

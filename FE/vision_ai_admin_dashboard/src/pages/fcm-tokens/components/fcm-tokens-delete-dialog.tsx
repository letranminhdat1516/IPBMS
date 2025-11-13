import { toast } from 'sonner';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { bulkDeleteAdminFcmTokens } from '@/services/fcmTokens';

interface FcmTokensDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenIds: string[];
  onSuccess?: () => void;
}

export function FcmTokensDeleteDialog({
  open,
  onOpenChange,
  tokenIds,
  onSuccess,
}: FcmTokensDeleteDialogProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return bulkDeleteAdminFcmTokens({ userIds: tokenIds });
    },
    // Optimistic update: remove tokens from cache immediately
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['fcm-tokens'], exact: false });

      // Snapshot all fcm-tokens queries (including variants with params)
      const previousTokensQueries = queryClient.getQueriesData({
        queryKey: ['fcm-tokens'],
        exact: false,
      });

      // Optimistically remove tokens from all cached lists
      previousTokensQueries.forEach(([key, _data]) => {
        try {
          const qk = key as unknown as import('@tanstack/react-query').QueryKey;
          queryClient.setQueryData(qk, (old: unknown) => {
            if (!old) return old;

            type TokenLike = { id?: string };
            // Handle both array and paginated { items, ... } formats
            if (Array.isArray(old)) {
              return (old as TokenLike[]).filter(
                (t) => typeof t.id === 'string' && !tokenIds.includes(t.id)
              );
            }

            const maybe = old as { items?: TokenLike[] };
            if (Array.isArray(maybe.items)) {
              return {
                ...maybe,
                items: maybe.items.filter(
                  (t) => typeof t.id === 'string' && !tokenIds.includes(t.id)
                ),
              };
            }

            return old;
          });
        } catch (_err) {
          // ignore per-key errors
        }
      });

      return { previousTokensQueries };
    },
    onError: (
      _error,
      _vars,
      context:
        | { previousTokensQueries?: Array<[import('@tanstack/react-query').QueryKey, unknown]> }
        | undefined
    ) => {
      // Rollback all snapshots
      if (context?.previousTokensQueries) {
        context.previousTokensQueries.forEach(([key, data]) => {
          try {
            queryClient.setQueryData(key, data);
          } catch (_e) {
            // ignore
          }
        });
      }
      toast.error('Không thể xóa token(s). Vui lòng thử lại.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fcm-tokens'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['fcm-tokens-stats'] });
      toast.success(`${tokenIds.length} token(s) đã được xóa thành công!`);
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa {tokenIds.length} FCM token(s)? Hành động này không thể hoàn
            tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

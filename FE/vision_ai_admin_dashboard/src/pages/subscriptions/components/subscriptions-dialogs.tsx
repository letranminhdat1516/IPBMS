import { useSubscriptionsContext } from '../hooks/use-subscriptions-context';
import { SubscriptionsCreateDialog } from './subscriptions-create-dialog';
import { SubscriptionsDeleteDialog } from './subscriptions-delete-dialog';
import { SubscriptionsEditDialog } from './subscriptions-edit-dialog';

export function SubscriptionsDialogs() {
  const {
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedSubscription,
    setSelectedSubscription,
  } = useSubscriptionsContext();

  return (
    <>
      <SubscriptionsCreateDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      {selectedSubscription && (
        <>
          <SubscriptionsEditDialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) {
                setTimeout(() => setSelectedSubscription(null), 500);
              }
            }}
            subscription={selectedSubscription}
          />

          <SubscriptionsDeleteDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) {
                setTimeout(() => setSelectedSubscription(null), 500);
              }
            }}
            subscription={selectedSubscription}
          />
        </>
      )}
    </>
  );
}

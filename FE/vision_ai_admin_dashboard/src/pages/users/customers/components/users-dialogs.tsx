import { useUsers } from '../context/users-context';
import { UsersActionDialog } from './users-action-dialog';
import { UsersDeleteDialog } from './users-delete-dialog';
import { UsersInviteDialog } from './users-invite-dialog';

export function UsersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useUsers();
  return (
    <>
      <UsersActionDialog
        key='user-add'
        open={open === 'add'}
        onOpenChange={(state) => setOpen(state ? 'add' : null)}
      />

      <UsersInviteDialog
        key='user-invite'
        open={open === 'invite'}
        onOpenChange={(state) => setOpen(state ? 'invite' : null)}
      />

      {currentRow && (
        <>
          <UsersActionDialog
            key={`user-edit-${currentRow.user_id}`}
            open={open === 'edit'}
            onOpenChange={(state) => {
              setOpen(state ? 'edit' : null);
              if (!state) {
                setTimeout(() => {
                  setCurrentRow(null);
                }, 500);
              }
            }}
            currentRow={currentRow}
          />

          <UsersDeleteDialog
            key={`user-delete-${currentRow.user_id}`}
            open={open === 'delete'}
            onOpenChange={(state) => {
              setOpen(state ? 'delete' : null);
              if (!state) {
                setTimeout(() => {
                  setCurrentRow(null);
                }, 500);
              }
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  );
}

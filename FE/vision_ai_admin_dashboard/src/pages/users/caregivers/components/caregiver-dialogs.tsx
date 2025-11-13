import { useCaregivers } from '../context/caregiver-context';
import { CaregiverDeleteDialog } from './caregiver-delete-dialog';
import { CaregiversActionDialog } from './caregivers-action-dialog';

export function CaregiverDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useCaregivers();
  return (
    <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto', padding: '0 16px' }}>
      <CaregiversActionDialog
        key='user-add'
        open={open === 'add'}
        onOpenChange={(state) => setOpen(state ? 'add' : null)}
        dialogProps={{ style: { maxWidth: '560px', width: '100%', height: '80%' } }}
      />

      {currentRow && (
        <>
          <CaregiversActionDialog
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
            dialogProps={{ style: { maxWidth: '560px', width: '100%', height: '80%' } }}
          />

          <CaregiverDeleteDialog
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
            dialogProps={{ style: { maxWidth: '400px', width: '100%' } }}
          />
        </>
      )}
    </div>
  );
}

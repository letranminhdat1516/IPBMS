import React, { useState } from 'react';

import useDialogState from '@/hooks/use-dialog-state';

import type { Caregiver } from '@/types/user';

type CaregiverDialogType = 'add' | 'edit' | 'delete';

interface CaregiverContextType {
  open: CaregiverDialogType | null;
  setOpen: (str: CaregiverDialogType | null) => void;
  currentRow: Caregiver | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<Caregiver | null>>;
}

const CaregiverContext = React.createContext<CaregiverContextType | null>(null);

interface Props {
  children: React.ReactNode;
}

export function CaregiverProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<CaregiverDialogType>(null);
  const [currentRow, setCurrentRow] = useState<Caregiver | null>(null);

  return (
    <CaregiverContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </CaregiverContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCaregivers = () => {
  const ctx = React.useContext(CaregiverContext);
  if (!ctx) throw new Error('useCaregivers must be used within <CaregiverProvider>');
  return ctx;
};

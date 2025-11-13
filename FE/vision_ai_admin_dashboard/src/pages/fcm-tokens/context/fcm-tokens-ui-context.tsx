import React, { useState } from 'react';

import useDialogState from '@/hooks/use-dialog-state';

import type { FcmToken } from '@/types/fcm-token';

type FcmTokenDialogType = 'add' | 'edit' | 'delete' | 'detail';

interface FcmTokensUIContextType {
  open: FcmTokenDialogType | null;
  setOpen: (str: FcmTokenDialogType | null) => void;
  currentRow: FcmToken | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<FcmToken | null>>;
}

const FcmTokensUIContext = React.createContext<FcmTokensUIContextType | null>(null);

interface Props {
  children: React.ReactNode;
}

export default function FcmTokensUIProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<FcmTokenDialogType>(null);
  const [currentRow, setCurrentRow] = useState<FcmToken | null>(null);

  return (
    <FcmTokensUIContext.Provider value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </FcmTokensUIContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFcmTokensUI = () => {
  const ctx = React.useContext(FcmTokensUIContext);
  if (!ctx) {
    throw new Error('useFcmTokensUI must be used within <FcmTokensUIProvider>');
  }
  return ctx;
};

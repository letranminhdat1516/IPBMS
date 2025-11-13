import React, { useState } from 'react';

import useDialogState from '@/hooks/use-dialog-state';

import { Plan } from '@/types/plan';

type PlanDialogType = 'add' | 'edit' | 'delete' | 'versions';

interface PlanContextType {
  open: PlanDialogType | null;
  setOpen: (str: PlanDialogType | null) => void;
  currentRow: Plan | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<Plan | null>>;
  showVersions: boolean;
  setShowVersions: React.Dispatch<React.SetStateAction<boolean>>;
  refetch?: () => void;
  setRefetch: React.Dispatch<React.SetStateAction<(() => void) | undefined>>;
}

const PlanContext = React.createContext<PlanContextType | null>(null);

interface Props {
  children: React.ReactNode;
}

export default function PlanProvider({ children }: Props) {
  const [open, setOpen] = useDialogState<PlanDialogType>(null);
  const [currentRow, setCurrentRow] = useState<Plan | null>(null);
  const [showVersions, setShowVersions] = useState(false); // Changed default to false
  const [refetch, setRefetch] = useState<(() => void) | undefined>();

  return (
    <PlanContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        showVersions,
        setShowVersions,
        refetch,
        setRefetch,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePlan = () => {
  const planContext = React.useContext(PlanContext);
  if (!planContext) {
    throw new Error('usePlan has to be used within <PlanProvider>');
  }
  return planContext;
};

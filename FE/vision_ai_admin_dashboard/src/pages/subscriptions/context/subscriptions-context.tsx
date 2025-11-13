import { type ReactNode, createContext, useState } from 'react';

import type { Subscription } from '@/types/subscription';

interface SubscriptionsContextType {
  selectedSubscription: Subscription | null;
  setSelectedSubscription: (subscription: Subscription | null) => void;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
}

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

export { SubscriptionsContext };

interface SubscriptionsProviderProps {
  children: ReactNode;
}

export default function SubscriptionsProvider({ children }: SubscriptionsProviderProps) {
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <SubscriptionsContext.Provider
      value={{
        selectedSubscription,
        setSelectedSubscription,
        isCreateDialogOpen,
        setIsCreateDialogOpen,
        isEditDialogOpen,
        setIsEditDialogOpen,
        isDeleteDialogOpen,
        setIsDeleteDialogOpen,
      }}
    >
      {children}
    </SubscriptionsContext.Provider>
  );
}

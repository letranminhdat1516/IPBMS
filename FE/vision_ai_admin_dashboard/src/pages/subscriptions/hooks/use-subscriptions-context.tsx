import { useContext } from 'react';

import { SubscriptionsContext } from '../context/subscriptions-context';

export function useSubscriptionsContext() {
  const context = useContext(SubscriptionsContext);
  if (context === undefined) {
    throw new Error('useSubscriptionsContext must be used within a SubscriptionsProvider');
  }
  return context;
}

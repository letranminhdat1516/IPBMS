import React, { createContext, useCallback, useContext, useState } from 'react';

import type { FcmToken, FcmTokenListResponse, FcmTokenStatsResponse } from '@/types/fcm-token';

import {
  bulkDeleteAdminFcmTokens,
  exportAdminFcmTokens,
  fetchAdminFcmTokenDetail,
  fetchAdminFcmTokenStats,
  fetchAdminFcmTokens,
  patchAdminFcmTokenStatus,
  updateAdminFcmToken,
} from '@/services/fcmTokens';

// UI dialog types for FCM tokens
export type FcmTokenDialogType = 'add' | 'edit' | 'delete';

export interface FcmTokensContextValue {
  // UI state
  open: FcmTokenDialogType | null;
  setOpen: (str: FcmTokenDialogType | null) => void;
  currentRow: FcmToken | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<FcmToken | null>>;
  deleteTokenIds: string[];
  setDeleteTokenIds: React.Dispatch<React.SetStateAction<string[]>>;
  tokens: FcmToken[];
  loading: boolean;
  stats: FcmTokenStatsResponse | null;
  fetchTokens: (params?: Partial<FcmTokenListResponse>) => Promise<void>;
  fetchTokenDetail: (id: string) => Promise<FcmToken | null>;
  updateToken: (id: string, data: Partial<FcmToken>) => Promise<void>;
  deleteTokens: (ids: string[]) => Promise<void>;
  patchTokenStatus: (id: string, active: boolean) => Promise<void>;
  fetchStats: () => Promise<void>;
  exportTokens: (params: { from: string; to: string }) => Promise<FcmToken[]>;
}

const FcmTokensContext = createContext<FcmTokensContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useFcmTokensContext = () => {
  const ctx = useContext(FcmTokensContext);
  if (!ctx) throw new Error('FcmTokensContext not found');
  return ctx;
};

export const FcmTokensProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // UI state
  const [open, setOpen] = useState<FcmTokenDialogType | null>(null);
  const [currentRow, setCurrentRow] = useState<FcmToken | null>(null);
  const [deleteTokenIds, setDeleteTokenIds] = useState<string[]>([]);
  // Data state
  const [tokens, setTokens] = useState<FcmToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FcmTokenStatsResponse | null>(null);

  const fetchTokens = useCallback(async (params?: Partial<FcmTokenListResponse>) => {
    setLoading(true);
    try {
      const res = await fetchAdminFcmTokens(params || {});
      setTokens(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTokenDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await fetchAdminFcmTokenDetail(id);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateToken = useCallback(
    async (id: string, data: Partial<FcmToken>) => {
      setLoading(true);
      try {
        await updateAdminFcmToken(id, data);
        await fetchTokens();
      } finally {
        setLoading(false);
      }
    },
    [fetchTokens]
  );

  const deleteTokens = useCallback(
    async (ids: string[]) => {
      setLoading(true);
      try {
        await bulkDeleteAdminFcmTokens({ userIds: ids });
        await fetchTokens();
      } finally {
        setLoading(false);
      }
    },
    [fetchTokens]
  );

  const patchTokenStatus = useCallback(
    async (id: string, active: boolean) => {
      setLoading(true);
      try {
        await patchAdminFcmTokenStatus(id, active);
        await fetchTokens();
      } finally {
        setLoading(false);
      }
    },
    [fetchTokens]
  );

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchAdminFcmTokenStats();
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportTokens = useCallback(async (params: { from: string; to: string }) => {
    setLoading(true);
    try {
      return await exportAdminFcmTokens(params);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <FcmTokensContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        deleteTokenIds,
        setDeleteTokenIds,
        tokens,
        loading,
        stats,
        fetchTokens,
        fetchTokenDetail,
        updateToken,
        deleteTokens,
        patchTokenStatus,
        fetchStats,
        exportTokens,
      }}
    >
      {children}
    </FcmTokensContext.Provider>
  );
};

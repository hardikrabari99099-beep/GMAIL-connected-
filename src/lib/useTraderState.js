import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_SETTINGS } from "./default-settings";

export function useTraderState(options = {}) {
  const { pollMs = 5000 } = options;
  const { user } = useAuth();
  const [accountId, setAccountId] = useState("");
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (overrideId) => {
      if (!user) {
        setState(null);
        setLoading(false);
        return null;
      }
      try {
        const targetId = overrideId ?? accountId;
        const params = targetId ? { account_id: targetId } : {};
        const { data } = await api.get("/me/trading-state", { params });
        setState(data);
        if (data?.activeAccount?.id && !targetId) {
          setAccountId(data.activeAccount.id);
        }
        return data;
      } catch {
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user, accountId],
  );

  useEffect(() => {
    load();
    if (!user || !pollMs || pollMs < 1500) return;
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        load();
      }
    }, pollMs);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [load, pollMs, user]);

  const activeAccount = state?.activeAccount || null;
  const accounts = state?.accounts || [];
  const hasActiveAccount = useMemo(
    () =>
      accounts.some(
        (a) =>
          ["Active", "Funded", "Passed"].includes(a.status || "Active") &&
          Number(a.balance || 0) > 0,
      ),
    [accounts],
  );

  const evaluationRisk = useMemo(
    () => ({
      ...DEFAULT_SETTINGS.evaluation_risk,
      ...(state?.evaluation_risk || {}),
    }),
    [state?.evaluation_risk],
  );

  const selectAccount = useCallback(
    async (nextId) => {
      setAccountId(nextId);
      return load(nextId);
    },
    [load],
  );

  const placeOrder = useCallback(
    async ({ symbol, side, qty, type = "MARKET", limit_price, note = "" }) => {
      setSubmitting(true);
      try {
        const { data } = await api.post("/me/orders", {
          account_id: state?.activeAccount?.id || accountId,
          symbol,
          side,
          qty,
          type,
          limit_price,
          note,
        });
        await load();
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    [accountId, load, state?.activeAccount?.id],
  );

  const closePosition = useCallback(
    async (posId, note = "") => {
      setSubmitting(true);
      try {
        const { data } = await api.post(`/me/positions/${posId}/close`, note ? { note } : {});
        await load();
        return data;
      } finally {
        setSubmitting(false);
      }
    },
    [load],
  );

  const updateNote = useCallback(
    async (kind, id, note) => {
      const path = kind === "order" ? `/me/orders/${id}` : `/me/trades/${id}`;
      const { data } = await api.patch(path, { note });
      await load();
      return data;
    },
    [load],
  );

  return {
    authenticated: !!user,
    isAdmin: user?.role === "admin",
    accounts,
    activeAccount,
    hasActiveAccount,
    evaluationRisk,
    kyc: state?.kyc || user?.kyc || {},
    orders: state?.orders || [],
    positions: state?.positions || [],
    trades: state?.trades || [],
    transactions: state?.transactions || [],
    loading,
    submitting,
    selectAccount,
    placeOrder,
    closePosition,
    updateNote,
    refresh: () => load(),
  };
}

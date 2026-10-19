"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

/** A money mutation that refreshes every money view when it settles. */
function useMoneyMutation<V>(fn: (v: V) => Promise<void>, onError: (message: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onError: (e) => onError(e.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["money"] });
      qc.invalidateQueries({ queryKey: ["bills-due"] });
    },
  });
}

export function useMoney(today: string, onError: (message: string) => void) {
  const query = useQuery({ queryKey: ["money", today], queryFn: () => api.fetchMoney(today) });

  return {
    query,
    addExpense: useMoneyMutation(api.addExpense, onError),
    deleteExpense: useMoneyMutation(api.deleteExpense, onError),
    addIncome: useMoneyMutation(api.addIncome, onError),
    deleteIncome: useMoneyMutation(api.deleteIncome, onError),
    addBill: useMoneyMutation(api.addBill, onError),
    markPaid: useMoneyMutation(api.markBillPaid, onError),
    deleteBill: useMoneyMutation(api.deleteBill, onError),
    setBudget: useMoneyMutation((v: { category: string; limit: number }) => api.setBudget(v.category, v.limit), onError),
    deleteBudget: useMoneyMutation(api.deleteBudget, onError),
    addGoal: useMoneyMutation(api.addSavingsGoal, onError),
    addSavings: useMoneyMutation((v: { id: string; amount: number }) => api.addSavings(v.id, v.amount), onError),
    deleteGoal: useMoneyMutation(api.deleteSavingsGoal, onError),
  };
}

export function useBillsDue(today: string, onError: (message: string) => void) {
  const query = useQuery({ queryKey: ["bills-due", today], queryFn: () => api.fetchBillsDue(today) });
  const markPaid = useMoneyMutation(api.markBillPaid, onError);
  return { query, markPaid };
}

/** Check-in feelings for Mood × Money. Refreshes when a check-in is saved. */
export function useFeelings(today: string) {
  return useQuery({ queryKey: ["checkin", today, "feelings"], queryFn: () => api.fetchFeelings(today) });
}

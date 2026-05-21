"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { FiSend, FiArrowDownLeft, FiList } from "react-icons/fi";
import { FiSliders } from "react-icons/fi";
import { addDoc, collection, doc, increment, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { adminUpiId, db } from "@/lib/firebase";
import type { PaymentRequest } from "@/types/app";

type FundsTab = "add" | "withdraw" | "margin" | "ledger";

export function FundsPage({ balance }: { balance: number }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<FundsTab>("add");

  // Add funds state
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Margin calc
  const [marginSymbol, setMarginSymbol] = useState("AAPL");
  const [marginLots, setMarginLots] = useState("1");
  const MARGIN_RATES: Record<string, { lotSize: number; span: number; exposure: number }> = {
    AAPL: { lotSize: 100, span: 15000, exposure: 7500 },
    MSFT: { lotSize: 100, span: 18000, exposure: 9000 },
    NVDA: { lotSize: 100, span: 22000, exposure: 11000 },
    TSLA: { lotSize: 100, span: 24000, exposure: 12000 },
    AMD: { lotSize: 100, span: 12000, exposure: 6000 },
    META: { lotSize: 100, span: 17000, exposure: 8500 },
  };
  const marginInfo = MARGIN_RATES[marginSymbol] ?? MARGIN_RATES.AAPL;
  const totalMargin = (marginInfo.span + marginInfo.exposure) * Number(marginLots || 1);

  // Ledger
  const [payments, setPayments] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    // No orderBy on different field — sort client-side
    const q = query(collection(db, "payments"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PaymentRequest[];
      all.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setPayments(all);
    });
  }, [user]);

  async function handleAddFunds(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setAddLoading(true);
    setAddMsg("");
    try {
      await addDoc(collection(db, "payments"), {
        amount: Number(amount),
        utr: utr.trim(),
        status: "pending",
        userEmail: user.email,
        userId: user.uid,
        type: "deposit",
        createdAt: serverTimestamp(),
      });
      setAmount(""); setUtr("");
      setAddMsg("✅ Deposit request submitted. Admin will verify and credit your wallet.");
    } catch {
      setAddMsg("❌ Unable to submit. Check Firestore rules.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleWithdraw(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    const amt = Number(withdrawAmount);
    if (amt <= 0 || amt > balance) {
      setWithdrawMsg("❌ Invalid amount or insufficient balance.");
      return;
    }
    setWithdrawLoading(true);
    setWithdrawMsg("");
    try {
      // Deduct from wallet immediately (dummy withdrawal)
      await updateDoc(doc(db, "users", user.uid), {
        walletBalance: increment(-amt),
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "payments"), {
        amount: amt,
        utr: "WITHDRAW-" + Date.now(),
        bankDetails: withdrawBank.trim(),
        status: "approved",
        userEmail: user.email,
        userId: user.uid,
        type: "withdrawal",
        createdAt: serverTimestamp(),
      });
      setWithdrawAmount(""); setWithdrawBank("");
      setWithdrawMsg(`✅ ₹${amt.toLocaleString("en-IN")} withdrawal processed. Will reach your account in 1-2 business days.`);
    } catch {
      setWithdrawMsg("❌ Withdrawal failed. Try again.");
    } finally {
      setWithdrawLoading(false);
    }
  }

  const TABS: Array<{ key: FundsTab; label: string; icon: React.ReactNode }> = [
    { key: "add", label: "Add Funds", icon: <FiArrowDownLeft /> },
    { key: "withdraw", label: "Withdraw", icon: <FiSend /> },
    { key: "margin", label: "Margin Calc", icon: <FiSliders /> },
    { key: "ledger", label: "Ledger", icon: <FiList /> },
  ];

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.88))] p-5">
        <p className="text-sm text-slate-400">Available Balance</p>
        <p className="mt-1 text-3xl font-bold text-white">₹{balance.toLocaleString("en-IN")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Used Margin</p>
            <p className="font-bold text-white">₹0</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Free Cash</p>
            <p className="font-bold text-emerald-300">₹{balance.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${tab === t.key ? "bg-emerald-400 text-slate-950" : "border border-white/10 bg-white/[0.04] text-slate-400"}`}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Add Funds */}
      {tab === "add" && (
        <>
          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white p-3">
                <Image src="/upi-qr.svg" alt="UPI QR" width={116} height={116} className="h-28 w-28" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pay to UPI ID</p>
                <p className="mt-1 break-all text-lg font-semibold text-white">{adminUpiId}</p>
                <p className="mt-2 text-xs text-slate-500">Scan QR or pay manually then submit UTR below</p>
              </div>
            </div>
          </section>

          <form onSubmit={handleAddFunds} className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold text-white">Submit Payment</h2>
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 2000, 5000, 10000].map((q) => (
                <button key={q} type="button" onClick={() => setAmount(String(q))}
                  className="rounded-xl bg-black/30 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-emerald-400/15 hover:text-emerald-300">
                  ₹{q.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (₹)" className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
            <input type="text" required value={utr} onChange={(e) => setUtr(e.target.value)}
              placeholder="UTR / Transaction ID" className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
            {addMsg && <p className={`text-sm ${addMsg.startsWith("✅") ? "text-emerald-300" : "text-red-300"}`}>{addMsg}</p>}
            <button type="submit" disabled={addLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 disabled:opacity-60">
              <FiSend /> {addLoading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </>
      )}

      {/* Withdraw */}
      {tab === "withdraw" && (
        <form onSubmit={handleWithdraw} className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-lg font-semibold text-white">Withdraw Funds</h2>
          <p className="text-xs text-slate-500">Available: ₹{balance.toLocaleString("en-IN")}</p>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].map((q) => (
              <button key={q} type="button" onClick={() => setWithdrawAmount(String(Math.min(q, balance)))}
                className="rounded-xl bg-black/30 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-red-400/15 hover:text-red-300">
                ₹{q.toLocaleString("en-IN")}
              </button>
            ))}
            <button type="button" onClick={() => setWithdrawAmount(String(balance))}
              className="rounded-xl bg-black/30 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-red-400/15 hover:text-red-300">
              All
            </button>
          </div>
          <input type="number" min="1" max={balance} required value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Withdraw amount (₹)" className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
          <input type="text" required value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)}
            placeholder="Bank account / UPI ID" className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
          {withdrawMsg && <p className={`text-sm ${withdrawMsg.startsWith("✅") ? "text-emerald-300" : "text-red-300"}`}>{withdrawMsg}</p>}
          <button type="submit" disabled={withdrawLoading || balance <= 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-400 text-sm font-bold text-white disabled:opacity-60">
            <FiArrowDownLeft /> {withdrawLoading ? "Processing..." : "Withdraw Funds"}
          </button>
          <p className="text-xs text-slate-500 text-center">Demo: amount deducted instantly. In production, requires bank verification.</p>
        </form>
      )}

      {/* Margin Calculator */}
      {tab === "margin" && (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">F&O Margin Calculator</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Symbol</span>
              <select value={marginSymbol} onChange={(e) => setMarginSymbol(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-sm font-bold text-white outline-none">
                {Object.keys(MARGIN_RATES).map((s) => (
                  <option key={s} className="bg-slate-950" value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Lots</span>
              <input type="number" min="1" value={marginLots} onChange={(e) => setMarginLots(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Lot Size</p>
              <p className="font-bold text-white">{marginInfo.lotSize}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">SPAN Margin</p>
              <p className="font-bold text-white">₹{(marginInfo.span * Number(marginLots || 1)).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Exposure Margin</p>
              <p className="font-bold text-white">₹{(marginInfo.exposure * Number(marginLots || 1)).toLocaleString("en-IN")}</p>
            </div>
            <div className={`rounded-xl p-3 ${totalMargin > balance ? "bg-red-400/10" : "bg-emerald-400/10"}`}>
              <p className="text-xs text-slate-500">Total Required</p>
              <p className={`font-bold ${totalMargin > balance ? "text-red-300" : "text-emerald-300"}`}>₹{totalMargin.toLocaleString("en-IN")}</p>
            </div>
          </div>
          {totalMargin > balance && (
            <p className="rounded-xl bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">
              ⚠️ Insufficient balance. Need ₹{(totalMargin - balance).toLocaleString("en-IN")} more.
            </p>
          )}
          {totalMargin <= balance && (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300">
              ✅ Sufficient balance for {marginLots} lot(s) of {marginSymbol}
            </p>
          )}
          <p className="text-xs text-slate-500">* SPAN/Exposure margins are approximate. Actual margins vary by broker and volatility.</p>
        </div>
      )}

      {/* Ledger */}
      {tab === "ledger" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Fund Ledger</h2>
          {payments.length === 0 ? (
            <div className="rounded-2xl bg-black/20 p-4 text-sm text-slate-400">No transactions yet.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-[#08111a] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">
                      {(p as PaymentRequest & { type?: string }).type === "withdrawal" ? "Withdrawal" : "Deposit"} — ₹{p.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">UTR: {p.utr}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${
                    p.status === "approved" ? "bg-emerald-400/15 text-emerald-300"
                    : p.status === "rejected" ? "bg-red-400/15 text-red-300"
                    : "bg-amber-300/15 text-amber-200"
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

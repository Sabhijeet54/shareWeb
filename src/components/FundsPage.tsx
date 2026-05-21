"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiSend, FiArrowDownLeft, FiList } from "react-icons/fi";
import { FiSliders } from "react-icons/fi";
import { addDoc, collection, doc, increment, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { adminUpiId, db } from "@/lib/firebase";
import { equitySymbols, getContractMeta } from "@/lib/marketData";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
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
  const [withdrawIfsc, setWithdrawIfsc] = useState("");
  const [withdrawName, setWithdrawName] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"bank" | "upi">("bank");
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Margin calc
<<<<<<< Updated upstream
  const [marginSymbol, setMarginSymbol] = useState("NIFTY");
  const [marginLots, setMarginLots] = useState("1");
  const MARGIN_RATES: Record<string, { lotSize: number; span: number; exposure: number }> = {
    NIFTY: { lotSize: 75, span: 42000, exposure: 21000 },
    BANKNIFTY: { lotSize: 30, span: 34000, exposure: 17000 },
    RELIANCE: { lotSize: 250, span: 28000, exposure: 14000 },
    SBIN: { lotSize: 1500, span: 8000, exposure: 4000 },
  };
  const marginInfo = MARGIN_RATES[marginSymbol] ?? MARGIN_RATES.NIFTY;
=======
  const [marginSymbol, setMarginSymbol] = useState(equitySymbols[0] ?? "");
  const [marginLots, setMarginLots] = useState("1");
  const marginQuotes = useLiveQuotes(equitySymbols, 15000);
  const marginInfo = useMemo(() => {
    const quote = marginQuotes[marginSymbol];
    const lotSize = getContractMeta({
      symbol: `${marginSymbol} FUT`,
      title: `${marginSymbol} FUT`,
      subtitle: "Current month",
      price: 0,
      change: 0,
      volume: "—",
      high: 0,
      low: 0,
    }).lotSize;
    const referencePrice = quote && !quote.isLoading && quote.price > 0 ? quote.price : 0;
    const notionalPerLot = referencePrice * lotSize;
    return {
      lotSize,
      ltp: referencePrice,
      span: Math.round(notionalPerLot * 0.12),
      exposure: Math.round(notionalPerLot * 0.06),
      isLive: referencePrice > 0,
    };
  }, [marginQuotes, marginSymbol]);
>>>>>>> Stashed changes
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
    if (amt < 100) {
      setWithdrawMsg("❌ Minimum withdrawal amount is ₹100.");
      return;
    }
    if (withdrawMethod === "bank" && (!withdrawBank.trim() || !withdrawIfsc.trim() || !withdrawName.trim())) {
      setWithdrawMsg("❌ Please fill all bank details.");
      return;
    }
    if (withdrawMethod === "upi" && !withdrawBank.trim()) {
      setWithdrawMsg("❌ Please enter your UPI ID.");
      return;
    }
    if (!withdrawConfirm) {
      setWithdrawConfirm(true);
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
      const bankDetails = withdrawMethod === "bank"
        ? `A/C: ${withdrawBank.trim()} | IFSC: ${withdrawIfsc.trim()} | Name: ${withdrawName.trim()}`
        : `UPI: ${withdrawBank.trim()}`;
      await addDoc(collection(db, "payments"), {
        amount: amt,
        utr: "WD-" + Date.now(),
        bankDetails,
        status: "approved",
        userEmail: user.email,
        userId: user.uid,
        type: "withdrawal",
        method: withdrawMethod,
        createdAt: serverTimestamp(),
      });
      setWithdrawAmount(""); setWithdrawBank(""); setWithdrawIfsc(""); setWithdrawName("");
      setWithdrawConfirm(false);
      setWithdrawMsg(`✅ ₹${amt.toLocaleString("en-IN")} withdrawal processed successfully. Will be credited to your ${withdrawMethod === "bank" ? "bank account" : "UPI"} within 1-2 business days.`);
    } catch {
      setWithdrawMsg("❌ Withdrawal failed. Please try again.");
      setWithdrawConfirm(false);
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
        <p className="text-sm text-[var(--text-secondary)]">Available Balance</p>
        <p className="mt-1 text-3xl font-bold text-[var(--text-primary)]">₹{balance.toLocaleString("en-IN")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">Used Margin</p>
            <p className="font-bold text-[var(--text-primary)]">₹0</p>
          </div>
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">Free Cash</p>
            <p className="font-bold text-[var(--accent-label)]">₹{balance.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-4 gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex h-11 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ${tab === t.key ? "bg-emerald-400 text-slate-950" : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]"}`}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Add Funds */}
      {tab === "add" && (
        <>
          <section className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white p-3">
                <Image src="/upi-qr.svg" alt="UPI QR" width={116} height={116} className="h-28 w-28" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Pay to UPI ID</p>
                <p className="mt-1 break-all text-lg font-semibold text-[var(--text-primary)]">{adminUpiId}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Scan QR or pay manually then submit UTR below</p>
              </div>
            </div>
          </section>

          <form onSubmit={handleAddFunds} className="space-y-3 rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Submit Payment</h2>
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 2000, 5000, 10000].map((q) => (
                <button key={q} type="button" onClick={() => setAmount(String(q))}
                  className="rounded-xl bg-[var(--background)]/80 px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-emerald-400/15 hover:text-[var(--accent-label)]">
                  ₹{q.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (₹)" className="h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/80 px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            <input type="text" required value={utr} onChange={(e) => setUtr(e.target.value)}
              placeholder="UTR / Transaction ID" className="h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/80 px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            {addMsg && <p className={`text-sm ${addMsg.startsWith("✅") ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>{addMsg}</p>}
            <button type="submit" disabled={addLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 disabled:opacity-60">
              <FiSend /> {addLoading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </>
      )}

      {/* Withdraw */}
      {tab === "withdraw" && (
        <div className="space-y-4">
          {/* Withdraw info banner */}
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-[var(--warn-label)]">Withdrawal Policy</p>
            <ul className="mt-2 space-y-1 text-xs text-[var(--warn-label-dim)]">
              <li>• Minimum withdrawal: ₹100</li>
              <li>• Processing time: 1-2 business days</li>
              <li>• No withdrawal charges</li>
              <li>• Available balance: <strong className="text-[var(--warn-label)]">₹{balance.toLocaleString("en-IN")}</strong></li>
            </ul>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4 rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Withdraw Funds</h2>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)]">Amount (₹)</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {[500, 1000, 2000, 5000, 10000].map((q) => (
                  <button key={q} type="button" onClick={() => { setWithdrawAmount(String(Math.min(q, balance))); setWithdrawConfirm(false); }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      withdrawAmount === String(Math.min(q, balance))
                        ? "bg-red-400/20 text-[var(--error-label)] border border-red-400/30"
                        : "bg-[var(--background)] text-[var(--text-secondary)] hover:bg-red-400/10 hover:text-[var(--error-label)]"
                    }`}>
                    ₹{q.toLocaleString("en-IN")}
                  </button>
                ))}
                <button type="button" onClick={() => { setWithdrawAmount(String(balance)); setWithdrawConfirm(false); }}
                  className="rounded-xl bg-[var(--background)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-red-400/10 hover:text-[var(--error-label)]">
                  Full
                </button>
              </div>
              <input type="number" min="100" max={balance} required value={withdrawAmount}
                onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawConfirm(false); }}
                placeholder="Enter amount" className="mt-2 h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-red-400/50" />
            </div>

            {/* Method selector */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)]">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => { setWithdrawMethod("bank"); setWithdrawConfirm(false); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                    withdrawMethod === "bank"
                      ? "bg-emerald-400/15 text-[var(--green)] border border-emerald-400/30"
                      : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--card-border)]"
                  }`}>
                  🏦 Bank Transfer
                </button>
                <button type="button" onClick={() => { setWithdrawMethod("upi"); setWithdrawConfirm(false); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
                    withdrawMethod === "upi"
                      ? "bg-emerald-400/15 text-[var(--green)] border border-emerald-400/30"
                      : "bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--card-border)]"
                  }`}>
                  📱 UPI
                </button>
              </div>
            </div>

            {/* Bank details */}
            {withdrawMethod === "bank" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Beneficiary Name</label>
                  <input type="text" required value={withdrawName} onChange={(e) => { setWithdrawName(e.target.value); setWithdrawConfirm(false); }}
                    placeholder="Account holder name" className="mt-1 h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Account Number</label>
                  <input type="text" required value={withdrawBank} onChange={(e) => { setWithdrawBank(e.target.value); setWithdrawConfirm(false); }}
                    placeholder="Bank account number" className="mt-1 h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400/50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-muted)]">IFSC Code</label>
                  <input type="text" required value={withdrawIfsc} onChange={(e) => { setWithdrawIfsc(e.target.value.toUpperCase()); setWithdrawConfirm(false); }}
                    placeholder="e.g. SBIN0001234" maxLength={11}
                    className="mt-1 h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400/50 uppercase" />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]">UPI ID</label>
                <input type="text" required value={withdrawBank} onChange={(e) => { setWithdrawBank(e.target.value); setWithdrawConfirm(false); }}
                  placeholder="yourname@upi" className="mt-1 h-12 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-emerald-400/50" />
              </div>
            )}

            {/* Confirmation */}
            {withdrawConfirm && Number(withdrawAmount) > 0 && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 space-y-2">
                <p className="text-sm font-bold text-[var(--error-label)]">⚠️ Confirm Withdrawal</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)]">Amount</p>
                    <p className="font-bold text-[var(--text-primary)]">₹{Number(withdrawAmount).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Method</p>
                    <p className="font-bold text-[var(--text-primary)]">{withdrawMethod === "bank" ? "Bank Transfer" : "UPI"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--text-muted)]">To</p>
                    <p className="font-bold text-[var(--text-primary)]">
                      {withdrawMethod === "bank" ? `${withdrawName} · A/C: ****${withdrawBank.slice(-4)}` : withdrawBank}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--error-label)]">Click "Confirm Withdrawal" below to proceed. This action cannot be undone.</p>
              </div>
            )}

            {withdrawMsg && <p className={`text-sm ${withdrawMsg.startsWith("✅") ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>{withdrawMsg}</p>}

            <button type="submit" disabled={withdrawLoading || balance <= 0 || balance < 100}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-sm font-bold text-white disabled:opacity-60 hover:bg-red-600 transition">
              <FiArrowDownLeft /> {withdrawLoading ? "Processing..." : withdrawConfirm ? "Confirm Withdrawal" : "Withdraw Funds"}
            </button>
          </form>
        </div>
      )}

      {/* Margin Calculator */}
      {tab === "margin" && (
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">F&O Margin Calculator</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl bg-[var(--background)]/80 p-3">
              <span className="text-xs text-[var(--text-muted)]">Symbol</span>
              <select value={marginSymbol} onChange={(e) => setMarginSymbol(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none">
                {equitySymbols.map((s) => (
                  <option key={s} className="bg-[var(--background)]" value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="rounded-2xl bg-[var(--background)]/80 p-3">
              <span className="text-xs text-[var(--text-muted)]">Lots</span>
              <input type="number" min="1" value={marginLots} onChange={(e) => setMarginLots(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-[var(--text-primary)] outline-none" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--background)]/80 p-3">
              <p className="text-xs text-[var(--text-muted)]">Lot Size</p>
              <p className="font-bold text-[var(--text-primary)]">{marginInfo.lotSize}</p>
            </div>
            <div className="rounded-xl bg-[var(--background)]/80 p-3">
              <p className="text-xs text-[var(--text-muted)]">LTP</p>
              <p className="font-bold text-[var(--text-primary)]">{marginInfo.isLive ? `₹${marginInfo.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</p>
            </div>
            <div className="rounded-xl bg-[var(--background)]/80 p-3">
              <p className="text-xs text-[var(--text-muted)]">SPAN Margin</p>
              <p className="font-bold text-[var(--text-primary)]">₹{(marginInfo.span * Number(marginLots || 1)).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-[var(--background)]/80 p-3">
              <p className="text-xs text-[var(--text-muted)]">Exposure Margin</p>
              <p className="font-bold text-[var(--text-primary)]">₹{(marginInfo.exposure * Number(marginLots || 1)).toLocaleString("en-IN")}</p>
            </div>
            <div className={`rounded-xl p-3 ${totalMargin > balance ? "bg-red-400/10" : "bg-emerald-400/10"}`}>
              <p className="text-xs text-[var(--text-muted)]">Total Required</p>
              <p className={`font-bold ${totalMargin > balance ? "text-[var(--error-label)]" : "text-[var(--accent-label)]"}`}>₹{totalMargin.toLocaleString("en-IN")}</p>
            </div>
          </div>
          {totalMargin > balance && (
            <p className="rounded-xl bg-red-400/10 px-3 py-2 text-xs font-bold text-[var(--error-label)]">
              ⚠️ Insufficient balance. Need ₹{(totalMargin - balance).toLocaleString("en-IN")} more.
            </p>
          )}
          {totalMargin <= balance && (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-[var(--accent-label)]">
              ✅ Sufficient balance for {marginLots} lot(s) of {marginSymbol}
            </p>
          )}
          <p className="text-xs text-[var(--text-muted)]">* SPAN/Exposure margins are live-price based estimates. Actual broker margins can vary.</p>
        </div>
      )}

      {/* Ledger */}
      {tab === "ledger" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Fund Ledger</h2>
          {payments.length === 0 ? (
            <div className="rounded-2xl bg-[var(--background)]/80 p-4 text-sm text-[var(--text-secondary)]">No transactions yet.</div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">
                      {(p as PaymentRequest & { type?: string }).type === "withdrawal" ? "Withdrawal" : "Deposit"} — ₹{p.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">UTR: {p.utr}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {p.createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${
                    p.status === "approved" ? "bg-emerald-400/15 text-[var(--accent-label)]"
                    : p.status === "rejected" ? "bg-red-400/15 text-[var(--error-label)]"
                    : "bg-amber-300/15 text-[var(--warn-label-dim)]"
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

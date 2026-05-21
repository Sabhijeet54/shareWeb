"use client";

import { useEffect, useState } from "react";
import {
  addDoc, collection, onSnapshot, query, where, serverTimestamp, deleteDoc, doc,
} from "firebase/firestore";
import { FiPlus, FiTrash2, FiBook } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { Timestamp } from "firebase/firestore";

type JournalEntry = {
  id: string;
  date: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  emotion: "Confident" | "Fearful" | "Greedy" | "Neutral" | "FOMO";
  strategy: string;
  notes: string;
  mistakes: string;
  lessons: string;
  userId: string;
  createdAt?: Timestamp;
};

const EMOTIONS = ["Confident", "Neutral", "Fearful", "Greedy", "FOMO"] as const;
const STRATEGIES = ["Breakout", "Reversal", "Momentum", "Scalping", "Swing", "BTST", "Options Sell", "Hedging", "Other"];

export function TradingJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [symbol, setSymbol] = useState("AAPL");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [emotion, setEmotion] = useState<typeof EMOTIONS[number]>("Neutral");
  const [strategy, setStrategy] = useState("Breakout");
  const [notes, setNotes] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [lessons, setLessons] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "journal"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as JournalEntry[];
      all.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setEntries(all);
    });
  }, [user]);

  const pnl = (Number(exitPrice) - Number(entryPrice)) * Number(qty) * (side === "BUY" ? 1 : -1);

  async function addEntry() {
    if (!user || !entryPrice || !qty) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "journal"), {
        date, symbol, side,
        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice) || 0,
        qty: Number(qty),
        pnl: Number(exitPrice) > 0 ? pnl : 0,
        emotion, strategy, notes, mistakes, lessons,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setEntryPrice(""); setExitPrice(""); setQty("1"); setNotes(""); setMistakes(""); setLessons("");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    await deleteDoc(doc(db, "journal", id));
  }

  const totalPnl = entries.reduce((s, e) => s + e.pnl, 0);
  const winRate = entries.length > 0
    ? (entries.filter((e) => e.pnl > 0).length / entries.length * 100).toFixed(0)
    : "0";
  const avgWin = entries.filter((e) => e.pnl > 0).reduce((s, e) => s + e.pnl, 0) / Math.max(1, entries.filter((e) => e.pnl > 0).length);
  const avgLoss = entries.filter((e) => e.pnl < 0).reduce((s, e) => s + e.pnl, 0) / Math.max(1, entries.filter((e) => e.pnl < 0).length);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-slate-500">Total P&L</p>
          <p className={`text-xl font-bold ${totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-slate-500">Win Rate</p>
          <p className="text-xl font-bold text-white">{winRate}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-slate-500">Avg Win</p>
          <p className="text-xl font-bold text-emerald-300">₹{avgWin.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-slate-500">Avg Loss</p>
          <p className="text-xl font-bold text-red-300">₹{Math.abs(avgLoss).toFixed(0)}</p>
        </div>
      </div>

      <button type="button" onClick={() => setShowForm(!showForm)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950">
        <FiPlus /> {showForm ? "Cancel" : "Add Journal Entry"}
      </button>

      {/* Entry form */}
      {showForm && (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 space-y-4">
          <p className="text-sm font-bold text-white flex items-center gap-2"><FiBook /> New Entry</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Symbol</span>
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["BUY", "SELL"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setSide(s)}
                className={`h-10 rounded-xl text-sm font-bold ${side === s ? (s === "BUY" ? "bg-emerald-400 text-slate-950" : "bg-red-400 text-white") : "bg-black/30 text-slate-400"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Entry Price</span>
              <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Exit Price</span>
              <input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Qty</span>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
          </div>

          {Number(exitPrice) > 0 && (
            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${pnl >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
              P&L: {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Emotion</span>
              <select value={emotion} onChange={(e) => setEmotion(e.target.value as typeof EMOTIONS[number])}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none">
                {EMOTIONS.map((em) => <option key={em} className="bg-slate-950">{em}</option>)}
              </select>
            </label>
            <label className="rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">Strategy</span>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-white outline-none">
                {STRATEGIES.map((s) => <option key={s} className="bg-slate-950">{s}</option>)}
              </select>
            </label>
          </div>

          {[
            { label: "Trade Notes", value: notes, set: setNotes },
            { label: "Mistakes Made", value: mistakes, set: setMistakes },
            { label: "Lessons Learned", value: lessons, set: setLessons },
          ].map(({ label, value, set }) => (
            <label key={label} className="block rounded-xl bg-black/25 p-3">
              <span className="text-xs text-slate-500">{label}</span>
              <textarea value={value} onChange={(e) => set(e.target.value)} rows={2}
                className="mt-1 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                placeholder="Write here..." />
            </label>
          ))}

          <button type="button" disabled={busy || !entryPrice || !qty} onClick={addEntry}
            className="h-12 w-full rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 disabled:opacity-60">
            {busy ? "Saving..." : "Save Entry"}
          </button>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-black/20 p-4 text-sm text-slate-400">No journal entries. Start documenting your trades to improve.</p>
        ) : entries.map((e) => (
          <article key={e.id} className="rounded-2xl border border-white/10 bg-[#08111a] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${e.side === "BUY" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{e.side}</span>
                  <p className="font-bold text-white">{e.symbol}</p>
                  <span className="text-xs text-slate-500">{e.date}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{e.strategy} · {e.emotion}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-bold ${e.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {e.pnl >= 0 ? "+" : ""}₹{e.pnl.toFixed(2)}
                </p>
                <button type="button" onClick={() => deleteEntry(e.id)} className="text-slate-600 hover:text-red-400">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <p className="text-slate-500">Entry <span className="block font-bold text-white">₹{e.entryPrice}</span></p>
              <p className="text-slate-500">Exit <span className="block font-bold text-white">{e.exitPrice > 0 ? `₹${e.exitPrice}` : "Open"}</span></p>
              <p className="text-slate-500">Qty <span className="block font-bold text-white">{e.qty}</span></p>
            </div>
            {e.notes && <p className="mt-2 text-xs text-slate-400">📝 {e.notes}</p>}
            {e.mistakes && <p className="mt-1 text-xs text-red-400">❌ {e.mistakes}</p>}
            {e.lessons && <p className="mt-1 text-xs text-emerald-400">✅ {e.lessons}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

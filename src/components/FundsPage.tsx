"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { FiSend } from "react-icons/fi";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { adminUpiId, db } from "@/lib/firebase";

export function FundsPage({ balance }: { balance: number }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.email) return;

    setLoading(true);
    setMessage("");

    try {
      await addDoc(collection(db, "payments"), {
        amount: Number(amount),
        utr: utr.trim(),
        status: "pending",
        userEmail: user.email,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setAmount("");
      setUtr("");
      setMessage("Payment request submitted for admin verification.");
    } catch {
      setMessage("Unable to submit request. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm text-slate-400">Current balance</p>
        <p className="mt-2 text-3xl font-bold text-white">
          Rs. {balance.toLocaleString("en-IN")}
        </p>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white p-3">
            <Image
              src="/upi-qr.svg"
              alt="Admin UPI QR"
              width={116}
              height={116}
              className="h-28 w-28"
            />
          </div>
          <div>
            <p className="text-sm text-slate-400">Admin UPI ID</p>
            <p className="mt-1 break-all text-lg font-semibold text-white">
              {adminUpiId}
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
      >
        <h2 className="text-lg font-semibold text-white">Add Money</h2>

        <input
          type="number"
          min="1"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount"
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600"
        />

        <input
          type="text"
          required
          value={utr}
          onChange={(event) => setUtr(event.target.value)}
          placeholder="UTR number"
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-slate-600"
        />

        {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
        >
          <FiSend />
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}

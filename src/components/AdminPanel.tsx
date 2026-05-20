"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PaymentRequest } from "@/types/app";

export function AdminPanel() {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const paymentsQuery = query(
      collection(db, "payments"),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as PaymentRequest[],
      );
    });
  }, []);

  async function approve(payment: PaymentRequest) {
    setBusyId(payment.id);

    try {
      await updateDoc(doc(db, "users", payment.userId), {
        walletBalance: increment(payment.amount),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "payments", payment.id), {
        status: "approved",
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusyId("");
    }
  }

  async function reject(payment: PaymentRequest) {
    setBusyId(payment.id);

    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status: "rejected",
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
          Admin panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Payment Requests
        </h2>
      </div>

      {payments.length === 0 ? (
        <p className="rounded-2xl bg-black/20 p-4 text-sm text-slate-400">
          No payment requests yet.
        </p>
      ) : (
        payments.map((payment) => (
          <article
            key={payment.id}
            className="rounded-2xl border border-white/10 bg-[#08111a] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">
                  Rs. {payment.amount.toLocaleString("en-IN")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {payment.userEmail}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  UTR: {payment.utr}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                  payment.status === "approved"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : payment.status === "rejected"
                      ? "bg-red-400/15 text-red-300"
                      : "bg-amber-300/15 text-amber-200"
                }`}
              >
                {payment.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {payment.status === "pending" ? (
                <>
                  <button
                    type="button"
                    disabled={busyId === payment.id}
                    onClick={() => approve(payment)}
                    className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-3 text-sm font-bold text-slate-950 disabled:opacity-60"
                  >
                    <FiCheck /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === payment.id}
                    onClick={() => reject(payment)}
                    className="flex h-10 items-center gap-2 rounded-xl bg-red-400 px-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <FiX /> Reject
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))
      )}
    </section>
  );
}

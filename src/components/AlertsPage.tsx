"use client";

import { useState } from "react";
import { FiBell, FiPlus, FiTrash2, FiX } from "react-icons/fi";

type AlertType = "price" | "percent" | "volume" | "oi" | "order" | "margin";
type Alert = {
  id: string;
  symbol: string;
  type: AlertType;
  condition: "above" | "below";
  value: number;
  currentPrice: number;
  triggered: boolean;
  createdAt: string;
};

const mockAlerts: Alert[] = [
  { id: "1", symbol: "RELIANCE", type: "price", condition: "above", value: 3000, currentPrice: 2942.80, triggered: false, createdAt: "2025-05-18" },
  { id: "2", symbol: "NIFTY", type: "price", condition: "below", value: 24500, currentPrice: 24850, triggered: false, createdAt: "2025-05-17" },
  { id: "3", symbol: "TATAMOTORS", type: "percent", condition: "above", value: 5, currentPrice: 1024.50, triggered: true, createdAt: "2025-05-16" },
  { id: "4", symbol: "SBIN", type: "volume", condition: "above", value: 30000000, currentPrice: 868.40, triggered: false, createdAt: "2025-05-15" },
  { id: "5", symbol: "BANKNIFTY", type: "oi", condition: "above", value: 5000000, currentPrice: 53480, triggered: true, createdAt: "2025-05-14" },
];


export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [showCreate, setShowCreate] = useState(false);
  const [newSymbol, setNewSymbol] = useState("RELIANCE");
  const [newType, setNewType] = useState<AlertType>("price");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [newValue, setNewValue] = useState("");

  function createAlert() {
    if (!newValue) return;
    const alert: Alert = {
      id: String(Date.now()),
      symbol: newSymbol,
      type: newType,
      condition: newCondition,
      value: Number(newValue),
      currentPrice: 0,
      triggered: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setAlerts((prev) => [alert, ...prev]);
    setShowCreate(false);
    setNewValue("");
  }

  function deleteAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiBell className="text-amber-300" /> Alerts</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">
          <FiPlus size={14} /> New Alert
        </button>
      </div>

      {/* Create Alert */}
      {showCreate && (
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-900/10 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol" className="h-10 rounded-lg bg-black/30 px-3 text-sm text-white outline-none" />
            <select value={newType} onChange={(e) => setNewType(e.target.value as AlertType)}
              className="h-10 rounded-lg bg-black/30 px-3 text-sm text-white">
              <option value="price" className="bg-slate-900">Price</option>
              <option value="percent" className="bg-slate-900">% Change</option>
              <option value="volume" className="bg-slate-900">Volume Spike</option>
              <option value="oi" className="bg-slate-900">OI Change</option>
            </select>
            <select value={newCondition} onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
              className="h-10 rounded-lg bg-black/30 px-3 text-sm text-white">
              <option value="above" className="bg-slate-900">Goes Above</option>
              <option value="below" className="bg-slate-900">Goes Below</option>
            </select>
            <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value" className="h-10 rounded-lg bg-black/30 px-3 text-sm text-white outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={createAlert} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950">Create</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-400"><FiX /></button>
          </div>
        </div>
      )}


      {/* Active Alerts */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-2">Active ({activeAlerts.length})</h3>
        <div className="space-y-2">
          {activeAlerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-white">{a.symbol}</p>
                  <p className="text-xs text-slate-500">
                    {a.type === "price" && `Price ${a.condition} Rs. ${a.value}`}
                    {a.type === "percent" && `${a.condition === "above" ? "+" : "-"}${a.value}% change`}
                    {a.type === "volume" && `Volume ${a.condition} ${(a.value / 100000).toFixed(0)}L`}
                    {a.type === "oi" && `OI ${a.condition} ${(a.value / 100000).toFixed(0)}L`}
                  </p>
                </div>
              </div>
              <button onClick={() => deleteAlert(a.id)} className="rounded-lg p-2 text-slate-500 hover:text-red-300"><FiTrash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-2">Triggered ({triggeredAlerts.length})</h3>
          <div className="space-y-2">
            {triggeredAlerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-white">{a.symbol}</p>
                    <p className="text-xs text-emerald-300">
                      {a.type} alert triggered - {a.condition} {a.value}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteAlert(a.id)} className="rounded-lg p-2 text-slate-500 hover:text-red-300"><FiTrash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

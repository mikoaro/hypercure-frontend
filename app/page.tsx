"use client";
import { useState, useEffect, useRef } from "react";
import ChassisScene from "@/components/ChassisModel";
import ChassisSceneRight from "@/components/ChassisModel-right";
import {
  Activity,
  Thermometer,
  Wind,
  Zap,
  Play,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [status, setStatus] = useState("DISCONNECTED");
  const [activeMode, setActiveMode] = useState("NORMAL");
  const [interventionSent, setInterventionSent] = useState(false);

  // FIX: Ref to track "Ignore" window
  const ignoreAlertsRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

  useEffect(() => {
    const finalWsUrl = WS_URL.replace("http", "ws").replace("https", "wss");
    const ws = new WebSocket(finalWsUrl);

    ws.onopen = () => setStatus("SYSTEM ONLINE");
    ws.onclose = () => setStatus("DISCONNECTED");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "TELEMETRY") setTelemetry(data.payload);

        // FIX: Only update AI Insight if we aren't ignoring them
        if (data.type === "AI_INSIGHT" && !ignoreAlertsRef.current) {
          setAiInsight(data.payload);
          if (data.payload) {
            setInterventionSent(false);
          }
        }
      } catch (e) {
        console.error("Parse Error", e);
      }
    };
    return () => ws.close();
  }, [WS_URL]);

  const triggerScenario = async (endpoint: string, modeName: string) => {
    try {
      await fetch(`${API_URL}${endpoint}`, { method: "POST" });
      setActiveMode(modeName);
    } catch (e) {
      console.error("API Error", e);
    }
  };

  const handleReset = async () => {
    // 1. Clear Local State
    setAiInsight(null);
    setInterventionSent(false);

    // 2. Enable "Deaf Mode" for 4 seconds (Kills the Ghost Alert)
    ignoreAlertsRef.current = true;
    setTimeout(() => {
      ignoreAlertsRef.current = false;
    }, 4000);

    // 3. Trigger Backend Reset
    triggerScenario("/simulate/reset", "NORMAL");
  };

  const handleIntervention = async () => {
    try {
      await fetch(`${API_URL}/api/intervene`, { method: "POST" });
      setInterventionSent(true);
    } catch (e) {
      console.error("Intervention Error", e);
    }
  };

  const getAlertStyle = (level: string) => {
    if (level === "CRITICAL")
      return "bg-red-900/30 border-red-500 animate-pulse";
    if (level === "WARNING") return "bg-yellow-900/30 border-yellow-500";
    return "bg-[#111625] border-white/5";
  };

  return (
    <main className="p-8 max-w-600 mx-auto grid grid-cols-12 gap-6 font-mono">
      {/* HEADER */}
      <header className="col-span-12 flex justify-between border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold text-white flex gap-3 tracking-tighter">
          <Activity className="text-[#00ff9d]" /> HYPERCURE
        </h1>
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
            status.includes("ONLINE")
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status.includes("ONLINE")
                ? "bg-green-400 animate-pulse"
                : "bg-red-400"
            }`}
          ></div>
          {status}
        </div>
      </header>

      {/* LEFT COLUMN */}
      <div className="col-span-8 flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Temp"
            value={telemetry?.temp_c?.toFixed(1) || "--"}
            unit="°C"
            icon={Thermometer}
          />
          <KpiCard
            label="Pressure"
            value={telemetry?.pressure_bar?.toFixed(2) || "--"}
            unit="Bar"
            icon={Wind}
          />
          <KpiCard
            label="Vacuum"
            value={telemetry?.vacuum_bar?.toFixed(2) || "--"}
            unit="Bar"
            icon={Activity}
          />
        </div>
        <div className="flex gap-6">
          <ChassisScene currentTemp={telemetry?.temp_c || 20} />
          <ChassisSceneRight currentTemp={telemetry?.temp_c || 20} />
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="col-span-4 flex flex-col gap-6">
        <div className="bg-[#111625] p-6 rounded-xl border border-white/10">
          <h3 className="text-white/50 text-xs uppercase font-bold mb-4 flex items-center gap-2">
            <Zap size={14} className="text-[#00ff9d]" /> Silverstone Nightmare:
            Scenario Sim
          </h3>
          <div className="flex flex-col gap-3">
            <SimButton
              label="Optimal Cycle"
              active={activeMode === "NORMAL"}
              onClick={() => triggerScenario("/simulate/normal", "NORMAL")}
              color="text-[#00ff9d]"
            />
            <SimButton
              label="Vacuum Seal Failure"
              active={activeMode === "VACUUM_LEAK"}
              onClick={() =>
                triggerScenario("/simulate/vacuum_leak", "VACUUM_LEAK")
              }
              color="text-yellow-500"
            />
            <SimButton
              label="Exothermic Event"
              active={activeMode === "EXOTHERM"}
              onClick={() => triggerScenario("/simulate/exotherm", "EXOTHERM")}
              color="text-red-500"
            />
          </div>
          <button
            onClick={handleReset}
            className="w-full mt-4 py-3 rounded border border-white/10 text-white/40 text-xs hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} /> RESET SIMULATION
          </button>
        </div>

        <div
          className={`flex-1 rounded-xl border p-6 flex flex-col ${getAlertStyle(
            aiInsight?.risk_level
          )}`}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs uppercase font-bold text-white/70 flex items-center gap-2">
              <ShieldAlert size={14} /> Active Incidents
            </h3>
            {aiInsight?.risk_level && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-white">
                {aiInsight.risk_level}
              </span>
            )}
          </div>
          <div className="flex-1">
            {aiInsight ? (
              <div>
                <div className="text-lg font-bold text-white mb-1">
                  {aiInsight.prediction || "ANALYZING..."}
                </div>
                <div className="text-sm text-white/60">
                  {aiInsight.recommendation}
                </div>
              </div>
            ) : (
              <div className="text-white/30 text-sm italic">
                System Nominal. Monitoring telemetry streams...
              </div>
            )}
          </div>
          {aiInsight?.risk_level === "CRITICAL" && (
            <button
              onClick={handleIntervention}
              disabled={interventionSent}
              className={`mt-6 w-full py-4 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                interventionSent
                  ? "bg-green-500/20 text-green-400 border border-green-500/50 cursor-default"
                  : "bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]"
              }`}
            >
              {interventionSent ? (
                <>
                  <CheckCircle size={18} /> MITIGATION SENT
                </>
              ) : (
                <>
                  <AlertTriangle size={18} /> ENGAGE BACKUP PUMP
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

const KpiCard = ({ label, value, unit, icon: Icon }: any) => (
  <div className="bg-[#111625] border border-white/5 p-5 rounded-lg">
    <div className="flex items-center gap-2 mb-2 text-white/40 text-[10px] uppercase tracking-wider">
      <Icon size={14} /> {label}
    </div>
    <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
      {value} <span className="text-sm text-white/30 font-normal">{unit}</span>
    </div>
  </div>
);

const SimButton = ({ label, active, onClick, color }: any) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded text-left border transition-all relative overflow-hidden group ${
      active
        ? `bg-white/10 border-white/40 ${color}`
        : "bg-black/20 border-white/5 text-white/40 hover:bg-white/5"
    }`}
  >
    <div className="relative z-10 flex justify-between items-center">
      <span className="font-bold text-sm">{label}</span>
      {active && (
        <div
          className={`w-2 h-2 rounded-full ${color.replace(
            "text",
            "bg"
          )} shadow-[0_0_10px_currentColor]`}
        />
      )}
    </div>
  </button>
);

import React, { useState, useEffect } from "react";
import {
  Activity,
  BarChart2,
  BrainCircuit,
  Clock,
  Compass,
  Cpu,
  Layers,
  PieChart,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wheat,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Share2,
  Check,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter
} from "recharts";
import {
  processExperimentalDataset,
  calculateMitigatorEfficacy,
  convertTrialToVitals,
  MealTrialSummary
} from "../ml/experimentalDataset";
import {
  calculateT1DMForecast,
  PredictionHorizon,
  T1DMForecastResult
} from "../ml/t1dmDataset";

export const CGMDashboard: React.FC = () => {
  const allSummaries = processExperimentalDataset();
  const mitigatorImpacts = calculateMitigatorEfficacy();

  // Selected Trial ID from dataset (initialized from URL if present)
  const [selectedTrialId, setSelectedTrialId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const trialParam = params.get("trial");
      if (trialParam && allSummaries.some((s) => s.id === trialParam)) {
        return trialParam;
      }
    }
    return allSummaries[2]?.id || allSummaries[0].id;
  });
  
  // Selected prediction horizon
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hParam = parseInt(params.get("horizon") || "", 10);
      if (hParam === 15 || hParam === 60 || hParam === 120) {
        return hParam as PredictionHorizon;
      }
    }
    return 60;
  });

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Sync trial & horizon to URL query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "cgm_dashboard");
      url.searchParams.set("trial", selectedTrialId);
      url.searchParams.set("horizon", horizon.toString());
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedTrialId, horizon]);

  const copyDirectDashboardLink = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "cgm_dashboard");
      url.searchParams.set("trial", selectedTrialId);
      url.searchParams.set("horizon", horizon.toString());
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const openStandaloneDashboard = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "cgm_dashboard");
      url.searchParams.set("trial", selectedTrialId);
      url.searchParams.set("horizon", horizon.toString());
      window.open(url.toString(), "_blank");
    }
  };

  // Find active trial
  const activeTrial = allSummaries.find((s) => s.id === selectedTrialId) || allSummaries[0];

  // Convert active trial to vitals and compute FFNN forecast
  const activeVitals = convertTrialToVitals(activeTrial);
  const forecastResult: T1DMForecastResult = calculateT1DMForecast(activeVitals, horizon);

  // Build merged trajectory comparison data (Actual CGM vs FFNN Predicted)
  const timePoints = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170];

  const mergedTrajectoryData = timePoints.map((t) => {
    const actualPt = activeTrial.curve.find((c) => c.min === t);
    const actualBG = actualPt ? actualPt.glucose : null;

    let predictedBG: number | null = null;
    let upperCI: number | null = null;
    let lowerCI: number | null = null;

    if (t >= 0 && t <= 120) {
      const predPt = forecastResult.trajectory.find((p) => p.timeMin === Math.round(t / 10) * 10);
      if (predPt) {
        predictedBG = predPt.bg;
        upperCI = predPt.upperCI;
        lowerCI = predPt.lowerCI;
      }
    }

    return {
      timeMin: t,
      actualBG,
      predictedBG,
      upperCI,
      lowerCI
    };
  });

  // Calculate prediction errors at 15m, 60m, 120m
  const actual15 = activeTrial.curve.find((c) => c.min === 15)?.glucose || activeTrial.baseline;
  const actual60 = activeTrial.curve.find((c) => c.min === 60)?.glucose || activeTrial.baseline;
  const actual120 = activeTrial.curve.find((c) => c.min === 120)?.glucose || activeTrial.baseline;

  const pred15 = calculateT1DMForecast(activeVitals, 15).predictedGlucose;
  const pred60 = calculateT1DMForecast(activeVitals, 60).predictedGlucose;
  const pred120 = calculateT1DMForecast(activeVitals, 120).predictedGlucose;

  const err15 = Math.abs(actual15 - pred15);
  const err60 = Math.abs(actual60 - pred60);
  const err120 = Math.abs(actual120 - pred120);

  const mard = Math.round(
    ((Math.abs(actual15 - pred15) / actual15 +
      Math.abs(actual60 - pred60) / actual60 +
      Math.abs(actual120 - pred120) / actual120) / 3) * 1000
  ) / 10;

  // Cohort iAUC distribution
  const iAUCDistribution = allSummaries.map((s) => ({
    name: `${s.subject} (${s.foodsLabel})`,
    iAUC: s.iAUC,
    peakRise: s.peakRise,
    food: s.food,
    mitigator: s.mitigator
  })).sort((a, b) => b.iAUC - a.iAUC);

  return (
    <div className="space-y-6">
      {/* EXECUTIVE DASHBOARD HEADER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <BrainCircuit size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Unified Clinical ML Engine
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">
                CGM Dataset & FFNN Forecast
              </span>
            </div>
            <h1 className="text-xl font-black text-zinc-100 uppercase tracking-tight mt-1">
              CGM Dataset & Postprandial Forecasting Dashboard
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Ingesting 195-min real patient trials • In-silico FFNN trajectory prediction & SHAP feature attribution
            </p>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Select Real CGM Trial Profile:</label>
            <select
              value={selectedTrialId}
              onChange={(e) => setSelectedTrialId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono font-bold text-xs rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 uppercase cursor-pointer max-w-[280px]"
            >
              {allSummaries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} • {s.foodsLabel} (Rep #{s.rep})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Forecast Horizon:</label>
            <div className="flex bg-zinc-900 rounded border border-zinc-800 p-0.5 font-mono text-xs">
              {([15, 60, 120] as PredictionHorizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    horizon === h
                      ? "bg-emerald-500 text-zinc-950 shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  +{h}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-l border-zinc-800 pl-3">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Direct Access:</label>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                onClick={copyDirectDashboardLink}
                title="Copy direct link to open dashboard anywhere"
                className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={openStandaloneDashboard}
                title="Open dashboard in a new browser tab/window"
                className="px-2.5 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer font-bold"
              >
                <ExternalLink size={13} />
                <span>Open Tab</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE TRIAL OVERVIEW BADGES */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">Subject & Meal</span>
          <strong className="text-zinc-100 text-sm font-bold block truncate">
            {activeTrial.subject} • {activeTrial.foodsLabel}
          </strong>
          <span className="text-[10px] text-emerald-400">Mitigator: {activeTrial.mitigator}</span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">Baseline BG</span>
          <strong className="text-zinc-100 text-sm font-bold block">
            {activeTrial.baseline} mg/dL
          </strong>
          <span className="text-[10px] text-zinc-400">t = -25m to 0m</span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">Observed Peak BG</span>
          <strong className="text-rose-400 text-sm font-bold block">
            {activeTrial.peakGlucose} mg/dL
          </strong>
          <span className="text-[10px] text-rose-400/80">Rise: +{activeTrial.peakRise} mg/dL</span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">FFNN Predicted BG (+{horizon}m)</span>
          <strong className="text-purple-400 text-sm font-bold block">
            {forecastResult.predictedGlucose} mg/dL
          </strong>
          <span className="text-[10px] text-purple-400/80">Delta: {forecastResult.delta > 0 ? `+${forecastResult.delta}` : forecastResult.delta} mg/dL</span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">Model Accuracy (MARD)</span>
          <strong className="text-amber-400 text-sm font-bold block">
            {mard}%
          </strong>
          <span className="text-[10px] text-amber-400/80">3-Point Horizon Error</span>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-1 font-mono">
          <span className="text-[9px] text-zinc-500 uppercase block">Glycemic iAUC</span>
          <strong className="text-emerald-400 text-sm font-bold block">
            {activeTrial.iAUC}
          </strong>
          <span className="text-[10px] text-zinc-400">mg·min/dL</span>
        </div>
      </div>

      {/* SECTION 1: TRAJECTORY OVERLAY CHART & SHAP ATTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Dual Trajectory Comparison (8 cols) */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Activity size={16} className="text-emerald-400" />
              Real CGM Trajectory vs FFNN Model Forecast ({activeTrial.subject} - {activeTrial.foodsLabel})
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Actual CGM
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                <span className="w-2.5 h-0.5 bg-purple-400 inline-block" /> FFNN Model
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedTrajectoryData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <XAxis dataKey="timeMin" stroke="#52525b" fontSize={10} unit="m" />
                <YAxis domain={[50, "auto"]} stroke="#52525b" fontSize={10} unit=" mg/dL" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "10px" }} />

                <Line
                  type="monotone"
                  dataKey="actualBG"
                  name={`Actual CGM Trajectory`}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 2 }}
                />

                <Line
                  type="monotone"
                  dataKey="predictedBG"
                  name={`FFNN Forecast (+${horizon}m Horizon)`}
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pointwise Validation Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">+15m Horizon Validation</span>
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="text-zinc-400 text-xs">Actual: <strong>{actual15}</strong></span>
                <span className="text-purple-400 text-xs">Pred: <strong>{pred15}</strong></span>
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-amber-400">Δ {err15}</span>
              </div>
            </div>

            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">+60m Horizon Validation</span>
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="text-zinc-400 text-xs">Actual: <strong>{actual60}</strong></span>
                <span className="text-purple-400 text-xs">Pred: <strong>{pred60}</strong></span>
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-amber-400">Δ {err60}</span>
              </div>
            </div>

            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">+120m Horizon Validation</span>
              <div className="flex justify-center items-center gap-2 mt-1">
                <span className="text-zinc-400 text-xs">Actual: <strong>{actual120}</strong></span>
                <span className="text-purple-400 text-xs">Pred: <strong>{pred120}</strong></span>
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-amber-400">Δ {err120}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: SHAP Attributions for this CGM Trial (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Sparkles size={16} className="text-amber-400" /> Kernel SHAP Feature Attributions
            </div>
            <span className="text-[10px] font-mono text-purple-400 uppercase">+{horizon}m Forecast</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
            {forecastResult.featureRankings.slice(0, 7).map((f) => {
              const isPositive = f.shap >= 0;
              return (
                <div key={f.feature} className="bg-zinc-950 p-2.5 rounded border border-zinc-800 space-y-1 font-mono text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-300 font-bold truncate max-w-[180px]">
                      {f.feature}
                    </span>
                    <span className={`font-mono font-bold ${isPositive ? "text-rose-400" : "text-emerald-400"}`}>
                      {isPositive ? `+${f.shap}` : f.shap} mg/dL
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden flex">
                    {isPositive ? (
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.abs(f.shap) * 3)}%` }}
                      />
                    ) : (
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.abs(f.shap) * 3)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded text-[11px] font-mono text-purple-300">
            🔍 <strong>XAI Insight:</strong> SHAP values detail feature-level contributions to the +{horizon}m prediction. Positive values drive hyperglycemia, while negative values (mitigators/boluses) reduce glucose spikes.
          </div>
        </div>
      </div>

      {/* SECTION 2: COHORT-WIDE EXPERIMENTAL CGM MITIGATOR ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mitigator Spike Dampening Matrix (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Wheat size={16} className="text-emerald-400" /> Dietary Mitigator Efficacy Across Foods (Peak Rise Δ mg/dL)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mitigatorImpacts.map((m) => (
              <div key={m.food} className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                  <span className="font-bold text-zinc-100 uppercase text-xs">{m.food}</span>
                  <span className="text-[11px] text-rose-400 font-bold">Pure: +{m.purePeakRise} mg/dL</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {m.fatPeakRise !== undefined && (
                    <div className="flex items-center justify-between p-1.5 rounded bg-zinc-900">
                      <span className="text-zinc-400">With Fat:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-amber-400">+{m.fatPeakRise} mg/dL</strong>
                        {m.fatReductionPercent !== undefined && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded text-[9px] font-bold">
                            {m.fatReductionPercent >= 0 ? `-${m.fatReductionPercent}%` : `+${Math.abs(m.fatReductionPercent)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {m.fiberPeakRise !== undefined && (
                    <div className="flex items-center justify-between p-1.5 rounded bg-zinc-900">
                      <span className="text-zinc-400">With Fiber:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-400">+{m.fiberPeakRise} mg/dL</strong>
                        {m.fiberReductionPercent !== undefined && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded text-[9px] font-bold">
                            {m.fiberReductionPercent >= 0 ? `-${m.fiberReductionPercent}%` : `+${Math.abs(m.fiberReductionPercent)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {m.proteinPeakRise !== undefined && (
                    <div className="flex items-center justify-between p-1.5 rounded bg-zinc-900">
                      <span className="text-zinc-400">With Protein:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-indigo-400">+{m.proteinPeakRise} mg/dL</strong>
                        {m.proteinReductionPercent !== undefined && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded text-[9px] font-bold">
                            {m.proteinReductionPercent >= 0 ? `-${m.proteinReductionPercent}%` : `+${Math.abs(m.proteinReductionPercent)}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Glycemic iAUC Cohort Comparison (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <BarChart2 size={16} className="text-cyan-400" /> Cohort iAUC Glycemic Burden
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Incremental AUC</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={iAUCDistribution.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#52525b" fontSize={10} unit=" mg·min" />
                <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={9} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Bar dataKey="iAUC" name="Incremental AUC" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                  {iAUCDistribution.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.mitigator === "Fiber"
                          ? "#10b981"
                          : entry.mitigator === "Fat"
                          ? "#f59e0b"
                          : entry.mitigator === "Protein"
                          ? "#8b5cf6"
                          : "#f43f5e"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex justify-between items-center text-xs font-mono text-zinc-400">
            <span>Color Legend:</span>
            <div className="flex gap-2 text-[10px]">
              <span className="text-rose-400 font-bold">Pure</span>
              <span className="text-amber-400 font-bold">Fat</span>
              <span className="text-emerald-400 font-bold">Fiber</span>
              <span className="text-purple-400 font-bold">Protein</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

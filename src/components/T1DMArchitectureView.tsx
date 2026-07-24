import React, { useState } from "react";
import {
  Activity,
  Layers,
  BarChart2,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Clock,
  Zap,
  Filter,
  Users,
  Smartphone,
  ChevronRight,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HeartPulse,
  Flame,
  Award
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
  Area
} from "recharts";
import {
  T1DMNutritionVitals,
  PredictionHorizon,
  calculateT1DMForecast,
  T1DM_PRESET_PROFILES,
  FEDERATED_LEARNING_ROUNDS,
  SHAP_FEATURE_SELECTION_COMPARISON
} from "../ml/t1dmDataset";
import { getAllAvailablePatientProfiles } from "../ml/experimentalDataset";

export const T1DMArchitectureView: React.FC = () => {
  const allProfiles = getAllAvailablePatientProfiles();
  const [activeProfile, setActiveProfile] = useState(allProfiles[0]);
  const [selectedHorizon, setSelectedHorizon] = useState<PredictionHorizon>(60);
  const [activeSection, setActiveSection] = useState<"architecture" | "limitations">("architecture");

  // Federated learning simulation round state
  const [currentFedRound, setCurrentFedRound] = useState<number>(10);
  
  // Feature selection pruning filter state
  const [showPrunedOnly, setShowPrunedOnly] = useState<boolean>(false);

  // Calculate live forecast for active profile and selected horizon
  const forecast = calculateT1DMForecast(activeProfile.vitals, selectedHorizon);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight">
              T1DM Nutrition-Aware Blood Glucose Forecasting Architecture
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              AI4PG Dataset • Medtronic MiniMed 670G • 1,036 Meals • Kernel SHAP & FFNN Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveSection("architecture")}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSection === "architecture"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu size={14} /> 1. Framework & Architecture
          </button>
          <button
            onClick={() => setActiveSection("limitations")}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSection === "limitations"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck size={14} /> 2. Limitations & Overcome Roadmap
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === "architecture" ? (
          <motion.div
            key="architecture-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header / Subtitle */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  Research Specification
                </span>
                <h3 className="text-xl font-serif text-zinc-100 font-bold mt-2">
                  Nutrition-Aware Blood Glucose Forecasting for T1DM
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  From raw preprandial sensor data and meal macro-nutrition to explainable multi-horizon deep neural network predictions.
                </p>
              </div>

              {/* Patient Preset & Real Trial Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider flex items-center gap-1">
                  <Users size={12} /> Patient Record:
                </span>
                <select
                  value={activeProfile.id}
                  onChange={(e) => {
                    const p = allProfiles.find((x) => x.id === e.target.value);
                    if (p) setActiveProfile(p);
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-emerald-400 text-xs font-bold rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-mono uppercase cursor-pointer max-w-[340px] truncate"
                >
                  <optgroup label="Clinical Preset Cohorts">
                    {T1DM_PRESET_PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Experimental CGM Patient Trials">
                    {allProfiles.filter((p) => p.id.startsWith("cgm-")).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* 3-Pillar Architecture Visualizer Grid matching Slide 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PILLAR 1: INPUT FEATURES (4 cols) */}
              <div className="lg:col-span-4 bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono font-black uppercase text-xs tracking-wider">
                    <Activity size={16} /> INPUT FEATURES
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Stage 1</span>
                </div>

                {/* Sub-card 1: Glycemic History */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Glycemic History</h4>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
                      30-min Window
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    8 statistical descriptors from 30-min preprandial window:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Mean: <strong className="text-emerald-400">{activeProfile.vitals.preprandialMean}</strong> mg/dL</div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Std: <strong className="text-emerald-400">{activeProfile.vitals.preprandialStd}</strong></div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">PTP Spread: <strong className="text-emerald-400">{activeProfile.vitals.preprandialPTP}</strong></div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Skewness: <strong className="text-emerald-400">{activeProfile.vitals.preprandialSkewness}</strong></div>
                  </div>
                </div>

                {/* Sub-card 2: Insulin Data */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Insulin Data</h4>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      Closed-Loop System
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Manual mealtime bolus + 3-hour cumulative microbolus history from MiniMed 670G:
                  </p>
                  <div className="flex gap-2 text-[10px] font-mono">
                    <div className="flex-1 bg-zinc-900/80 p-2 rounded text-zinc-300">
                      Meal Bolus: <strong className="text-amber-400">{activeProfile.vitals.manualBolus} U</strong>
                    </div>
                    <div className="flex-1 bg-zinc-900/80 p-2 rounded text-zinc-300">
                      3h Microbolus: <strong className="text-amber-400">{activeProfile.vitals.microbolus3h} U</strong>
                    </div>
                  </div>
                </div>

                {/* Sub-card 3: Meal Nutrition */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Meal Nutrition</h4>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                      7-day Food Record
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Carbs: <strong className="text-emerald-400">{activeProfile.vitals.carbs}g</strong></div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">GI Score: <strong className="text-emerald-400">{activeProfile.vitals.glycemicIndex}</strong></div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Lipids: <strong className="text-emerald-400">{activeProfile.vitals.lipids}g</strong></div>
                    <div className="bg-zinc-900/80 p-1.5 rounded text-zinc-300">Fibers: <strong className="text-emerald-400">{activeProfile.vitals.fibers}g</strong></div>
                  </div>
                </div>
              </div>

              {/* PILLAR 2: FFNN MODEL & HORIZON PREDICTION (4 cols) */}
              <div className="lg:col-span-4 bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-black uppercase text-xs tracking-wider">
                    <Cpu size={16} /> FFNN DEEP NEURAL NETWORK
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Stage 2</span>
                </div>

                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
                  <ul className="space-y-1.5 list-disc pl-4 text-zinc-300">
                    <li><strong>1–3 hidden layers</strong>, grid-search tuned (units, weight decay, learning rate)</li>
                    <li>Trained separately per prediction horizon</li>
                    <li>Validated with <strong>Leave-One-Subject-Out CV</strong> (n = 15 patients)</li>
                  </ul>
                </div>

                {/* Horizon Switcher */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider block text-center">
                    Three Prediction Horizons:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {([15, 60, 120] as PredictionHorizon[]).map((h) => (
                      <button
                        key={h}
                        onClick={() => setSelectedHorizon(h)}
                        className={`py-2.5 rounded border text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                          selectedHorizon === h
                            ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {h} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forecast Outcome Badge */}
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800 text-center space-y-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest block">
                    Predicted BG at t+{selectedHorizon}m
                  </span>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-3xl font-black text-zinc-100 font-mono">
                      {forecast.predictedGlucose}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">mg/dL</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      forecast.delta >= 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {forecast.delta >= 0 ? `+${forecast.delta}` : forecast.delta} mg/dL
                    </span>
                  </div>
                  <span className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                    forecast.riskCategory.includes("Hypo")
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : forecast.riskCategory.includes("Hyper")
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}>
                    {forecast.riskCategory}
                  </span>
                </div>

                {/* 120-min Continuous Trajectory Curve */}
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider block mb-2">
                    Postprandial Glucose Curve (120m)
                  </span>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast.trajectory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="timeMin" stroke="#3f3f46" fontSize={9} unit="m" />
                        <YAxis domain={[40, 260]} stroke="#3f3f46" fontSize={9} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs font-mono text-zinc-100">
                                  <p>t+{d.timeMin} min: <strong className="text-emerald-400">{d.bg} mg/dL</strong></p>
                                  <p className="text-[9px] text-zinc-500">Range: {d.lowerCI}–{d.upperCI} mg/dL</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area type="monotone" dataKey="bg" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* PILLAR 3: SHAP EXPLAINABILITY (4 cols) */}
              <div className="lg:col-span-4 bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-mono font-black uppercase text-xs tracking-wider">
                    <GitBranch size={16} /> SHAP EXPLAINABILITY
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Stage 3</span>
                </div>

                {/* Sub-card 1: Kernel SHAP */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Kernel SHAP</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Model-agnostic Shapley values computed per input feature for the active <strong>{selectedHorizon}-min horizon</strong>:
                  </p>
                </div>

                {/* Live Ranked SHAP Feature Importance Bar Chart */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
                    Feature Impact Ranking ({selectedHorizon}m Horizon)
                  </span>
                  <div className="space-y-2">
                    {forecast.featureRankings.slice(0, 6).map((item) => (
                      <div key={item.feature} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-300 font-bold">{item.feature}</span>
                          <span className={item.shap >= 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                            {item.shap >= 0 ? `+${item.shap}` : item.shap} mg/dL
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.shap >= 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, Math.abs(item.shap) * 3.5)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Plots & Directional Interplay */}
                <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-1.5 text-[11px]">
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Summary Plots & Correlations</h4>
                  <p className="text-zinc-400 leading-relaxed">
                    Beeswarm plots & Shapley correlation matrices reveal directional effects and feature interplay (e.g. GI × Insulin interaction).
                  </p>
                </div>
              </div>

            </div>

            {/* Dataset Footer Info */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center text-xs text-zinc-500 font-mono">
              Data source: <strong>AI4PG dataset</strong> — 25 T1DM patients on Medtronic MiniMed 670G, 1,264 meals, 7-day food records (15-patient / 1,036-meal subset used for modeling).
            </div>
          </motion.div>
        ) : (
          /* SECTION 2: LIMITATIONS & OVERCOME METHODS matching Slide 2 */
          <motion.div
            key="limitations-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                Methodology Expansion
              </span>
              <h3 className="text-xl font-serif text-zinc-100 font-bold mt-2">
                Limitations & Overcome Methods
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Where the current study falls short, and concrete next steps to address each gap in deployment.
              </p>
            </div>

            {/* 3 Gap-To-Solution Pairings Grid matching Slide 2 */}
            <div className="space-y-6">
              
              {/* GAP 1: Small Single-Center Cohort -> Multi-Center & Federated Learning */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Limitation Card */}
                <div className="lg:col-span-5 bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      LIMITATION 01
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3">
                      Small, single-center cohort
                    </h4>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Only 15–25 patients from one hospital limits generalizability across diverse demographics, dietary patterns, and closed-loop pump algorithms.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-500/20 text-[10px] font-mono text-rose-300/80 flex items-center gap-2">
                    <ArrowRight size={14} className="text-rose-400" /> Vulnerable to overfitting single-clinic lifestyle biometrics
                  </div>
                </div>

                {/* Overcome Method Card */}
                <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      OVERCOME METHOD
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3 flex items-center gap-2">
                      <Users size={18} className="text-emerald-400" /> Multi-center & federated learning
                    </h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Pool data across hospitals (or train federated models) to grow sample diversity without centralizing sensitive patient records.
                    </p>
                  </div>

                  {/* Interactive Federated Learning Round Simulator */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-300 font-bold uppercase">Federated Aggregation Simulator (3 Hospital Nodes)</span>
                      <span className="text-emerald-400 font-bold">Round {currentFedRound}/10</span>
                    </div>

                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={FEDERATED_LEARNING_ROUNDS.slice(0, currentFedRound)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                          <XAxis dataKey="round" stroke="#3f3f46" fontSize={10} unit="r" />
                          <YAxis domain={[0, 1.0]} stroke="#3f3f46" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", fontSize: "11px", color: "#f4f4f5" }} />
                          <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace" }} />
                          <Line type="monotone" dataKey="nodeA_loss" name="Hospital A Loss" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="nodeB_loss" name="Hospital B Loss" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="nodeC_loss" name="Hospital C Loss" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="global_loss" name="Global FedAvg Loss" stroke="#10b981" strokeWidth={2.5} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[10px] font-mono">
                      <button
                        onClick={() => setCurrentFedRound((r) => (r >= 10 ? 1 : r + 1))}
                        className="px-3 py-1 bg-emerald-500 text-zinc-950 font-bold rounded hover:bg-emerald-400 transition-colors cursor-pointer"
                      >
                        Step Next Round (+1)
                      </button>
                      <span className="text-zinc-400">
                        Global Model Validation Accuracy: <strong className="text-emerald-400">{FEDERATED_LEARNING_ROUNDS[currentFedRound - 1].valAccuracy}%</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GAP 2: No Feature Selection -> SHAP-Driven Feature Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Limitation Card */}
                <div className="lg:col-span-5 bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      LIMITATION 02
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3">
                      No feature selection
                    </h4>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      All features kept for pure XAI exploration, leaving the model less optimized, higher latency on wearable edge hardware, and susceptible to noisy inputs.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-500/20 text-[10px] font-mono text-rose-300/80 flex items-center gap-2">
                    <ArrowRight size={14} className="text-rose-400" /> High computational load on mobile/pump microcontrollers
                  </div>
                </div>

                {/* Overcome Method Card */}
                <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      OVERCOME METHOD
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3 flex items-center gap-2">
                      <Filter size={18} className="text-emerald-400" /> SHAP-driven feature selection
                    </h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Use the computed Shapley importances as a principled second-stage filter for a leaner, deployable model on edge insulin pumps.
                    </p>
                  </div>

                  {/* Interactive Feature Selection Pruning Visualizer */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-300 font-bold uppercase">SHAP Importance Filter (17 → 10 Features)</span>
                      <button
                        onClick={() => setShowPrunedOnly(!showPrunedOnly)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold border transition-colors cursor-pointer ${
                          showPrunedOnly
                            ? "bg-emerald-500 text-zinc-950 border-emerald-400"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800"
                        }`}
                      >
                        {showPrunedOnly ? "Showing: Retained Only (10)" : "Showing: All 17 Features"}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {SHAP_FEATURE_SELECTION_COMPARISON.filter((f) => !showPrunedOnly || f.retainedInStage2).map((item) => (
                        <div key={item.feature} className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            {item.retainedInStage2 ? (
                              <CheckCircle2 size={13} className="text-emerald-400" />
                            ) : (
                              <span className="text-rose-500 font-bold">✕</span>
                            )}
                            <span className={item.retainedInStage2 ? "text-zinc-200 font-bold" : "text-zinc-500 line-through"}>
                              {item.feature}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-400">SHAP: {item.shapImportance}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              item.retainedInStage2 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {item.retainedInStage2 ? "Retained" : "Pruned"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                      <span>Model Compression: <strong>41.2% Reduction</strong></span>
                      <span>Accuracy Retained: <strong>98.4%</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GAP 3: Short Horizon & Narrow Scope -> Longer Sequences + Wearables */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Limitation Card */}
                <div className="lg:col-span-5 bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                      LIMITATION 03
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3">
                      Short horizon & narrow scope
                    </h4>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Capped at 120 min, missing late nocturnal glycemic events and delayed meal absorption; excludes physical activity, heart rate, and stress metrics.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-500/20 text-[10px] font-mono text-rose-300/80 flex items-center gap-2">
                    <ArrowRight size={14} className="text-rose-400" /> Cannot capture exercise-induced late hypoglycemia
                  </div>
                </div>

                {/* Overcome Method Card */}
                <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      OVERCOME METHOD
                    </span>
                    <h4 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-3 flex items-center gap-2">
                      <Smartphone size={18} className="text-emerald-400" /> Longer sequences + wearables
                    </h4>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Extend to 4–6h with LSTM/GRU architectures; add accelerometer / heart-rate / EDA sensors for activity and stress tracking.
                    </p>
                  </div>

                  {/* Multi-Hour Wearable Sensor Telemetry Mockup */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
                    <span className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                      LSTM/GRU Multi-Hour Telemetry Streams (4–6 Hour Horizon)
                    </span>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                      <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800 space-y-1">
                        <HeartPulse size={16} className="mx-auto text-rose-400" />
                        <span className="text-zinc-400 block uppercase">Heart Rate</span>
                        <strong className="text-zinc-100 block text-xs">84 BPM</strong>
                        <span className="text-[9px] text-zinc-500">Cardio Stress Factor</span>
                      </div>
                      <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800 space-y-1">
                        <Zap size={16} className="mx-auto text-amber-400" />
                        <span className="text-zinc-400 block uppercase">Accelerometer</span>
                        <strong className="text-zinc-100 block text-xs">1,420 Steps/h</strong>
                        <span className="text-[9px] text-zinc-500">Exercise Burn Rate</span>
                      </div>
                      <div className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800 space-y-1">
                        <Flame size={16} className="mx-auto text-cyan-400" />
                        <span className="text-zinc-400 block uppercase">EDA (Sweat/Stress)</span>
                        <strong className="text-zinc-100 block text-xs">4.2 μS</strong>
                        <span className="text-[9px] text-zinc-500">Cortisol Proxy</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

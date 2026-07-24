import React, { useState } from "react";
import {
  Utensils,
  TrendingUp,
  Activity,
  BarChart2,
  Clock,
  Filter,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  Wheat,
  Scale
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
  Cell
} from "recharts";
import {
  processExperimentalDataset,
  calculateMitigatorEfficacy,
  MealTrialSummary
} from "../ml/experimentalDataset";

export const MealDatasetExplorer: React.FC = () => {
  const allSummaries = processExperimentalDataset();
  const mitigatorEfficacy = calculateMitigatorEfficacy();

  // Selected filters
  const [selectedFood, setSelectedFood] = useState<string>("Bread");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  // Get unique foods & subjects
  const foodOptions = Array.from(new Set(allSummaries.map((s) => s.food)));
  const subjectOptions = Array.from(new Set(allSummaries.map((s) => s.subject)));

  // Filter summaries based on selections
  const filteredSummaries = allSummaries.filter(
    (s) => s.food === selectedFood && (selectedSubject === "ALL" || s.subject === selectedSubject)
  );

  // Build merged Recharts multi-line timeline (-25m to +170m)
  const timePoints = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170];
  
  const lineChartData = timePoints.map((t) => {
    const row: Record<string, number> = { timeMin: t };
    filteredSummaries.forEach((s) => {
      const pt = s.curve.find((c) => c.min === t);
      if (pt) {
        row[s.id] = pt.glucose;
      }
    });
    return row;
  });

  // Dynamic color palette per trial
  const trialColors = [
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Purple
    "#06b6d4"  // Cyan
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Utensils size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tight">
              Experimental Postprandial Glycemic Response Dataset
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous 195-min CGM trials (-25m preprandial to +170m postprandial) • Fiber, Fat & Protein Mitigator Kinetics
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
          {/* Food Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 uppercase">Food:</span>
            <select
              value={selectedFood}
              onChange={(e) => setSelectedFood(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500 font-mono uppercase cursor-pointer"
            >
              {foodOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 uppercase">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500 font-mono uppercase cursor-pointer"
            >
              <option value="ALL">All Subjects ({subjectOptions.length})</option>
              {subjectOptions.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart + Trial Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Continuous Glucose Curve Chart (8 cols) */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Activity size={16} className="text-emerald-400" />
              Continuous CGM Curves for <strong>{selectedFood}</strong> ({filteredSummaries.length} Trial Run{filteredSummaries.length > 1 ? "s" : ""})
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              t = -25m to +170m
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <XAxis dataKey="timeMin" stroke="#52525b" fontSize={10} unit="m" />
                <YAxis domain={[50, "auto"]} stroke="#52525b" fontSize={10} unit=" mg/dL" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "11px", fontFamily: "monospace" }}
                  itemStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "10px" }} />

                {filteredSummaries.map((s, idx) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    name={`${s.subject} (${s.foodsLabel})`}
                    stroke={trialColors[idx % trialColors.length]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center font-mono text-xs">
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">Average Baseline</span>
              <strong className="text-zinc-200 text-sm">
                {Math.round(filteredSummaries.reduce((acc, s) => acc + s.baseline, 0) / (filteredSummaries.length || 1))} mg/dL
              </strong>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">Max Peak Glucose</span>
              <strong className="text-rose-400 text-sm">
                {Math.max(...filteredSummaries.map((s) => s.peakGlucose), 0)} mg/dL
              </strong>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">Avg Time-To-Peak</span>
              <strong className="text-amber-400 text-sm">
                {Math.round(filteredSummaries.reduce((acc, s) => acc + s.timeToPeak, 0) / (filteredSummaries.length || 1))} min
              </strong>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
              <span className="text-[9px] text-zinc-500 uppercase block">Avg iAUC</span>
              <strong className="text-emerald-400 text-sm">
                {Math.round(filteredSummaries.reduce((acc, s) => acc + s.iAUC, 0) / (filteredSummaries.length || 1))} mg·min/dL
              </strong>
            </div>
          </div>
        </div>

        {/* Right: Trial Details & Glycemic Metrics (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              <Scale size={16} className="text-cyan-400" /> Meal Run Metrics
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">iAUC & Peak Analysis</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {filteredSummaries.map((s, idx) => (
              <div key={s.id} className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: trialColors[idx % trialColors.length] }}
                    />
                    {s.subject} • {s.foodsLabel}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">Rep #{s.rep}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-zinc-900/80 p-2 rounded">
                    Baseline: <strong className="text-zinc-200">{s.baseline}</strong> mg/dL
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded">
                    Peak BG: <strong className="text-rose-400">{s.peakGlucose}</strong> mg/dL
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded">
                    Rise Δ: <strong className="text-amber-400">+{s.peakRise}</strong> mg/dL
                  </div>
                  <div className="bg-zinc-900/80 p-2 rounded">
                    Peak Time: <strong className="text-emerald-400">t+{s.timeToPeak}m</strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1 text-zinc-400">
                  <span>Mitigator: <strong className="text-emerald-400">{s.mitigator}</strong></span>
                  <span>iAUC: <strong className="text-zinc-200">{s.iAUC}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] font-mono text-emerald-400">
            💡 <strong>Glycemic Insight:</strong> Pure simple carbohydrates induce rapid early glucose spikes (Peak Time 40-60m), whereas adding Fat/Protein delays gastric emptying and flattens the trajectory curve.
          </div>
        </div>
      </div>

      {/* Dietary Mitigator Efficacy Matrix (Fiber vs Fat vs Protein Comparison) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              Clinical Mitigator Analysis
            </span>
            <h3 className="text-base font-bold text-zinc-100 uppercase tracking-tight mt-2 flex items-center gap-2">
              <Wheat size={18} className="text-emerald-400" /> Impact of Dietary Fiber, Fat, & Protein on Glucose Spike Dampening
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitigatorEfficacy.map((m) => (
            <div key={m.food} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-sm font-black text-zinc-100 uppercase">{m.food}</span>
                <span className="text-xs text-amber-400 font-bold">Pure Rise: +{m.purePeakRise} mg/dL</span>
              </div>

              <div className="space-y-2 text-xs">
                {m.fatPeakRise !== undefined && (
                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-300">With Fat:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-amber-400">+{m.fatPeakRise} mg/dL</strong>
                      {m.fatReductionPercent !== undefined && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {m.fatReductionPercent >= 0 ? `-${m.fatReductionPercent}%` : `+${Math.abs(m.fatReductionPercent)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {m.fiberPeakRise !== undefined && (
                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-300">With Fiber:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-400">+{m.fiberPeakRise} mg/dL</strong>
                      {m.fiberReductionPercent !== undefined && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {m.fiberReductionPercent >= 0 ? `-${m.fiberReductionPercent}%` : `+${Math.abs(m.fiberReductionPercent)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {m.proteinPeakRise !== undefined && (
                  <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
                    <span className="text-zinc-300">With Protein:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-indigo-400">+{m.proteinPeakRise} mg/dL</strong>
                      {m.proteinReductionPercent !== undefined && (
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
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
    </div>
  );
};

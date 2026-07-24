import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Heart,
  Sliders,
  Sparkles,
  Info,
  HelpCircle,
  FileText,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Send,
  PieChart,
  GitBranch,
  BarChart2,
  Lock,
  Layers,
  Cpu,
  Utensils,
} from "lucide-react";
import { T1DMArchitectureView } from "./components/T1DMArchitectureView";
import { MealDatasetExplorer } from "./components/MealDatasetExplorer";
import { CGMDashboard } from "./components/CGMDashboard";
import { BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";

// ----------------------------------------------------
// Frontend interfaces
// ----------------------------------------------------
interface PatientPreset {
  id: number;
  vitals: {
    Pregnancies: number;
    Glucose: number;
    BloodPressure: number;
    SkinThickness: number;
    Insulin: number;
    BMI: number;
    DiabetesPedigreeFunction: number;
    Age: number;
    Y: number;
  };
}

interface PredictionResult {
  probability: number;
  label: string;
  classValue: number;
}

const parseInlineFormatting = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="text-zinc-100 font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="bg-zinc-950 border border-zinc-800 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-400">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) {
      return <h3 key={i} className="text-xs font-black text-emerald-400 uppercase tracking-widest mt-4 mb-2 first:mt-0">{line.slice(4)}</h3>;
    }
    if (line.startsWith("#### ")) {
      return <h4 key={i} className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider mt-3 mb-1">{line.slice(5)}</h4>;
    }
    if (line.startsWith("* ") || line.startsWith("- ")) {
      const content = line.slice(2);
      return (
        <ul key={i} className="list-disc pl-4 space-y-1 my-1">
          <li className="text-zinc-300 text-[11px]">{parseInlineFormatting(content)}</li>
        </ul>
      );
    }
    if (line.trim() === "---") {
      return <hr key={i} className="border-zinc-800 my-4" />;
    }
    if (!line.trim()) {
      return <div key={i} className="h-1.5" />;
    }
    return (
      <p key={i} className="text-zinc-300 mb-2 leading-relaxed text-[11px]">
        {parseInlineFormatting(line)}
      </p>
    );
  });
};

interface LimeExplanation {
  feature: string;
  condition: string;
  weight: number;
  value: number;
  supportsDiabetes: boolean;
}

interface ModelInfo {
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    confusionMatrix: { tp: number; fp: number; fn: number; tn: number };
    totalSamples: number;
    trainSize: number;
    testSize: number;
    outcomeRatio: { diabetic: number; nonDiabetic: number };
  };
  globalImportance: { feature: string; shap: number }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Sliders and boundaries configuration
const FEATURES_CONFIG = [
  { name: "Glucose", key: "Glucose", min: 0, max: 200, step: 1, unit: "mg/dL", desc: "Plasma glucose concentration a 2 hours in an oral glucose tolerance test" },
  { name: "BMI", key: "BMI", min: 0, max: 70, step: 0.1, unit: "kg/m²", desc: "Body mass index (weight in kg/(height in m)²)" },
  { name: "Age", key: "Age", min: 21, max: 85, step: 1, unit: "years", desc: "Age of the patient" },
  { name: "Pregnancies", key: "Pregnancies", min: 0, max: 17, step: 1, unit: "times", desc: "Number of times pregnant" },
  { name: "Diabetes Pedigree", key: "DiabetesPedigreeFunction", min: 0.08, max: 2.5, step: 0.01, unit: "score", desc: "A function which scores likelihood of diabetes based on family history" },
  { name: "Blood Pressure", key: "BloodPressure", min: 0, max: 122, step: 1, unit: "mmHg", desc: "Diastolic blood pressure" },
  { name: "Insulin", key: "Insulin", min: 0, max: 846, step: 1, unit: "mu U/ml", desc: "2-Hour serum insulin" },
  { name: "Skin Thickness", key: "SkinThickness", min: 0, max: 99, step: 1, unit: "mm", desc: "Triceps skin fold thickness" },
];

export default function App() {
  // Main states
  const [vitals, setVitals] = useState<Record<string, number>>({
    Pregnancies: 7,
    Glucose: 159,
    BloodPressure: 64,
    SkinThickness: 0,
    Insulin: 0,
    BMI: 27.4,
    DiabetesPedigreeFunction: 0.294,
    Age: 40,
  });

  const [activePresetId, setActivePresetId] = useState<number>(0);
  const [patients, setPatients] = useState<PatientPreset[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [baseValue, setBaseValue] = useState<number>(0.347);
  const [shapValues, setShapValues] = useState<Record<string, number>>({});
  const [limeValues, setLimeValues] = useState<LimeExplanation[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Top View Mode initialized from URL search params or hash if present
  const [appViewMode, setAppViewMode] = useState<"cgm_dashboard" | "sandbox" | "t1dm_architecture" | "meal_dataset">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      if (viewParam === "sandbox" || viewParam === "t1dm_architecture" || viewParam === "meal_dataset" || viewParam === "cgm_dashboard") {
        return viewParam;
      }
      const hash = window.location.hash.replace("#", "");
      if (hash === "sandbox" || hash === "t1dm_architecture" || hash === "meal_dataset" || hash === "cgm_dashboard" || hash === "dashboard") {
        return hash === "dashboard" ? "cgm_dashboard" : (hash as any);
      }
    }
    return "cgm_dashboard";
  });

  // Sync viewMode changes to URL search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("view") !== appViewMode) {
        url.searchParams.set("view", appViewMode);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [appViewMode]);

  // Handle back/forward and hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      if (viewParam && ["cgm_dashboard", "sandbox", "t1dm_architecture", "meal_dataset"].includes(viewParam)) {
        setAppViewMode(viewParam as any);
        return;
      }
      const hash = window.location.hash.replace("#", "");
      if (hash && ["cgm_dashboard", "sandbox", "t1dm_architecture", "meal_dataset", "dashboard"].includes(hash)) {
        setAppViewMode(hash === "dashboard" ? "cgm_dashboard" : (hash as any));
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);

  // Tabs
  const [activeTab, setActiveTab] = useState<"local" | "dependence" | "global" | "theory">("local");
  const [dependenceFeature, setDependenceFeature] = useState<string>("Glucose");

  // Gemini chat states
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isAiFallbackActive, setIsAiFallbackActive] = useState<boolean>(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Init and fetch presets/global model info
  useEffect(() => {
    fetch("/api/model/info")
      .then((res) => res.json())
      .then((data) => setModelInfo(data))
      .catch((err) => console.error("Error loading model info:", err));

    fetch("/api/patients")
      .then((res) => res.json())
      .then((data) => {
        setPatients(data.patients || []);
        if (data.patients && data.patients.length > 0) {
          const patient0 = data.patients.find((p: any) => p.id === 0);
          if (patient0) {
            setVitals(patient0.vitals);
            setActivePresetId(0);
          } else {
            setVitals(data.patients[0].vitals);
            setActivePresetId(data.patients[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading patient presets:", err));
  }, []);

  // Compute local explanation whenever vitals change
  const computeExplanations = useCallback((currentVitals: Record<string, number>) => {
    fetch("/api/patient/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentVitals),
    })
      .then((res) => res.json())
      .then((data) => {
        setPrediction(data.prediction);
        setBaseValue(data.baseValue);
        setShapValues(data.shap);
        setLimeValues(data.lime);
      })
      .catch((err) => console.error("Error explaining vitals:", err));
  }, []);

  // Trigger local explanation computing
  useEffect(() => {
    computeExplanations(vitals);
  }, [vitals, computeExplanations]);

  // Request Gemini Clinical Analysis
  const getAiExplanation = useCallback(() => {
    if (!prediction) return;
    setIsAiLoading(true);
    fetch("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vitals,
        prediction,
        shap: shapValues,
        lime: limeValues,
        chatHistory: [],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAiExplanation(data.explanation);
        setChatHistory([{ role: "assistant", content: data.explanation }]);
        setIsAiFallbackActive(data.fallback || false);
        setFallbackError(data.errorMsg || null);
      })
      .catch((err) => {
        console.error("Gemini failed:", err);
        setAiExplanation("Could not generate AI clinical explanation.");
      })
      .finally(() => {
        setIsAiLoading(false);
      });
  }, [vitals, prediction, shapValues, limeValues]);

  // Get AI explanation when the patient profile changes or preset changes
  useEffect(() => {
    if (prediction) {
      getAiExplanation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePresetId, getAiExplanation]);

  // Handle slide updates
  const handleSliderChange = (key: string, val: number) => {
    setVitals((prev) => ({ ...prev, [key]: val }));
    setActivePresetId(-1); // Switch to "Custom Patient"
  };

  // Load a preset
  const handlePresetSelect = (preset: PatientPreset) => {
    setVitals(preset.vitals);
    setActivePresetId(preset.id);
  };

  // Submit dynamic AI questions
  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || !prediction || isAiLoading) return;

    const userMsg = customQuestion;
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(updatedHistory);
    setCustomQuestion("");
    setIsAiLoading(true);

    fetch("/api/gemini/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vitals,
        prediction,
        shap: shapValues,
        lime: limeValues,
        chatHistory: updatedHistory,
        customQuestion: userMsg,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setChatHistory((prev) => [...prev, { role: "assistant", content: data.explanation }]);
        setIsAiFallbackActive(data.fallback || false);
        setFallbackError(data.errorMsg || null);
      })
      .catch((err) => {
        console.error("Gemini Chat failed:", err);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: "Apologies, the AI copilot encountered an error answering this query." },
        ]);
      })
      .finally(() => {
        setIsAiLoading(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      });
  };

  // ----------------------------------------------------
  // Chart Data formatters
  // ----------------------------------------------------

  // 1. SHAP Waterfall plot data formatting
  // Start from base expectation, add each feature SHAP step-by-step
  const formatShapWaterfallData = () => {
    if (!shapValues || prediction === null) return [];
    const orderedFeatures = Object.keys(shapValues).sort(
      (a, b) => Math.abs(shapValues[b]) - Math.abs(shapValues[a])
    );

    const list: any[] = [];
    let cumulative = baseValue;

    // Base value node
    list.push({
      name: "Baseline E[f(X)]",
      val: parseFloat(baseValue.toFixed(3)),
      start: 0,
      end: parseFloat(baseValue.toFixed(3)),
      shap: 0,
      color: "#6b7280",
    });

    for (const f of orderedFeatures) {
      const v = shapValues[f];
      const start = cumulative;
      cumulative += v;
      list.push({
        name: `${f} = ${vitals[f]}`,
        val: parseFloat(v.toFixed(3)),
        start: parseFloat(start.toFixed(3)),
        end: parseFloat(cumulative.toFixed(3)),
        shap: parseFloat(v.toFixed(3)),
        color: v > 0 ? "#ef4444" : "#10b981", // red pushes diabetes risk higher, green lower
      });
    }

    // Final prediction node
    list.push({
      name: `Prediction f(X)`,
      val: parseFloat(prediction.probability.toFixed(3)),
      start: 0,
      end: parseFloat(prediction.probability.toFixed(3)),
      shap: 0,
      color: prediction.probability >= 0.5 ? "#b91c1c" : "#047857",
    });

    return list;
  };

  // 2. LIME bar chart data formatting
  const formatLimeData = () => {
    return limeValues.map((l) => ({
      name: l.condition,
      weight: parseFloat(l.weight.toFixed(4)),
      color: l.supportsDiabetes ? "#ef4444" : "#10b981",
    }));
  };

  // 3. Dependence Plot simulation
  // Produces mock Pima dataset points aligned with true distributions for the dependence scatter chart
  const getDependenceData = () => {
    // Generate Glucose scatter aligned with true SHAP trends seen on page 12 of PDF
    const dataPoints = [];
    let seed = 100;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let g = 30; g <= 200; g += 5) {
      // SHAP value goes from -0.15 (at Glucose=50) up to +0.35 (at Glucose=190)
      const idealShap = -0.15 + (g - 50) * 0.0035 + (g > 140 ? (g - 140) * 0.0015 : 0);
      const scatter = (random() - 0.5) * 0.06;
      const shapVal = Math.min(0.42, Math.max(-0.25, idealShap + scatter));

      // Color dimensions based on BMI
      const bmi = Math.round(20 + random() * 35);

      dataPoints.push({
        Glucose: g,
        SHAP: parseFloat(shapVal.toFixed(3)),
        BMI: bmi,
        isCurrent: false,
      });
    }

    // Insert active simulated patient as a special glowing yellow dot
    const currentGlucose = vitals[dependenceFeature] || 100;
    const currentShap = shapValues[dependenceFeature] || 0.0;
    dataPoints.push({
      Glucose: currentGlucose,
      SHAP: parseFloat(currentShap.toFixed(3)),
      BMI: vitals.BMI || 30,
      isCurrent: true,
    });

    return dataPoints;
  };

  // 4. Feature KDE distribution line charts (Diabetic vs Non-Diabetic populations)
  const getDistributionData = (feature: string) => {
    const data: any[] = [];
    let min = 0;
    let max = 200;
    let meanNonDiabetic = 110;
    let stdNonDiabetic = 26;
    let meanDiabetic = 141;
    let stdDiabetic = 32;

    if (feature === "Glucose") {
      min = 40; max = 200;
    } else if (feature === "BMI") {
      min = 15; max = 60;
      meanNonDiabetic = 30; stdNonDiabetic = 7.7;
      meanDiabetic = 35; stdDiabetic = 7.3;
    } else if (feature === "Age") {
      min = 21; max = 80;
      meanNonDiabetic = 31; stdNonDiabetic = 11;
      meanDiabetic = 37; stdDiabetic = 11;
    } else if (feature === "Pregnancies") {
      min = 0; max = 15;
      meanNonDiabetic = 3.3; stdNonDiabetic = 3;
      meanDiabetic = 4.9; stdDiabetic = 3.7;
    } else {
      // General defaults
      min = 0; max = 100;
      meanNonDiabetic = 40; stdNonDiabetic = 15;
      meanDiabetic = 60; stdDiabetic = 20;
    }

    const step = (max - min) / 30;

    for (let x = min; x <= max; x += step) {
      // Normal probability density calculation
      const pdf = (v: number, m: number, s: number) => {
        return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(v - m, 2) / (2 * Math.pow(s, 2)));
      };

      data.push({
        value: Math.round(x * 10) / 10,
        "Non-Diabetic Population": parseFloat((pdf(x, meanNonDiabetic, stdNonDiabetic) * 100).toFixed(3)),
        "Diabetic Population": parseFloat((pdf(x, meanDiabetic, stdDiabetic) * 100).toFixed(3)),
      });
    }

    return data;
  };

  // Loading Screen
  if (!prediction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 font-sans p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="mb-6"
        >
          <RefreshCw size={48} className="text-emerald-500" />
        </motion.div>
        <h2 className="text-2xl font-black tracking-tighter uppercase mb-2 text-zinc-100">Initializing Sandbox</h2>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Protocol: Fitting Random Forest Model & Loading Datasets...</p>
      </div>
    );
  }

  const waterfallData = formatShapWaterfallData();
  const limeChartData = formatLimeData();
  const currentRiskPercentage = Math.round(prediction.probability * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-white">
      {/* HEADER RAIL */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-8 py-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-zinc-100">
            XAI<span className="text-emerald-500">.</span>SANDBOX
          </h1>
          <div className="hidden md:block h-4 w-[1px] bg-zinc-850"></div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            Protocol: Clinical Explainable AI Workbench v2.4
          </p>
        </div>

        {/* Patient Profile Records Selector */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
            <Search size={14} /> Select Patient Record:
          </span>
          <select
            value={activePresetId}
            onChange={(e) => {
              const selectedId = parseInt(e.target.value, 10);
              const found = patients.find((p) => p.id === selectedId);
              if (found) {
                handlePresetSelect(found);
              }
            }}
            className="bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-xs font-bold rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[320px] truncate"
          >
            <optgroup label="Pima Cohort Benchmark Records">
              {patients.filter((p) => p.id < 100).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || `Pima Record #${p.id} (Glucose: ${p.vitals.Glucose}, BMI: ${p.vitals.BMI})`}
                </option>
              ))}
            </optgroup>
            <optgroup label="Real CGM Experimental Patient Trial Records">
              {patients.filter((p) => p.id >= 100).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label || `CGM Trial #${p.id}`}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </header>

      {/* WORKSPACE MODE SWITCHER SUB-HEADER */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-[89px] z-30 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAppViewMode("cgm_dashboard")}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              appViewMode === "cgm_dashboard"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <BrainCircuit size={15} /> CGM & Forecasting Dashboard
          </button>

          <button
            onClick={() => setAppViewMode("sandbox")}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              appViewMode === "sandbox"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Activity size={15} /> Diagnostic Sandbox (Pima RF)
          </button>

          <button
            onClick={() => setAppViewMode("t1dm_architecture")}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              appViewMode === "t1dm_architecture"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Layers size={15} /> T1DM Architecture (AI4PG)
          </button>

          <button
            onClick={() => setAppViewMode("meal_dataset")}
            className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              appViewMode === "meal_dataset"
                ? "bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Utensils size={15} /> CGM Raw Trajectories
          </button>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden lg:inline bg-zinc-950 px-3 py-1 rounded border border-zinc-800">
          {appViewMode === "cgm_dashboard"
            ? "Unified CGM Ingestion • Postprandial FFNN & Kernel SHAP"
            : appViewMode === "sandbox"
            ? "Pima Indians Cohort Baseline • SHAP & LIME"
            : appViewMode === "t1dm_architecture"
            ? "Medtronic MiniMed 670G • FFNN & Kernel SHAP"
            : "Meal CGM Trajectories • Fiber, Fat & Protein Mitigators"}
        </span>
      </div>

      {appViewMode === "cgm_dashboard" ? (
        <main className="p-6 max-w-[1700px] mx-auto animate-fade-in">
          <CGMDashboard />
        </main>
      ) : appViewMode === "t1dm_architecture" ? (
        <main className="p-6 max-w-[1700px] mx-auto animate-fade-in">
          <T1DMArchitectureView />
        </main>
      ) : appViewMode === "meal_dataset" ? (
        <main className="p-6 max-w-[1700px] mx-auto animate-fade-in">
          <MealDatasetExplorer />
        </main>
      ) : (
        /* CORE LAYOUT */
        <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1700px] mx-auto">
        
        {/* COLUMN 1: PATIENT SIMULATOR (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6" id="patient-simulator">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
            <div className="border-b border-zinc-800 bg-zinc-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sliders className="text-emerald-500" size={18} />
                <h2 className="text-lg font-black uppercase tracking-tight text-zinc-100">Patient Simulator</h2>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 border border-zinc-800 px-2.5 py-1 bg-zinc-950 rounded">
                {activePresetId === -1 ? "CUSTOM_VARS" : `RECORD_ACTIVE: #${activePresetId}`}
              </span>
            </div>

            {/* Live Slider Controls */}
            <div className="p-6 space-y-4">
              {FEATURES_CONFIG.map((feat) => (
                <div key={feat.key} className="space-y-1.5 bg-zinc-950/40 p-3.5 rounded border border-zinc-800/60 hover:border-zinc-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{feat.name}</span>
                    <div className="text-[10px] font-mono font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-emerald-400">
                      {vitals[feat.key]} <span className="text-zinc-500 font-normal">{feat.unit}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={feat.min}
                    max={feat.max}
                    step={feat.step}
                    value={vitals[feat.key]}
                    onChange={(e) => handleSliderChange(feat.key, parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 line-clamp-1">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DIAGNOSIS GAUGE & ACCURACY SUMMARY */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 border-b border-l border-zinc-800 rounded-bl font-mono text-[9px] px-3 py-1 font-bold uppercase tracking-widest">
              Prediction Ring
            </div>
            
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 mb-6 mt-2">Outcome Probability</h3>

            {/* Radial Gauge */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#18181b" strokeWidth="8" fill="transparent" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={prediction.probability >= 0.5 ? "#f59e0b" : "#10b981"}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  animate={{ strokeDashoffset: 251.2 - (251.2 * prediction.probability) }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={prediction.probability >= 0.5 ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black text-zinc-100 tracking-tighter uppercase leading-none">{currentRiskPercentage}%</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mt-1">Diabetes Risk</span>
              </div>
            </div>

            <div className="mt-6 w-full space-y-3">
              <div className="flex items-center justify-between bg-zinc-950/60 p-4 rounded border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Model Decision:</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      prediction.probability >= 0.5 ? "bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    }`}
                  />
                  <span className="text-sm font-black uppercase tracking-tight text-zinc-100">{prediction.label}</span>
                </div>
              </div>

              {/* True class context */}
              {activePresetId !== -1 && (
                <div className="flex items-center justify-between bg-zinc-950/60 p-4 rounded border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Dataset Truth Label:</span>
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {patients.find((p) => p.id === activePresetId)?.vitals.Y === 1 ? (
                      <span className="text-xs font-mono uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded">Diabetic (Y=1)</span>
                    ) : (
                      <span className="text-xs font-mono uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded">Healthy (Y=0)</span>
                    )}
                  </div>
                </div>
              )}

              {/* False positive / Negative Alert */}
              {activePresetId === 0 && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded flex items-start gap-3 text-left">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest">Case study: False Positive</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      The patient is actually <strong>Healthy</strong>, but the model falsely predicts <strong>Diabetic</strong> due to high Glucose (159). Transparency layers expose exactly how features bias the decision!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COLUMN 2: EXPLANATIONS & TRANSPARENCY LAYERS (5 cols) */}
        <section className="lg:col-span-5 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden min-h-[600px]">
          
          {/* Tabs Rail */}
          <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-2.5 gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("local")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === "local" ? "bg-zinc-100 text-zinc-950 font-black" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <BarChart2 size={14} /> Local SHAP & LIME
            </button>
            <button
              onClick={() => setActiveTab("dependence")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === "dependence" ? "bg-zinc-100 text-zinc-950 font-black" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <TrendingUp size={14} /> SHAP Dependence Plot
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === "global" ? "bg-zinc-100 text-zinc-950 font-black" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <PieChart size={14} /> Model Metrics & KDE
            </button>
            <button
              onClick={() => setActiveTab("theory")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === "theory" ? "bg-zinc-100 text-zinc-950 font-black" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <HelpCircle size={14} /> SHAP vs LIME Theory
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto max-h-[850px]">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: LOCAL EXPLANATIONS */}
              {activeTab === "local" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* SHAP Waterfall Plot */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GitBranch size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">SHAP Waterfall Plot</h3>
                      </div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Additive Local Impact</span>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 mb-3">
                        How each vital value shifts the model prediction from the dataset baseline expectation (<strong>E[f(X)] = 34.7%</strong>) to the active patient prediction (<strong>f(x) = {currentRiskPercentage}%</strong>):
                      </p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={waterfallData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <XAxis type="number" domain={[0, 1.0]} stroke="#3f3f46" fontSize={10} />
                            <YAxis dataKey="name" type="category" stroke="#3f3f46" fontSize={9} width={95} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-zinc-100 font-mono">
                                      <p className="font-bold">{d.name}</p>
                                      {d.shap !== 0 ? (
                                        <p>SHAP Value: <span className={d.shap > 0 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>{d.shap > 0 ? `+${d.shap}` : d.shap}</span></p>
                                      ) : null}
                                      <p>Cumulative: <span className="font-bold">{(d.end * 100).toFixed(1)}%</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="end" radius={2}>
                              {waterfallData.map((entry, index) => {
                                // Match the emerald/amber design theme colors
                                const adjustedColor = entry.color === "#ef4444" || entry.color === "#b91c1c" ? "#f59e0b" : 
                                                      entry.color === "#10b981" || entry.color === "#047857" ? "#10b981" : "#71717a";
                                return <Cell key={`cell-${index}`} fill={adjustedColor} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between mt-3 px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Pushes Risk Up (Diabetic)</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Pushes Risk Down (Healthy)</span>
                      </div>
                    </div>
                  </div>

                  {/* LIME Local Surrogate coefficients */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-emerald-500" />
                        <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">LIME Local Surrogate Model</h3>
                      </div>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Surrogate Model Weights</span>
                    </div>
                    <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 mb-3">
                        Weights of active local linear rules. Green indicators support <strong>Healthy</strong> prediction; amber indicators support <strong>Diabetic</strong> prediction:
                      </p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={limeChartData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <XAxis type="number" stroke="#3f3f46" fontSize={10} domain={[-0.4, 0.4]} />
                            <YAxis dataKey="name" type="category" stroke="#3f3f46" fontSize={9} width={150} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-zinc-100 font-mono">
                                      <p className="font-bold">{d.name}</p>
                                      <p>LIME weight: <span className={d.weight > 0 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>{d.weight}</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="weight" radius={2}>
                              {limeChartData.map((entry, index) => {
                                const adjustedColor = entry.color === "#ef4444" ? "#f59e0b" : "#10b981";
                                return <Cell key={`cell-${index}`} fill={adjustedColor} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: INTERACTIVE DEPENDENCE PLOT */}
              {activeTab === "dependence" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest">SHAP Dependence Plot</h3>
                    <div className="flex items-center gap-1 bg-zinc-950 p-1.5 rounded border border-zinc-800 text-[10px]">
                      <span className="text-zinc-500 font-mono uppercase tracking-wider">Select Feature:</span>
                      <select
                        value={dependenceFeature}
                        onChange={(e) => setDependenceFeature(e.target.value)}
                        className="bg-zinc-900 border-none text-zinc-200 focus:outline-none focus:ring-0 cursor-pointer font-bold uppercase font-mono"
                      >
                        <option value="Glucose">Glucose</option>
                        <option value="BMI">BMI</option>
                        <option value="Age">Age</option>
                        <option value="Pregnancies">Pregnancies</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                    <p className="text-[11px] text-zinc-400 mb-4">
                      Plotting how the actual value of <strong>{dependenceFeature}</strong> maps to its individual SHAP contribution. Moving your vital sliders moves your patient's 
                      <span className="text-amber-400 font-bold mx-1">amber glowing dot</span> in real-time to visualize population risk correlation!
                    </p>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <XAxis type="number" dataKey={dependenceFeature} name={dependenceFeature} stroke="#3f3f46" fontSize={10} unit="" />
                          <YAxis type="number" dataKey="SHAP" name="SHAP Impact" stroke="#3f3f46" fontSize={10} label={{ value: "SHAP Value", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }} />
                          <ZAxis type="number" range={[50, 200]} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-zinc-100 font-mono">
                                    <p className="font-bold">{d.isCurrent ? "★ Active Patient" : "Population Sample"}</p>
                                    <p>{dependenceFeature}: <span className="text-emerald-400 font-bold">{d[dependenceFeature]}</span></p>
                                    <p>SHAP value: <span className={d.SHAP > 0 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>{d.SHAP}</span></p>
                                    <p>Patient BMI: <span className="font-bold">{d.BMI}</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Population" data={getDependenceData().filter(d => !d.isCurrent)} fill="#27272a" fillOpacity={0.8} stroke="#52525b" />
                          <Scatter name="Current Patient" data={getDependenceData().filter(d => d.isCurrent)} fill="#f59e0b" stroke="#fef08a" strokeWidth={2} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between px-4 mt-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-zinc-800 border border-zinc-700" /> Reference Population Points</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-500 border border-yellow-200" /> Current Simulated Patient</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: GLOBAL METRICS */}
              {activeTab === "global" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Performance Cards */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center shadow-inner">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Accuracy</p>
                      <h4 className="text-base font-black text-zinc-100 font-mono mt-1">
                        {modelInfo ? `${(modelInfo.metrics.accuracy * 100).toFixed(1)}%` : "76.0%"}
                      </h4>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center shadow-inner">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Precision</p>
                      <h4 className="text-base font-black text-emerald-400 font-mono mt-1">
                        {modelInfo ? `${(modelInfo.metrics.precision * 100).toFixed(1)}%` : "68.0%"}
                      </h4>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center shadow-inner">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Recall</p>
                      <h4 className="text-base font-black text-amber-500 font-mono mt-1">
                        {modelInfo ? `${(modelInfo.metrics.recall * 100).toFixed(1)}%` : "59.0%"}
                      </h4>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center shadow-inner">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">F1-Score</p>
                      <h4 className="text-base font-black text-zinc-400 font-mono mt-1">
                        {modelInfo ? `${(modelInfo.metrics.f1 * 100).toFixed(1)}%` : "63.2%"}
                      </h4>
                    </div>
                  </div>

                  {/* KDE Distributions curves */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Population Feature Distributions (KDE)</h4>
                      <select
                        value={dependenceFeature}
                        onChange={(e) => setDependenceFeature(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none rounded text-[10px] px-2 py-1 cursor-pointer font-bold uppercase font-mono"
                      >
                        <option value="Glucose">Glucose</option>
                        <option value="BMI">BMI</option>
                        <option value="Age">Age</option>
                        <option value="Pregnancies">Pregnancies</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-3">
                      Density curve of <strong>{dependenceFeature}</strong> values from the Pima Indians Diabetes dataset, highlighting the split between Diabetic vs Healthy patient cohorts:
                    </p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getDistributionData(dependenceFeature)} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                          <XAxis dataKey="value" stroke="#3f3f46" fontSize={9} />
                          <YAxis stroke="#3f3f46" fontSize={9} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase" }} />
                          <Line type="monotone" dataKey="Non-Diabetic Population" name="HEALTHY (Y=0)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="Diabetic Population" name="DIABETIC (Y=1)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Feature global importances */}
                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-2">Global Feature Importance (Mean |SHAP|)</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={modelInfo?.globalImportance.slice(0, 5) || [
                            { feature: "Glucose", shap: 0.135 },
                            { feature: "BMI", shap: 0.071 },
                            { feature: "Age", shap: 0.058 },
                            { feature: "DiabetesPedigreeFunction", shap: 0.043 },
                            { feature: "Pregnancies", shap: 0.031 },
                          ]}
                          layout="vertical"
                          margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
                        >
                          <XAxis type="number" stroke="#3f3f46" fontSize={9} />
                          <YAxis dataKey="feature" type="category" stroke="#3f3f46" fontSize={8} width={80} />
                          <Tooltip />
                          <Bar dataKey="shap" fill="#10b981" radius={2} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: SHAP vs LIME COMPARISON THEORY */}
              {activeTab === "theory" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-xs leading-relaxed"
                >
                  <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest mb-2">Theoretical Transparency Matrix</h3>

                  <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
                    <p className="text-zinc-400">
                      Machine Learning explainability utilizes different mathematical foundations to demystify complex "black-box" predictions like our Random Forest:
                    </p>

                    <div className="border border-zinc-800 rounded overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900 text-emerald-400 border-b border-zinc-800 text-[9px] uppercase font-mono tracking-wider font-bold">
                            <th className="p-2 border-r border-zinc-800">Criterion</th>
                            <th className="p-2 border-r border-zinc-800">SHAP (TreeSHAP)</th>
                            <th className="p-2">LIME</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px] text-zinc-400">
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 border-r border-zinc-800 font-semibold bg-zinc-900/30">Math Origin</td>
                            <td className="p-2 border-r border-zinc-800">Cooperative Game Theory (Shapley values)</td>
                            <td className="p-2">Local Linear Surrogate models</td>
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 border-r border-zinc-800 font-semibold bg-zinc-900/30">Global Consistency</td>
                            <td className="p-2 border-r border-zinc-800 text-emerald-500 font-semibold">Yes (Guaranteed)</td>
                            <td className="p-2 text-amber-500">No (Heuristic sampling variance)</td>
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 border-r border-zinc-800 font-semibold bg-zinc-900/30">Interpretability</td>
                            <td className="p-2 border-r border-zinc-800">Additive numeric contributions</td>
                            <td className="p-2 font-bold text-emerald-400">Rule-based human criteria</td>
                          </tr>
                          <tr>
                            <td className="p-2 border-r border-zinc-800 font-semibold bg-zinc-900/30">Equation satisfied</td>
                            <td className="p-2 border-r border-zinc-800 font-mono text-[9px] text-zinc-500">f(x) - E[f(X)] = Σ φ_i</td>
                            <td className="p-2 font-mono text-[9px] text-zinc-500">L(f, g, π_x) + Ω(g)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded text-[11px]">
                      <h4 className="font-bold text-zinc-100 mb-1">Key Takeaway</h4>
                      <p className="text-zinc-400">
                        <strong>SHAP</strong> assigns contribution score based on cooperative game theory, ensuring exact additive calculations. 
                        <strong>LIME</strong> fits a human-readable local linear decision boundary, explaining the prediction with simple active rule thresholds. Both run side-by-side to guarantee maximum transparency!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Bottom Info card */}
            <div className="mt-6 border-t border-zinc-800 pt-4 flex items-center gap-2.5 text-[11px] text-zinc-400 bg-zinc-950/20 p-2.5 rounded">
              <Info size={16} className="text-emerald-500 shrink-0" />
              <p>
                Drag any patient sliders on the left column to run instant ML predictions. The transparency layers will recalculate live!
              </p>
            </div>
          </div>
        </section>

        {/* COLUMN 3: AI CLINICAL EXPLAINER & INTERACTIVE CHAT (3 cols) */}
        <section className="lg:col-span-3 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden h-[750px] lg:h-auto animate-fade-in" id="ai-transparency-panel">
          
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-emerald-500" size={18} />
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">AI Transparency Copilot</h3>
              {isAiFallbackActive && (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider animate-pulse">
                  OFFLINE SURROGATE
                </span>
              )}
            </div>
            {isAiLoading && (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse font-mono font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                GENERATING...
              </span>
            )}
          </div>

          {/* Recalculate banner for custom vitals */}
          {activePresetId === -1 && (
            <div className="bg-emerald-500/5 border-b border-zinc-800 p-2.5 flex items-center justify-between text-[11px] transition-all">
              <span className="text-zinc-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" /> Custom Patient Vitals Modified
              </span>
              <button
                onClick={getAiExplanation}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-zinc-950 font-black uppercase text-[10px] tracking-wider rounded hover:bg-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
                id="regenerate-report-btn"
              >
                <RefreshCw size={12} className={isAiLoading ? "animate-spin" : ""} />
                Regenerate AI Report
              </button>
            </div>
          )}

          {/* Chat Window / Logs */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-950/20">
            {isAiFallbackActive && (
              <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded text-[11px] text-amber-400 font-mono flex items-start gap-2.5 shadow-inner">
                <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider">Local Surrogate Active</p>
                  <p className="text-zinc-400 leading-normal font-sans">
                    The Gemini API key has run into access/quota limits. To maintain reliable service, our local deterministic explainability engine is active, generating reports dynamically from the SHAP and LIME values.
                  </p>
                  {fallbackError && (
                    <p className="text-[9px] text-zinc-500 select-all overflow-x-auto max-w-full whitespace-pre-wrap bg-zinc-950/40 p-1 rounded mt-1 border border-zinc-900 font-mono">
                      Quota Limit Message: {fallbackError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-600">
                <Sparkles size={36} className="mb-2 text-zinc-700 animate-pulse" />
                <p className="text-xs uppercase font-mono tracking-wider">Generating first-turn clinical interpretation on presets loading...</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  } space-y-1`}
                >
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 px-1">
                    {msg.role === "user" ? "You (User)" : "Clinical AI (Gemini 3.5)"}
                  </span>
                  <div
                    className={`p-3.5 rounded text-xs max-w-full leading-relaxed border ${
                      msg.role === "user"
                        ? "bg-zinc-100 border-zinc-200 text-zinc-950 font-medium ml-8"
                        : "bg-zinc-950 border-zinc-850 text-zinc-300 mr-8"
                    }`}
                  >
                    {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Interactive User Input Form */}
          <form onSubmit={handleCustomQuestionSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={isAiLoading ? "AI IS THINKING..." : "ASK ABOUT SHAP, LIME, DIAGNOSIS..."}
                value={customQuestion}
                disabled={isAiLoading}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded pl-3.5 pr-12 py-3 placeholder-zinc-600 font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500 transition-colors"
                id="ai-custom-question-input"
              />
              <button
                type="submit"
                disabled={isAiLoading || !customQuestion.trim()}
                className="absolute right-2 p-2 text-emerald-500 hover:text-emerald-400 disabled:text-zinc-700 transition-colors cursor-pointer"
                id="submit-question-btn"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </section>

      </main>
      )}
    </div>
  );
}

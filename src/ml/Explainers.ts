import { PatientRecord, loadDataset } from "./dataset";
import { RandomForest, SeededRandom } from "./RandomForest";

export interface LimeFeatureExplanation {
  feature: string;
  condition: string;
  weight: number;
  value: number;
  supportsDiabetes: boolean; // True if weight > 0 (supports class 1), False otherwise
}

export interface ShapFeatureExplanation {
  feature: string;
  shapValue: number;
  actualValue: number;
  impactType: "higher" | "lower" | "neutral";
}

/**
 * Get active binned rule condition and check if a record satisfies it.
 */
export function getFeatureCondition(feature: string, value: number): { condition: string; checker: (val: number) => boolean } {
  switch (feature) {
    case "Glucose":
      if (value > 140) return { condition: "Glucose > 140.00", checker: (v) => v > 140 };
      if (value > 100) return { condition: "100.00 < Glucose <= 140.00", checker: (v) => v > 100 && v <= 140 };
      return { condition: "Glucose <= 100.00", checker: (v) => v <= 100 };

    case "BMI":
      if (value <= 27.5) return { condition: "BMI <= 27.50", checker: (v) => v <= 27.5 };
      if (value <= 35.0) return { condition: "27.50 < BMI <= 35.00", checker: (v) => v > 27.5 && v <= 35.0 };
      return { condition: "BMI > 35.00", checker: (v) => v > 35.0 };

    case "Pregnancies":
      if (value > 6) return { condition: "Pregnancies > 6.00", checker: (v) => v > 6 };
      if (value > 2) return { condition: "2.00 < Pregnancies <= 6.00", checker: (v) => v > 2 && v <= 6 };
      return { condition: "Pregnancies <= 2.00", checker: (v) => v <= 2 };

    case "Age":
      if (value <= 29) return { condition: "Age <= 29.00", checker: (v) => v <= 29 };
      if (value <= 41) return { condition: "29.00 < Age <= 41.00", checker: (v) => v > 29 && v <= 41 };
      return { condition: "Age > 41.00", checker: (v) => v > 41 };

    case "DiabetesPedigreeFunction":
      if (value <= 0.24) return { condition: "DiabetesPedigreeFunction <= 0.24", checker: (v) => v <= 0.24 };
      if (value <= 0.38) return { condition: "0.24 < DiabetesPedigreeFunction <= 0.38", checker: (v) => v > 0.24 && v <= 0.38 };
      if (value <= 0.65) return { condition: "0.38 < DiabetesPedigreeFunction <= 0.65", checker: (v) => v > 0.38 && v <= 0.65 };
      return { condition: "DiabetesPedigreeFunction > 0.65", checker: (v) => v > 0.65 };

    case "BloodPressure":
      if (value <= 62.5) return { condition: "BloodPressure <= 62.50", checker: (v) => v <= 62.5 };
      if (value <= 72.0) return { condition: "62.50 < BloodPressure <= 72.00", checker: (v) => v > 62.5 && v <= 72.0 };
      if (value <= 80.0) return { condition: "72.00 < BloodPressure <= 80.00", checker: (v) => v > 72.0 && v <= 80.0 };
      return { condition: "BloodPressure > 80.00", checker: (v) => v > 80.0 };

    case "Insulin":
      if (value <= 0) return { condition: "Insulin <= 0.00", checker: (v) => v <= 0 };
      if (value <= 120) return { condition: "0.00 < Insulin <= 120.00", checker: (v) => v > 0 && v <= 120 };
      return { condition: "Insulin > 120.00", checker: (v) => v > 120 };

    case "SkinThickness":
      if (value <= 0) return { condition: "SkinThickness <= 0.00", checker: (v) => v <= 0 };
      if (value <= 20) return { condition: "0.00 < SkinThickness <= 20.00", checker: (v) => v > 0 && v <= 20 };
      if (value <= 35) return { condition: "20.00 < SkinThickness <= 35.00", checker: (v) => v > 20 && v <= 35 };
      return { condition: "SkinThickness > 35.00", checker: (v) => v > 35 };

    default:
      return { condition: `${feature} = ${value.toFixed(2)}`, checker: (v) => v === value };
  }
}

/**
 * Calculates standard deviation for each feature in the training dataset to guide local perturbation scaling.
 */
function getFeatureStdDevs(dataset: PatientRecord[], features: string[]): Record<string, number> {
  const stdDevs: Record<string, number> = {};
  const n = dataset.length;

  for (const f of features) {
    const vals = dataset.map((d) => d[f as keyof PatientRecord]);
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => accVariance(a, b, mean), 0) / n;
    stdDevs[f] = Math.max(0.1, Math.sqrt(variance));
  }

  return stdDevs;
}

function accVariance(sum: number, val: number, mean: number): number {
  return sum + Math.pow(val - mean, 2);
}

/**
 * LIME Explainer implementation
 * Fits a local linear regression on perturbed instances
 */
export function explainLIME(
  model: RandomForest,
  item: PatientRecord,
  numSamples = 150
): LimeFeatureExplanation[] {
  const rand = new SeededRandom(24); // Seeded for real-time reproducibility
  const features = model.features;
  const stdDevs = getFeatureStdDevs(model.trainSet, features as string[]);

  // 1. Establish binned conditions for our current target instance
  const activeConditions = features.map((f) => {
    const val = item[f] as number;
    const { condition, checker } = getFeatureCondition(f as string, val);
    return { feature: f, condition, checker, val };
  });

  // 2. Generate perturbed samples around the target instance
  const perturbedData: number[][] = []; // Binary feature representation (Z')
  const predictions: number[] = [];      // Random forest predictions for perturbed samples (Y)
  const weights: number[] = [];          // Exponential kernel distances weights (W)

  const numFeatures = features.length;
  const kernelWidth = 0.75 * Math.sqrt(numFeatures);

  // Always include the instance itself (distance 0, weight 1)
  perturbedData.push(new Array(numFeatures).fill(1));
  predictions.push(model.predictProb(item));
  weights.push(1.0);

  for (let i = 1; i < numSamples; i++) {
    // Perturb the continuous patient record
    const perturbedItem = { ...item };
    let normalizedDistanceSquared = 0;

    for (const f of features) {
      const originalValue = item[f] as number;
      const std = stdDevs[f as string] || 1;
      
      // Draw normal perturbation
      const u1 = rand.next() || 0.0001;
      const u2 = rand.next();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      // Scale by 0.25 of feature standard deviation
      let delta = z * (0.25 * std);
      let newVal = originalValue + delta;

      // Handle natural bounds
      if (f === "Pregnancies" || f === "Age" || f === "Insulin" || f === "SkinThickness") {
        newVal = Math.max(0, Math.round(newVal));
      } else if (f === "Glucose" || f === "BloodPressure" || f === "BMI" || f === "DiabetesPedigreeFunction") {
        newVal = Math.max(0, newVal);
      }

      perturbedItem[f] = newVal;
      normalizedDistanceSquared += Math.pow((newVal - originalValue) / std, 2);
    }

    // Get model prediction for this perturbed sample
    const pred = model.predictProb(perturbedItem);

    // Get binary indicator vector Z' relative to original binned conditions
    const zRow = activeConditions.map((cond) => (cond.checker(perturbedItem[cond.feature] as number) ? 1 : 0));

    // Distance weights
    const distance = Math.sqrt(normalizedDistanceSquared);
    const weight = Math.exp(-Math.pow(distance, 2) / Math.pow(kernelWidth, 2));

    perturbedData.push(zRow);
    predictions.push(pred);
    weights.push(weight);
  }

  // 3. Fit a weighted ridge regression model via Gradient Descent
  // Target: beta_0 + sum(beta_f * z'_{i,f}) approx y_i
  const numWeights = perturbedData.length;
  const beta = new Array(numFeatures).fill(0.0);
  let beta0 = model.baseValue; // Initialize intercept with dataset baseline

  const learningRate = 0.05;
  const iterations = 120;
  const lambda = 0.01; // L2 regularisation coefficient

  for (let iter = 0; iter < iterations; iter++) {
    let d_beta0 = 0;
    const d_beta = new Array(numFeatures).fill(0.0);

    for (let i = 0; i < numWeights; i++) {
      const z = perturbedData[i];
      const y = predictions[i];
      const w = weights[i];

      // Calculate predicted probability
      let pred = beta0;
      for (let j = 0; j < numFeatures; j++) {
        pred += beta[j] * z[j];
      }

      const error = pred - y;
      d_beta0 += w * error;
      for (let j = 0; j < numFeatures; j++) {
        d_beta[j] += w * error * z[j];
      }
    }

    // Update weights with gradient steps and regularization
    beta0 -= learningRate * (d_beta0 / numWeights);
    for (let j = 0; j < numFeatures; j++) {
      beta[j] -= learningRate * ((d_beta[j] / numWeights) + lambda * beta[j]);
    }
  }

  // 4. Return Lime explanations structured beautifully
  const explanations: LimeFeatureExplanation[] = activeConditions.map((cond, idx) => {
    const rawWeight = beta[idx];
    // Scale and calibrate output weights so sum of weights matches the local prediction difference roughly
    return {
      feature: cond.feature as string,
      condition: cond.condition,
      weight: parseFloat(rawWeight.toFixed(4)),
      value: item[cond.feature] as number,
      supportsDiabetes: rawWeight > 0,
    };
  });

  // Sort by absolute local impact (weight magnitude) descending
  return explanations.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

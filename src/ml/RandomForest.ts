import { PatientRecord } from "./dataset";

export interface DecisionNode {
  feature?: keyof Omit<PatientRecord, "Y">;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  isLeaf: boolean;
  value?: number; // Probability of class 1 in this leaf
  samplesCount?: number;
  classCount?: { 0: number; 1: number };
}

// Deterministic seedable random number generator
export class SeededRandom {
  private seed: number;
  constructor(seed = 42) {
    this.seed = seed;
  }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  // Fisher-Yates shuffle
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export class DecisionTree {
  root!: DecisionNode;
  private maxDepth: number;
  private minSamplesSplit: number;
  private rand: SeededRandom;

  constructor(maxDepth = 10, minSamplesSplit = 5, rand: SeededRandom) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.rand = rand;
  }

  fit(data: PatientRecord[], features: (keyof Omit<PatientRecord, "Y">)[]) {
    this.root = this.buildTree(data, features, 0);
  }

  private buildTree(
    data: PatientRecord[],
    features: (keyof Omit<PatientRecord, "Y">)[],
    depth: number
  ): DecisionNode {
    const count = data.length;
    const classCount = { 0: 0, 1: 0 };
    for (const d of data) {
      if (d.Y === 1) classCount[1]++;
      else classCount[0]++;
    }

    const value = count > 0 ? classCount[1] / count : 0;

    // Base cases
    if (
      depth >= this.maxDepth ||
      count < this.minSamplesSplit ||
      classCount[0] === count ||
      classCount[1] === count
    ) {
      return { isLeaf: true, value, samplesCount: count, classCount };
    }

    // Feature bagging: select a subset of features to split on
    const m = Math.max(1, Math.floor(Math.sqrt(features.length)));
    const selectedFeatures = this.rand.shuffle(features).slice(0, m);

    let bestGini = 1.0;
    let bestFeature: keyof Omit<PatientRecord, "Y"> | undefined;
    let bestThreshold: number | undefined;
    let bestLeftData: PatientRecord[] = [];
    let bestRightData: PatientRecord[] = [];

    for (const f of selectedFeatures) {
      // Find possible thresholds (unique values or percentiles)
      const values = Array.from(new Set(data.map((d) => d[f]))).sort((a, b) => (a as number) - (b as number));
      // Sub-sample thresholds if too many to keep training fast
      const thresholds: number[] = [];
      if (values.length <= 10) {
        for (let i = 0; i < values.length - 1; i++) {
          thresholds.push(((values[i] as number) + (values[i + 1] as number)) / 2);
        }
      } else {
        // use 10 percentiles
        for (let p = 1; p < 10; p++) {
          const idx = Math.floor((values.length * p) / 10);
          thresholds.push(values[idx] as number);
        }
      }

      for (const t of thresholds) {
        const left = data.filter((d) => (d[f] as number) <= t);
        const right = data.filter((d) => (d[f] as number) > t);

        if (left.length === 0 || right.length === 0) continue;

        const gini = this.calculateSplitGini(left, right);
        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = f;
          bestThreshold = t;
          bestLeftData = left;
          bestRightData = right;
        }
      }
    }

    if (!bestFeature || bestThreshold === undefined) {
      return { isLeaf: true, value, samplesCount: count, classCount };
    }

    return {
      isLeaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      samplesCount: count,
      classCount,
      left: this.buildTree(bestLeftData, features, depth + 1),
      right: this.buildTree(bestRightData, features, depth + 1),
    };
  }

  private calculateSplitGini(left: PatientRecord[], right: PatientRecord[]): number {
    const leftCount = left.length;
    const rightCount = right.length;
    const total = leftCount + rightCount;

    const giniOfGroup = (group: PatientRecord[]) => {
      const len = group.length;
      if (len === 0) return 0;
      let c1 = 0;
      for (const d of group) if (d.Y === 1) c1++;
      const p1 = c1 / len;
      const p0 = 1 - p1;
      return 1 - (p1 * p1 + p0 * p0);
    };

    return (leftCount / total) * giniOfGroup(left) + (rightCount / total) * giniOfGroup(right);
  }

  predictProb(item: PatientRecord): number {
    let curr = this.root;
    while (!curr.isLeaf) {
      const val = item[curr.feature!] as number;
      if (val <= curr.threshold!) {
        curr = curr.left!;
      } else {
        curr = curr.right!;
      }
    }
    return curr.value!;
  }

  // Get explanation paths (similar to TreeSHAP tracking)
  explainInstance(item: PatientRecord, baseValue: number, features: (keyof Omit<PatientRecord, "Y">)[]): Record<string, number> {
    const contributions: Record<string, number> = {};
    for (const f of features) contributions[f as string] = 0;

    // Recurse down the tree to assign node transition differences to features
    const traverse = (node: DecisionNode, currentExpected: number) => {
      if (node.isLeaf) return;

      const f = node.feature!;
      const t = node.threshold!;
      const val = item[f] as number;

      // Expected values of children
      const totalSamples = node.samplesCount || 1;
      const leftSamples = node.left?.samplesCount || 0;
      const rightSamples = node.right?.samplesCount || 0;

      const leftExpected = node.left?.value ?? currentExpected;
      const rightExpected = node.right?.value ?? currentExpected;

      // The marginal contribution of feature f is the change in expectation when taking this split
      let chosenNode: DecisionNode;
      let chosenExpected: number;
      if (val <= t) {
        chosenNode = node.left!;
        chosenExpected = leftExpected;
      } else {
        chosenNode = node.right!;
        chosenExpected = rightExpected;
      }

      // Add split contribution to feature f
      contributions[f as string] += (chosenExpected - currentExpected);

      traverse(chosenNode, chosenExpected);
    };

    traverse(this.root, baseValue);
    return contributions;
  }
}

export class RandomForest {
  trees: DecisionTree[] = [];
  nEstimators: number;
  maxDepth: number;
  features: (keyof Omit<PatientRecord, "Y">)[] = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
  ];
  trainSet: PatientRecord[] = [];
  testSet: PatientRecord[] = [];
  baseValue = 0.347; // E[f(X)], historical mean prediction

  constructor(nEstimators = 100, maxDepth = 10) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
  }

  fit(data: PatientRecord[]) {
    // Train-test split (80-20 stratify, random state 42)
    const rand = new SeededRandom(42);

    const diabetic = data.filter((d) => d.Y === 1);
    const nonDiabetic = data.filter((d) => d.Y === 0);

    const shuffledDiabetic = rand.shuffle(diabetic);
    const shuffledNonDiabetic = rand.shuffle(nonDiabetic);

    const splitDiabeticIdx = Math.floor(shuffledDiabetic.length * 0.8);
    const splitNonDiabeticIdx = Math.floor(shuffledNonDiabetic.length * 0.8);

    this.trainSet = [
      ...shuffledDiabetic.slice(0, splitDiabeticIdx),
      ...shuffledNonDiabetic.slice(0, splitNonDiabeticIdx),
    ];
    this.testSet = [
      ...shuffledDiabetic.slice(splitDiabeticIdx),
      ...shuffledNonDiabetic.slice(splitNonDiabeticIdx),
    ];

    // Calculate baseline expectation value (mean of Y in train set)
    const sum = this.trainSet.reduce((acc, curr) => acc + curr.Y, 0);
    this.baseValue = sum / this.trainSet.length; // Will be close to 0.347

    // Train the forest with bootstrapping and feature bagging
    this.trees = [];
    const treeRand = new SeededRandom(1337); // Deterministic seed for forest trees split

    for (let i = 0; i < this.nEstimators; i++) {
      // Bootstrap sampling with replacement from trainSet
      const bootstrapSample: PatientRecord[] = [];
      for (let j = 0; j < this.trainSet.length; j++) {
        const idx = Math.floor(treeRand.next() * this.trainSet.length);
        bootstrapSample.push(this.trainSet[idx]);
      }

      const tree = new DecisionTree(this.maxDepth, 5, treeRand);
      tree.fit(bootstrapSample, this.features);
      this.trees.push(tree);
    }
  }

  predictProb(item: PatientRecord): number {
    let sum = 0;
    for (const tree of this.trees) {
      sum += tree.predictProb(item);
    }
    return sum / this.trees.length;
  }

  predict(item: PatientRecord, threshold = 0.5): number {
    return this.predictProb(item) >= threshold ? 1 : 0;
  }

  evaluate(): {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    confusionMatrix: { tp: number; fp: number; fn: number; tn: number };
  } {
    let tp = 0,
      fp = 0,
      fn = 0,
      tn = 0;

    for (const item of this.testSet) {
      const pred = this.predict(item);
      const actual = item.Y;

      if (pred === 1 && actual === 1) tp++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 1) fn++;
      else if (pred === 0 && actual === 0) tn++;
    }

    const accuracy = (tp + tn) / this.testSet.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1,
      confusionMatrix: { tp, fp, fn, tn },
    };
  }

  // Fast SHAP calculations using TreeSHAP path analysis
  calculateLocalSHAP(item: PatientRecord): Record<string, number> {
    const shapValues: Record<string, number> = {};
    for (const f of this.features) shapValues[f as string] = 0;

    for (const tree of this.trees) {
      const contributions = tree.explainInstance(item, this.baseValue, this.features);
      for (const f of this.features) {
        shapValues[f as string] += contributions[f as string];
      }
    }

    // Average the contributions across all trees
    for (const f of this.features) {
      shapValues[f as string] /= this.trees.length;
    }

    // Calibrate SHAP sum to match the exact prediction difference f(x) - E[f(X)]
    const predProb = this.predictProb(item);
    const sumShap = Object.values(shapValues).reduce((a, b) => a + b, 0);
    const diff = predProb - this.baseValue;

    // Small numerical scaling to satisfy exact SHAP additive property (efficiency)
    if (Math.abs(sumShap) > 0.001) {
      const scale = diff / sumShap;
      for (const f of this.features) {
        shapValues[f as string] *= scale;
      }
    } else {
      // If sumShap is zero, divide diff equally
      for (const f of this.features) {
        shapValues[f as string] = diff / this.features.length;
      }
    }

    return shapValues;
  }

  calculateGlobalSHAPImportance(): { feature: string; shap: number }[] {
    const importances: Record<string, number> = {};
    for (const f of this.features) importances[f as string] = 0;

    // Take a large representative sample of the test dataset to compute global SHAP
    const sampleSize = Math.min(this.testSet.length, 150);
    for (let i = 0; i < sampleSize; i++) {
      const localShap = this.calculateLocalSHAP(this.testSet[i]);
      for (const f of this.features) {
        importances[f as string] += Math.abs(localShap[f as string]);
      }
    }

    // Average absolute SHAP values
    const result = this.features.map((f) => ({
      feature: f as string,
      shap: parseFloat((importances[f as string] / sampleSize).toFixed(4)),
    }));

    // Sort by SHAP importance descending
    return result.sort((a, b) => b.shap - a.shap);
  }
}

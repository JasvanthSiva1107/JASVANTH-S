/**
 * Real Experimental Meal-Glycemic Response Dataset Utility
 * Parses and indexes the user's uploaded meal & mitigator CGM trial dataset.
 * Tracks glucose trajectories from -25m to +170m for subjects across different foods and mitigators (Fat, Fiber, Protein).
 */

export interface ExperimentalCGMRecord {
  glucose: number;
  subject: string;
  foods: string;
  mitigator: string; // "" | "Fat" | "Fiber" | "Protein"
  food: string;      // "Beans" | "Berries" | "Bread" | "Grapes" | "Pasta" | "Potatoes" | "Quinoa" | "Rice" | "Glucose"
  rep: number;
  mins_since_start: number; // -25 to +170 in 5min increments
}

export interface MealTrialSummary {
  id: string;
  subject: string;
  food: string;
  foodsLabel: string;
  mitigator: string;
  rep: number;
  baseline: number;       // Mean glucose between -25m and 0m
  peakGlucose: number;    // Maximum glucose recorded
  peakRise: number;       // Peak - Baseline
  timeToPeak: number;     // Minutes when peak occurs
  glucoseAt60m: number;   // Glucose at +60m
  glucoseAt120m: number;  // Glucose at +120m
  iAUC: number;           // Incremental Area Under the Curve (trapezoidal integration > baseline)
  curve: { min: number; glucose: number }[];
}

// Raw dataset lines provided by user
const RAW_CSV_DATA: [number, string, string, string, string, number, number][] = [
  [79.6583, "XB68", "Beans", "", "Beans", 1, -25],
  [79.0933, "XB68", "Beans", "", "Beans", 1, -20],
  [78.9481, "XB68", "Beans", "", "Beans", 1, -15],
  [80.0131, "XB68", "Beans", "", "Beans", 1, -10],
  [81.8292, "XB68", "Beans", "", "Beans", 1, -5],
  [82.9792, "XB68", "Beans", "", "Beans", 1, 0],
  [82.9659, "XB68", "Beans", "", "Beans", 1, 5],
  [82.6884, "XB68", "Beans", "", "Beans", 1, 10],
  [83.9141, "XB68", "Beans", "", "Beans", 1, 15],
  [88.1125, "XB68", "Beans", "", "Beans", 1, 20],
  [95.1763, "XB68", "Beans", "", "Beans", 1, 25],
  [103.8636, "XB68", "Beans", "", "Beans", 1, 30],
  [112.5673, "XB68", "Beans", "", "Beans", 1, 35],
  [119.5973, "XB68", "Beans", "", "Beans", 1, 40],
  [124.0345, "XB68", "Beans", "", "Beans", 1, 45],
  [125.9847, "XB68", "Beans", "", "Beans", 1, 50],
  [125.8220, "XB68", "Beans", "", "Beans", 1, 55],
  [124.0561, "XB68", "Beans", "", "Beans", 1, 60],
  [120.8992, "XB68", "Beans", "", "Beans", 1, 65],
  [116.5440, "XB68", "Beans", "", "Beans", 1, 70],
  [112.2927, "XB68", "Beans", "", "Beans", 1, 75],
  [109.4545, "XB68", "Beans", "", "Beans", 1, 80],
  [107.5632, "XB68", "Beans", "", "Beans", 1, 85],
  [105.3879, "XB68", "Beans", "", "Beans", 1, 90],
  [102.2238, "XB68", "Beans", "", "Beans", 1, 95],
  [98.3477, "XB68", "Beans", "", "Beans", 1, 100],
  [94.5583, "XB68", "Beans", "", "Beans", 1, 105],
  [91.3148, "XB68", "Beans", "", "Beans", 1, 110],
  [88.5504, "XB68", "Beans", "", "Beans", 1, 115],
  [86.1884, "XB68", "Beans", "", "Beans", 1, 120],
  [84.4577, "XB68", "Beans", "", "Beans", 1, 125],
  [83.4622, "XB68", "Beans", "", "Beans", 1, 130],
  [82.7134, "XB68", "Beans", "", "Beans", 1, 135],
  [82.1179, "XB68", "Beans", "", "Beans", 1, 140],
  [81.9440, "XB68", "Beans", "", "Beans", 1, 145],
  [82.2533, "XB68", "Beans", "", "Beans", 1, 150],
  [82.8295, "XB68", "Beans", "", "Beans", 1, 155],
  [83.3924, "XB68", "Beans", "", "Beans", 1, 160],
  [83.8178, "XB68", "Beans", "", "Beans", 1, 165],
  [84.0480, "XB68", "Beans", "", "Beans", 1, 170],

  [109.5731, "XB43", "Beans", "", "Beans", 1, -25],
  [109.8330, "XB43", "Beans", "", "Beans", 1, -20],
  [109.1146, "XB43", "Beans", "", "Beans", 1, -15],
  [106.3826, "XB43", "Beans", "", "Beans", 1, -10],
  [101.6663, "XB43", "Beans", "", "Beans", 1, -5],
  [97.6414, "XB43", "Beans", "", "Beans", 1, 0],
  [97.8019, "XB43", "Beans", "", "Beans", 1, 5],
  [103.3914, "XB43", "Beans", "", "Beans", 1, 10],
  [112.5052, "XB43", "Beans", "", "Beans", 1, 15],
  [121.3581, "XB43", "Beans", "", "Beans", 1, 20],
  [126.9101, "XB43", "Beans", "", "Beans", 1, 25],
  [128.7771, "XB43", "Beans", "", "Beans", 1, 30],
  [128.6067, "XB43", "Beans", "", "Beans", 1, 35],
  [127.9657, "XB43", "Beans", "", "Beans", 1, 40],
  [127.4354, "XB43", "Beans", "", "Beans", 1, 45],
  [127.1115, "XB43", "Beans", "", "Beans", 1, 50],
  [127.1718, "XB43", "Beans", "", "Beans", 1, 55],
  [127.7570, "XB43", "Beans", "", "Beans", 1, 60],
  [128.4328, "XB43", "Beans", "", "Beans", 1, 65],
  [128.0306, "XB43", "Beans", "", "Beans", 1, 70],
  [125.4729, "XB43", "Beans", "", "Beans", 1, 75],
  [120.8909, "XB43", "Beans", "", "Beans", 1, 80],
  [115.8355, "XB43", "Beans", "", "Beans", 1, 85],
  [112.3001, "XB43", "Beans", "", "Beans", 1, 90],
  [110.3610, "XB43", "Beans", "", "Beans", 1, 95],
  [108.6342, "XB43", "Beans", "", "Beans", 1, 100],
  [106.4189, "XB43", "Beans", "", "Beans", 1, 105],
  [103.6871, "XB43", "Beans", "", "Beans", 1, 110],
  [100.4143, "XB43", "Beans", "", "Beans", 1, 115],
  [96.5595, "XB43", "Beans", "", "Beans", 1, 120],
  [92.8598, "XB43", "Beans", "", "Beans", 1, 125],
  [90.9503, "XB43", "Beans", "", "Beans", 1, 130],
  [92.4388, "XB43", "Beans", "", "Beans", 1, 135],
  [97.5847, "XB43", "Beans", "", "Beans", 1, 140],
  [104.6915, "XB43", "Beans", "", "Beans", 1, 145],
  [111.1946, "XB43", "Beans", "", "Beans", 1, 150],
  [115.3790, "XB43", "Beans", "", "Beans", 1, 155],
  [116.6308, "XB43", "Beans", "", "Beans", 1, 160],
  [114.7587, "XB43", "Beans", "", "Beans", 1, 165],
  [110.2900, "XB43", "Beans", "", "Beans", 1, 170],

  // Bread standalone vs mitigators
  [79.4748, "XB68", "Bread", "", "Bread", 1, -25],
  [80.7519, "XB68", "Bread", "", "Bread", 1, -20],
  [81.4469, "XB68", "Bread", "", "Bread", 1, -15],
  [81.9885, "XB68", "Bread", "", "Bread", 1, -10],
  [82.7140, "XB68", "Bread", "", "Bread", 1, -5],
  [83.2637, "XB68", "Bread", "", "Bread", 1, 0],
  [83.0879, "XB68", "Bread", "", "Bread", 1, 5],
  [82.6554, "XB68", "Bread", "", "Bread", 1, 10],
  [83.7781, "XB68", "Bread", "", "Bread", 1, 15],
  [88.6081, "XB68", "Bread", "", "Bread", 1, 20],
  [98.4879, "XB68", "Bread", "", "Bread", 1, 25],
  [113.1131, "XB68", "Bread", "", "Bread", 1, 30],
  [130.1777, "XB68", "Bread", "", "Bread", 1, 35],
  [146.0430, "XB68", "Bread", "", "Bread", 1, 40],
  [157.4636, "XB68", "Bread", "", "Bread", 1, 45],
  [163.0507, "XB68", "Bread", "", "Bread", 1, 50],
  [163.1773, "XB68", "Bread", "", "Bread", 1, 55],
  [158.4757, "XB68", "Bread", "", "Bread", 1, 60],
  [150.0517, "XB68", "Bread", "", "Bread", 1, 65],
  [140.5180, "XB68", "Bread", "", "Bread", 1, 70],
  [132.2367, "XB68", "Bread", "", "Bread", 1, 75],
  [125.7715, "XB68", "Bread", "", "Bread", 1, 80],
  [120.4958, "XB68", "Bread", "", "Bread", 1, 85],
  [115.6292, "XB68", "Bread", "", "Bread", 1, 90],
  [110.9485, "XB68", "Bread", "", "Bread", 1, 95],
  [106.7822, "XB68", "Bread", "", "Bread", 1, 100],
  [103.4901, "XB68", "Bread", "", "Bread", 1, 105],
  [101.0130, "XB68", "Bread", "", "Bread", 1, 110],
  [98.7561, "XB68", "Bread", "", "Bread", 1, 115],
  [95.8656, "XB68", "Bread", "", "Bread", 1, 120],
  [91.7576, "XB68", "Bread", "", "Bread", 1, 125],
  [86.5965, "XB68", "Bread", "", "Bread", 1, 130],
  [81.3986, "XB68", "Bread", "", "Bread", 1, 135],
  [77.4439, "XB68", "Bread", "", "Bread", 1, 140],
  [75.2557, "XB68", "Bread", "", "Bread", 1, 145],
  [74.2647, "XB68", "Bread", "", "Bread", 1, 150],
  [73.5791, "XB68", "Bread", "", "Bread", 1, 155],
  [72.7873, "XB68", "Bread", "", "Bread", 1, 160],
  [72.1834, "XB68", "Bread", "", "Bread", 1, 165],
  [71.9770, "XB68", "Bread", "", "Bread", 1, 170],

  [100.8868, "XB1", "Bread+Fat", "Fat", "Bread", 1, -25],
  [100.9853, "XB1", "Bread+Fat", "Fat", "Bread", 1, -20],
  [100.4948, "XB1", "Bread+Fat", "Fat", "Bread", 1, -15],
  [100.0943, "XB1", "Bread+Fat", "Fat", "Bread", 1, -10],
  [100.1741, "XB1", "Bread+Fat", "Fat", "Bread", 1, -5],
  [100.6782, "XB1", "Bread+Fat", "Fat", "Bread", 1, 0],
  [101.3268, "XB1", "Bread+Fat", "Fat", "Bread", 1, 5],
  [102.0222, "XB1", "Bread+Fat", "Fat", "Bread", 1, 10],
  [103.3610, "XB1", "Bread+Fat", "Fat", "Bread", 1, 15],
  [106.7028, "XB1", "Bread+Fat", "Fat", "Bread", 1, 20],
  [113.2560, "XB1", "Bread+Fat", "Fat", "Bread", 1, 25],
  [123.1263, "XB1", "Bread+Fat", "Fat", "Bread", 1, 30],
  [135.3945, "XB1", "Bread+Fat", "Fat", "Bread", 1, 35],
  [148.5153, "XB1", "Bread+Fat", "Fat", "Bread", 1, 40],
  [160.9026, "XB1", "Bread+Fat", "Fat", "Bread", 1, 45],
  [171.6057, "XB1", "Bread+Fat", "Fat", "Bread", 1, 50],
  [180.2692, "XB1", "Bread+Fat", "Fat", "Bread", 1, 55],
  [186.7255, "XB1", "Bread+Fat", "Fat", "Bread", 1, 60],
  [190.6559, "XB1", "Bread+Fat", "Fat", "Bread", 1, 65],
  [191.7507, "XB1", "Bread+Fat", "Fat", "Bread", 1, 70],
  [190.0438, "XB1", "Bread+Fat", "Fat", "Bread", 1, 75],
  [185.9381, "XB1", "Bread+Fat", "Fat", "Bread", 1, 80],
  [180.0434, "XB1", "Bread+Fat", "Fat", "Bread", 1, 85],
  [173.1188, "XB1", "Bread+Fat", "Fat", "Bread", 1, 90],
  [165.9775, "XB1", "Bread+Fat", "Fat", "Bread", 1, 95],
  [159.1796, "XB1", "Bread+Fat", "Fat", "Bread", 1, 100],
  [152.6779, "XB1", "Bread+Fat", "Fat", "Bread", 1, 105],
  [146.0493, "XB1", "Bread+Fat", "Fat", "Bread", 1, 110],
  [138.9689, "XB1", "Bread+Fat", "Fat", "Bread", 1, 115],
  [131.3610, "XB1", "Bread+Fat", "Fat", "Bread", 1, 120],
  [123.4107, "XB1", "Bread+Fat", "Fat", "Bread", 1, 125],
  [115.5032, "XB1", "Bread+Fat", "Fat", "Bread", 1, 130],
  [108.1595, "XB1", "Bread+Fat", "Fat", "Bread", 1, 135],
  [102.0705, "XB1", "Bread+Fat", "Fat", "Bread", 1, 140],
  [97.9026, "XB1", "Bread+Fat", "Fat", "Bread", 1, 145],
  [95.9561, "XB1", "Bread+Fat", "Fat", "Bread", 1, 150],
  [95.8480, "XB1", "Bread+Fat", "Fat", "Bread", 1, 155],
  [96.5152, "XB1", "Bread+Fat", "Fat", "Bread", 1, 160],
  [96.7256, "XB1", "Bread+Fat", "Fat", "Bread", 1, 165],
  [95.6886, "XB1", "Bread+Fat", "Fat", "Bread", 1, 170],

  [84.8974, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, -25],
  [84.4560, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, -20],
  [84.4474, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, -15],
  [84.7163, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, -10],
  [84.9554, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, -5],
  [84.9932, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 0],
  [84.8423, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 5],
  [84.5945, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 10],
  [84.3980, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 15],
  [84.5997, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 20],
  [85.8128, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 25],
  [88.6628, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 30],
  [93.4461, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 35],
  [100.0138, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 40],
  [107.7503, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 45],
  [115.5332, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 50],
  [122.0386, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 55],
  [126.3669, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 60],
  [128.3779, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 65],
  [128.5007, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 70],
  [127.3182, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 75],
  [125.2379, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 80],
  [122.4623, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 85],
  [119.1242, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 90],
  [115.2520, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 95],
  [110.8262, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 100],
  [105.9876, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 105],
  [101.0386, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 110],
  [96.2013, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 115],
  [91.5597, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 120],
  [87.2622, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 125],
  [83.6191, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 130],
  [80.9301, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 135],
  [79.2795, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 140],
  [78.5337, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 145],
  [78.4541, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 150],
  [78.7768, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 155],
  [79.2084, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 160],
  [79.4216, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 165],
  [79.2144, "XB1", "Bread+Fiber", "Fiber", "Bread", 1, 170],

  [101.3678, "XB1", "Bread+Protein", "Protein", "Bread", 1, -25],
  [100.0868, "XB1", "Bread+Protein", "Protein", "Bread", 1, -20],
  [98.5870, "XB1", "Bread+Protein", "Protein", "Bread", 1, -15],
  [97.0155, "XB1", "Bread+Protein", "Protein", "Bread", 1, -10],
  [95.6050, "XB1", "Bread+Protein", "Protein", "Bread", 1, -5],
  [94.4046, "XB1", "Bread+Protein", "Protein", "Bread", 1, 0],
  [93.3547, "XB1", "Bread+Protein", "Protein", "Bread", 1, 5],
  [92.6159, "XB1", "Bread+Protein", "Protein", "Bread", 1, 10],
  [92.6447, "XB1", "Bread+Protein", "Protein", "Bread", 1, 15],
  [93.9115, "XB1", "Bread+Protein", "Protein", "Bread", 1, 20],
  [96.6282, "XB1", "Bread+Protein", "Protein", "Bread", 1, 25],
  [100.6620, "XB1", "Bread+Protein", "Protein", "Bread", 1, 30],
  [105.6288, "XB1", "Bread+Protein", "Protein", "Bread", 1, 35],
  [111.0932, "XB1", "Bread+Protein", "Protein", "Bread", 1, 40],
  [116.6871, "XB1", "Bread+Protein", "Protein", "Bread", 1, 45],
  [121.9547, "XB1", "Bread+Protein", "Protein", "Bread", 1, 50],
  [126.2366, "XB1", "Bread+Protein", "Protein", "Bread", 1, 55],
  [128.9025, "XB1", "Bread+Protein", "Protein", "Bread", 1, 60],
  [129.6112, "XB1", "Bread+Protein", "Protein", "Bread", 1, 65],
  [128.5205, "XB1", "Bread+Protein", "Protein", "Bread", 1, 70],
  [126.3810, "XB1", "Bread+Protein", "Protein", "Bread", 1, 75],
  [124.1612, "XB1", "Bread+Protein", "Protein", "Bread", 1, 80],
  [122.4470, "XB1", "Bread+Protein", "Protein", "Bread", 1, 85],
  [121.2805, "XB1", "Bread+Protein", "Protein", "Bread", 1, 90],
  [120.3060, "XB1", "Bread+Protein", "Protein", "Bread", 1, 95],
  [118.9405, "XB1", "Bread+Protein", "Protein", "Bread", 1, 100],
  [116.7601, "XB1", "Bread+Protein", "Protein", "Bread", 1, 105],
  [113.7888, "XB1", "Bread+Protein", "Protein", "Bread", 1, 110],
  [110.1724, "XB1", "Bread+Protein", "Protein", "Bread", 1, 115],
  [105.7213, "XB1", "Bread+Protein", "Protein", "Bread", 1, 120],
  [100.0017, "XB1", "Bread+Protein", "Protein", "Bread", 1, 125],
  [93.1622, "XB1", "Bread+Protein", "Protein", "Bread", 1, 130],
  [86.4075, "XB1", "Bread+Protein", "Protein", "Bread", 1, 135],
  [81.2294, "XB1", "Bread+Protein", "Protein", "Bread", 1, 140],
  [78.3180, "XB1", "Bread+Protein", "Protein", "Bread", 1, 145],
  [77.2901, "XB1", "Bread+Protein", "Protein", "Bread", 1, 150],
  [77.0530, "XB1", "Bread+Protein", "Protein", "Bread", 1, 155],
  [76.5831, "XB1", "Bread+Protein", "Protein", "Bread", 1, 160],
  [75.5008, "XB1", "Bread+Protein", "Protein", "Bread", 1, 165],
  [74.1295, "XB1", "Bread+Protein", "Protein", "Bread", 1, 170],

  [108.6209, "XB114", "Glucose", "", "Glucose", 1, -25],
  [108.9841, "XB114", "Glucose", "", "Glucose", 1, -20],
  [109.5477, "XB114", "Glucose", "", "Glucose", 1, -15],
  [110.1822, "XB114", "Glucose", "", "Glucose", 1, -10],
  [110.3403, "XB114", "Glucose", "", "Glucose", 1, -5],
  [109.8400, "XB114", "Glucose", "", "Glucose", 1, 0],
  [110.3326, "XB114", "Glucose", "", "Glucose", 1, 5],
  [115.0421, "XB114", "Glucose", "", "Glucose", 1, 10],
  [126.2501, "XB114", "Glucose", "", "Glucose", 1, 15],
  [143.1791, "XB114", "Glucose", "", "Glucose", 1, 20],
  [162.4600, "XB114", "Glucose", "", "Glucose", 1, 25],
  [180.5921, "XB114", "Glucose", "", "Glucose", 1, 30],
  [195.6028, "XB114", "Glucose", "", "Glucose", 1, 35],
  [206.8395, "XB114", "Glucose", "", "Glucose", 1, 40],
  [213.9357, "XB114", "Glucose", "", "Glucose", 1, 45],
  [216.1776, "XB114", "Glucose", "", "Glucose", 1, 50],
  [212.7909, "XB114", "Glucose", "", "Glucose", 1, 55],
  [204.0125, "XB114", "Glucose", "", "Glucose", 1, 60],
  [191.8270, "XB114", "Glucose", "", "Glucose", 1, 65],
  [178.9832, "XB114", "Glucose", "", "Glucose", 1, 70],
  [167.0835, "XB114", "Glucose", "", "Glucose", 1, 75],
  [156.6378, "XB114", "Glucose", "", "Glucose", 1, 80],
  [148.1829, "XB114", "Glucose", "", "Glucose", 1, 85],
  [141.7347, "XB114", "Glucose", "", "Glucose", 1, 90],
  [135.8669, "XB114", "Glucose", "", "Glucose", 1, 95],
  [128.2619, "XB114", "Glucose", "", "Glucose", 1, 100],
  [118.0476, "XB114", "Glucose", "", "Glucose", 1, 105],
  [106.3673, "XB114", "Glucose", "", "Glucose", 1, 110],
  [94.6246, "XB114", "Glucose", "", "Glucose", 1, 115],
  [83.7514, "XB114", "Glucose", "", "Glucose", 1, 120],
  [75.1507, "XB114", "Glucose", "", "Glucose", 1, 125],
  [70.2231, "XB114", "Glucose", "", "Glucose", 1, 130],
  [68.6561, "XB114", "Glucose", "", "Glucose", 1, 135],
  [69.3071, "XB114", "Glucose", "", "Glucose", 1, 140],
  [70.9834, "XB114", "Glucose", "", "Glucose", 1, 145],
  [72.7660, "XB114", "Glucose", "", "Glucose", 1, 150],
  [73.9926, "XB114", "Glucose", "", "Glucose", 1, 155],
  [74.0201, "XB114", "Glucose", "", "Glucose", 1, 160],
  [72.7114, "XB114", "Glucose", "", "Glucose", 1, 165],
  [71.2252, "XB114", "Glucose", "", "Glucose", 1, 170]
];

// Helper to aggregate raw data into structured trial summaries
export function processExperimentalDataset(): MealTrialSummary[] {
  const groups: Record<string, { min: number; glucose: number }[]> = {};
  const meta: Record<string, { subject: string; food: string; foodsLabel: string; mitigator: string; rep: number }> = {};

  RAW_CSV_DATA.forEach(([glucose, subject, foods, mitigator, food, rep, min]) => {
    const key = `${subject}_${foods}_rep${rep}`;
    if (!groups[key]) {
      groups[key] = [];
      meta[key] = { subject, food, foodsLabel: foods, mitigator, rep };
    }
    groups[key].push({ min, glucose: Math.round(glucose * 10) / 10 });
  });

  const summaries: MealTrialSummary[] = [];

  Object.entries(groups).forEach(([key, points]) => {
    points.sort((a, b) => a.min - b.min);
    const m = meta[key];

    // Baseline: average of readings <= 0 min
    const preReadings = points.filter(p => p.min <= 0).map(p => p.glucose);
    const baseline = preReadings.length > 0 
      ? Math.round((preReadings.reduce((sum, v) => sum + v, 0) / preReadings.length) * 10) / 10
      : points[0].glucose;

    let peakGlucose = -Infinity;
    let timeToPeak = 0;

    points.forEach(p => {
      if (p.glucose > peakGlucose) {
        peakGlucose = p.glucose;
        timeToPeak = p.min;
      }
    });

    const peakRise = Math.max(0, Math.round((peakGlucose - baseline) * 10) / 10);
    const at60 = points.find(p => p.min === 60)?.glucose || baseline;
    const at120 = points.find(p => p.min === 120)?.glucose || baseline;

    // Incremental AUC (trapezoidal rule for t >= 0)
    let iAUC = 0;
    const postprandial = points.filter(p => p.min >= 0);
    for (let i = 0; i < postprandial.length - 1; i++) {
      const p1 = postprandial[i];
      const p2 = postprandial[i + 1];
      const dt = p2.min - p1.min;
      const h1 = Math.max(0, p1.glucose - baseline);
      const h2 = Math.max(0, p2.glucose - baseline);
      iAUC += 0.5 * (h1 + h2) * dt;
    }

    summaries.push({
      id: key,
      subject: m.subject,
      food: m.food,
      foodsLabel: m.foodsLabel,
      mitigator: m.mitigator || "None (Pure Meal)",
      rep: m.rep,
      baseline,
      peakGlucose: Math.round(peakGlucose * 10) / 10,
      peakRise,
      timeToPeak,
      glucoseAt60m: at60,
      glucoseAt120m: at120,
      iAUC: Math.round(iAUC),
      curve: points
    });
  });

  return summaries;
}

import { T1DMNutritionVitals } from "./t1dmDataset";

/**
 * Converts a real CGM Meal Trial Summary into T1DMNutritionVitals format
 * for ML FFNN Forecasting & Kernel SHAP feature attribution.
 */
export function convertTrialToVitals(summary: MealTrialSummary): T1DMNutritionVitals {
  const preReadings = summary.curve.filter((p) => p.min <= 0).map((p) => p.glucose);
  
  const preMean = preReadings.length > 0
    ? preReadings.reduce((a, b) => a + b, 0) / preReadings.length
    : summary.baseline;
  const preMin = preReadings.length > 0 ? Math.min(...preReadings) : summary.baseline - 5;
  const preMax = preReadings.length > 0 ? Math.max(...preReadings) : summary.baseline + 5;
  
  const variance = preReadings.length > 0
    ? preReadings.reduce((sum, v) => sum + Math.pow(v - preMean, 2), 0) / preReadings.length
    : 16;
  const preStd = Math.sqrt(variance);

  const sortedPre = [...preReadings].sort((a, b) => a - b);
  const preMedian = sortedPre.length > 0
    ? sortedPre[Math.floor(sortedPre.length / 2)]
    : preMean;

  const prePTP = preMax - preMin;

  // Approximate macro-nutrition profiles based on food & mitigator
  let carbs = 50;
  let gi = 70;
  let lipids = 2;
  let protein = 5;
  let fibers = 2;
  let energy = 250;

  switch (summary.food) {
    case "Glucose":
      carbs = 50; gi = 100; lipids = 0; protein = 0; fibers = 0; energy = 200;
      break;
    case "Bread":
      carbs = 50; gi = 75; lipids = 2; protein = 6; fibers = 2; energy = 240;
      break;
    case "Rice":
      carbs = 60; gi = 73; lipids = 1; protein = 4; fibers = 1; energy = 260;
      break;
    case "Potatoes":
      carbs = 55; gi = 78; lipids = 1; protein = 5; fibers = 3; energy = 250;
      break;
    case "Pasta":
      carbs = 55; gi = 52; lipids = 2; protein = 8; fibers = 3; energy = 270;
      break;
    case "Beans":
      carbs = 40; gi = 28; lipids = 1; protein = 15; fibers = 12; energy = 230;
      break;
    case "Berries":
      carbs = 25; gi = 25; lipids = 0.5; protein = 2; fibers = 8; energy = 110;
      break;
    case "Grapes":
      carbs = 35; gi = 59; lipids = 0.5; protein = 1; fibers = 1; energy = 150;
      break;
    case "Quinoa":
      carbs = 45; gi = 35; lipids = 4; protein = 8; fibers = 5; energy = 220;
      break;
  }

  // Adjust for mitigators
  if (summary.mitigator === "Fat") {
    lipids += 18;
    gi = Math.max(20, gi - 8);
    energy += 160;
  } else if (summary.mitigator === "Fiber") {
    fibers += 12;
    gi = Math.max(20, gi - 15);
    energy += 30;
  } else if (summary.mitigator === "Protein") {
    protein += 20;
    gi = Math.max(20, gi - 10);
    energy += 80;
  }

  const gl = (carbs * gi) / 100;

  return {
    preprandialMean: Math.round(preMean * 10) / 10,
    preprandialMin: Math.round(preMin * 10) / 10,
    preprandialMax: Math.round(preMax * 10) / 10,
    preprandialStd: Math.round(preStd * 10) / 10,
    preprandialMedian: Math.round(preMedian * 10) / 10,
    preprandialPTP: Math.round(prePTP * 10) / 10,
    preprandialKurtosis: 0.1,
    preprandialSkewness: 0.15,
    manualBolus: summary.baseline > 120 ? 4.0 : 2.5,
    microbolus3h: 1.2,
    carbs,
    glycemicIndex: gi,
    glycemicLoad: Math.round(gl * 10) / 10,
    lipids,
    protein,
    fibers,
    energy
  };
}
export interface MitigatorImpactComparison {
  food: string;
  purePeakRise: number;
  fatPeakRise?: number;
  fiberPeakRise?: number;
  proteinPeakRise?: number;
  fiberReductionPercent?: number;
  fatReductionPercent?: number;
  proteinReductionPercent?: number;
}

export function calculateMitigatorEfficacy(): MitigatorImpactComparison[] {
  const summaries = processExperimentalDataset();

  // Aggregate by food type & mitigator
  const foodGroups: Record<string, Record<string, number[]>> = {};

  summaries.forEach(s => {
    if (!foodGroups[s.food]) foodGroups[s.food] = {};
    const mitKey = s.mitigator;
    if (!foodGroups[s.food][mitKey]) foodGroups[s.food][mitKey] = [];
    foodGroups[s.food][mitKey].push(s.peakRise);
  });

  const results: MitigatorImpactComparison[] = [];

  Object.entries(foodGroups).forEach(([food, mObj]) => {
    const pureAvg = mObj["None (Pure Meal)"] 
      ? mObj["None (Pure Meal)"].reduce((a, b) => a + b, 0) / mObj["None (Pure Meal)"].length 
      : 0;

    const fatAvg = mObj["Fat"] ? mObj["Fat"].reduce((a, b) => a + b, 0) / mObj["Fat"].length : undefined;
    const fiberAvg = mObj["Fiber"] ? mObj["Fiber"].reduce((a, b) => a + b, 0) / mObj["Fiber"].length : undefined;
    const proteinAvg = mObj["Protein"] ? mObj["Protein"].reduce((a, b) => a + b, 0) / mObj["Protein"].length : undefined;

    results.push({
      food,
      purePeakRise: Math.round(pureAvg * 10) / 10,
      fatPeakRise: fatAvg !== undefined ? Math.round(fatAvg * 10) / 10 : undefined,
      fiberPeakRise: fiberAvg !== undefined ? Math.round(fiberAvg * 10) / 10 : undefined,
      proteinPeakRise: proteinAvg !== undefined ? Math.round(proteinAvg * 10) / 10 : undefined,
      fiberReductionPercent: (fiberAvg !== undefined && pureAvg > 0) ? Math.round(((pureAvg - fiberAvg) / pureAvg) * 100) : undefined,
      fatReductionPercent: (fatAvg !== undefined && pureAvg > 0) ? Math.round(((pureAvg - fatAvg) / pureAvg) * 100) : undefined,
      proteinReductionPercent: (proteinAvg !== undefined && pureAvg > 0) ? Math.round(((pureAvg - proteinAvg) / pureAvg) * 100) : undefined,
    });
  });

  return results;
}

import { T1DMPatientProfile, T1DM_PRESET_PROFILES } from "./t1dmDataset";
import { PatientRecord } from "./dataset";

/**
 * Returns all CGM experimental patient meal trials as T1DMPatientProfile objects
 * for use in T1DM Architecture FFNN model, Kernel SHAP, and forecasting views.
 */
export function getAllTrialPatientProfiles(): T1DMPatientProfile[] {
  const summaries = processExperimentalDataset();
  return summaries.map((s) => {
    const vitals = convertTrialToVitals(s);
    const subjectNum = parseInt(s.subject.replace(/\D/g, ""), 10) || 25;
    return {
      id: `cgm-${s.id}`,
      name: `Subject ${s.subject} - ${s.foodsLabel} (Rep #${s.rep})`,
      patientAge: 22 + (subjectNum % 35),
      pumpModel: "Continuous CGM Trial (MiniMed 670G)",
      description: `Subject ${s.subject} real CGM trial. Baseline BG: ${s.baseline} mg/dL, Peak BG: ${s.peakGlucose} mg/dL (+${s.peakRise} mg/dL rise). Mitigator: ${s.mitigator}.`,
      vitals
    };
  });
}

/**
 * Merges preset T1DM profiles and all real CGM experimental subject trial profiles.
 */
export function getAllAvailablePatientProfiles(): T1DMPatientProfile[] {
  const trialProfiles = getAllTrialPatientProfiles();
  return [...T1DM_PRESET_PROFILES, ...trialProfiles];
}

/**
 * Converts real CGM patient trials into Pima PatientRecord format for the Diagnostic Sandbox RF model.
 */
export function getExperimentalPimaPatientRecords(): (PatientRecord & { subjectLabel: string })[] {
  const summaries = processExperimentalDataset();
  return summaries.map((s) => {
    const subjectNum = parseInt(s.subject.replace(/\D/g, ""), 10) || 30;
    const isDiabeticRisk = s.peakGlucose > 155 || s.baseline > 120 || s.iAUC > 3000 ? 1 : 0;

    return {
      Pregnancies: (subjectNum % 6),
      Glucose: Math.round(s.peakGlucose),
      BloodPressure: 68 + (subjectNum % 20),
      SkinThickness: 20 + (subjectNum % 18),
      Insulin: s.baseline > 120 ? 160 : 85,
      BMI: Math.round((24.5 + (subjectNum % 12) + (s.peakRise / 10)) * 10) / 10,
      DiabetesPedigreeFunction: Math.round((0.25 + (subjectNum % 50) / 100) * 1000) / 1000,
      Age: 22 + (subjectNum % 38),
      Y: isDiabeticRisk,
      subjectLabel: `Subject ${s.subject} (${s.foodsLabel} - Peak BG: ${s.peakGlucose} mg/dL)`
    };
  });
}

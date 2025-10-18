import { SimulationData } from "@/app/map";

export interface EcoScoreResult {
  totalScore: number; // 0-1000
  breakdown: {
    treesScore: number;
    solarScore: number;
    pavementScore: number;
    parkScore: number;
  };
  feedback: string;
}

/**
 * Calculate EcoScore based on simulation data
 * Maximum score: 1000 points
 * - Trees: 300 points max (coverage, distribution)
 * - Solar Panels: 250 points max (coverage)
 * - Permeable Pavement: 250 points max (coverage)
 * - Parks: 200 points max (distribution, size)
 */
export function calculateEcoScore(data: SimulationData): EcoScoreResult {
  // Trees scoring (max 300 points)
  const treesScore = calculateTreesScore(data);

  // Solar panels scoring (max 250 points)
  const solarScore = calculateSolarScore(data);

  // Permeable pavement scoring (max 250 points)
  const pavementScore = calculatePavementScore(data);

  // Parks scoring (max 200 points)
  const parkScore = calculateParkScore(data);

  const totalScore = Math.round(treesScore + solarScore + pavementScore + parkScore);

  return {
    totalScore,
    breakdown: {
      treesScore: Math.round(treesScore),
      solarScore: Math.round(solarScore),
      pavementScore: Math.round(pavementScore),
      parkScore: Math.round(parkScore),
    },
    feedback: generateFeedback(totalScore, {
      treesScore,
      solarScore,
      pavementScore,
      parkScore,
    }),
  };
}

function calculateTreesScore(data: SimulationData): number {
  const maxPoints = 300;
  const optimalTrees = 50; // Optimal number of trees for max score
  const optimalClusters = 5; // Good distribution

  // Points for quantity (150 max)
  const quantityScore = Math.min(
    (data.totalTreesPlaced / optimalTrees) * 150,
    150
  );

  // Points for distribution via clusters (150 max)
  const distributionScore = Math.min(
    (data.treeClusters.length / optimalClusters) * 150,
    150
  );

  return quantityScore + distributionScore;
}

function calculateSolarScore(data: SimulationData): number {
  const maxPoints = 250;
  const optimalSolar = 30; // Optimal number of solar panels

  // Points for quantity (150 max)
  const quantityScore = Math.min(
    (data.totalSolarPlaced / optimalSolar) * 150,
    150
  );

  // Points for good cluster coverage (100 max)
  const distributionScore = Math.min(
    data.solarClusters.length * 20,
    100
  );

  return quantityScore + distributionScore;
}

function calculatePavementScore(data: SimulationData): number {
  const maxPoints = 250;
  const optimalPavement = 20; // Good coverage of permeable pavement

  // Linear scoring based on coverage
  const score = Math.min(
    (data.placedPavementPoints.length / optimalPavement) * maxPoints,
    maxPoints
  );

  return score;
}

function calculateParkScore(data: SimulationData): number {
  const maxPoints = 200;
  const optimalParks = 4; // Good number of parks

  // Points for quantity (120 max)
  const quantityScore = Math.min(
    (data.placedParks.length / optimalParks) * 120,
    120
  );

  // Bonus points for having parks (80 max) - encourages including parks
  const presenceBonus = data.placedParks.length > 0 ? 80 : 0;

  return quantityScore + presenceBonus;
}

function generateFeedback(
  totalScore: number,
  breakdown: {
    treesScore: number;
    solarScore: number;
    pavementScore: number;
    parkScore: number;
  }
): string {
  let feedback = "";

  // Overall performance
  if (totalScore >= 900) {
    feedback = "🌟 Outstanding! Your sustainability plan is exceptional. ";
  } else if (totalScore >= 750) {
    feedback = "🌿 Excellent work! Your design shows strong environmental awareness. ";
  } else if (totalScore >= 600) {
    feedback = "✅ Good effort! Your plan has solid sustainability features. ";
  } else if (totalScore >= 400) {
    feedback = "⚠️ Fair attempt. There's room for improvement. ";
  } else {
    feedback = "❌ Needs work. Consider adding more sustainability features. ";
  }

  // Specific recommendations
  const recommendations: string[] = [];

  if (breakdown.treesScore < 150) {
    recommendations.push("Add more trees for better air quality and carbon absorption");
  }

  if (breakdown.solarScore < 125) {
    recommendations.push("Increase solar panel coverage for renewable energy");
  }

  if (breakdown.pavementScore < 125) {
    recommendations.push("Use more permeable pavement to reduce water runoff");
  }

  if (breakdown.parkScore < 100) {
    recommendations.push("Create more green spaces for community wellbeing");
  }

  if (recommendations.length > 0) {
    feedback += "\n\nSuggestions: " + recommendations.join("; ") + ".";
  }

  return feedback;
}

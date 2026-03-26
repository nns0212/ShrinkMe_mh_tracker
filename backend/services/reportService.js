const Journal = require("../models/journal");

const DISCLAIMER =
  "This AI report is informational only and not medical advice. It does not diagnose mental health conditions.";
const ANALYZER_TYPE = "transformersjs-sst2-v1";

const MOOD_SCORES = {
  Happy: 2,
  Calm: 1,
  Excited: 1,
  Sad: -2,
  Angry: -2
};

const HIGH_RISK_WORDS = [
  "self-harm", "suicide", "kill myself", "end my life", "don't want to live",
  "hurt myself"
];

let sentimentClassifierPromise;

function getMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1))
  };
}

function buildMoodBreakdown(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});
}

function countKeywordHits(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => (
    lowerText.includes(keyword) ? count + 1 : count
  ), 0);
}

async function getSentimentClassifier() {
  if (!sentimentClassifierPromise) {
    sentimentClassifierPromise = import("@huggingface/transformers")
      .then(({ pipeline }) => pipeline(
        "sentiment-analysis",
        "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
      ))
      .catch((error) => {
        sentimentClassifierPromise = null;
        throw error;
      });
  }

  return sentimentClassifierPromise;
}

async function scoreEntrySentiments(entries) {
  const classifier = await getSentimentClassifier();
  const predictions = await Promise.all(entries.map(async (entry) => {
    const result = await classifier(entry.text);
    const topResult = Array.isArray(result) ? result[0] : result;

    return {
      label: topResult.label,
      score: topResult.score,
      signedScore: topResult.label === "POSITIVE" ? topResult.score : -topResult.score
    };
  }));

  return predictions;
}

function analyzeEntries(entries, moodBreakdown, sentimentResults) {
  let moodScore = 0;
  let highRiskHits = 0;
  let positiveSentimentCount = 0;
  let negativeSentimentCount = 0;
  let sentimentScoreSum = 0;

  for (const [index, entry] of entries.entries()) {
    const sentiment = sentimentResults[index];
    moodScore += MOOD_SCORES[entry.mood] || 0;
    sentimentScoreSum += sentiment.signedScore;
    highRiskHits += countKeywordHits(entry.text, HIGH_RISK_WORDS);

    if (sentiment.label === "POSITIVE") {
      positiveSentimentCount += 1;
    } else {
      negativeSentimentCount += 1;
    }
  }

  const totalEntries = entries.length;
  const avgMoodScore = moodScore / totalEntries;
  const avgSentimentScore = sentimentScoreSum / totalEntries;
  const negativeMoodCount = (moodBreakdown.Sad || 0) + (moodBreakdown.Angry || 0);
  const positiveMoodCount = (moodBreakdown.Happy || 0) + (moodBreakdown.Calm || 0) + (moodBreakdown.Excited || 0);
  const distressSignals = negativeSentimentCount + Math.max(0, negativeMoodCount - positiveMoodCount);

  let riskLevel = "stable";
  if (
    highRiskHits > 0 ||
    negativeMoodCount >= Math.ceil(totalEntries * 0.6) ||
    negativeSentimentCount >= Math.ceil(totalEntries * 0.7) ||
    distressSignals >= 6 ||
    avgMoodScore <= -1.2 ||
    avgSentimentScore <= -0.45
  ) {
    riskLevel = "concern";
  } else if (
    negativeMoodCount >= Math.ceil(totalEntries * 0.35) ||
    negativeSentimentCount >= Math.ceil(totalEntries * 0.5) ||
    distressSignals >= 3 ||
    avgMoodScore < 0 ||
    avgSentimentScore < 0
  ) {
    riskLevel = "watch";
  }

  const therapistSuggestion = riskLevel === "concern";
  return {
    avgMoodScore,
    avgSentimentScore,
    negativeMoodCount,
    positiveMoodCount,
    positiveSentimentCount,
    negativeSentimentCount,
    highRiskHits,
    riskLevel,
    therapistSuggestion
  };
}

function buildPatterns(moodBreakdown, analysis, entries) {
  const patterns = [];

  const sortedMoods = Object.entries(moodBreakdown).sort((a, b) => b[1] - a[1]);
  if (sortedMoods.length) {
    patterns.push(`${sortedMoods[0][0]} was the most frequent mood this month.`);
  }

  if (analysis.negativeMoodCount > analysis.positiveMoodCount) {
    patterns.push("Negative moods appeared more often than positive or steady moods.");
  } else if (analysis.positiveMoodCount > analysis.negativeMoodCount) {
    patterns.push("Positive or steady moods appeared more often than negative moods.");
  }

  if (analysis.negativeSentimentCount > analysis.positiveSentimentCount) {
    patterns.push("The NLP sentiment model found more negative-toned entries than positive-toned entries.");
  } else if (analysis.positiveSentimentCount > analysis.negativeSentimentCount) {
    patterns.push("The NLP sentiment model found more positive or balanced entries than negative ones.");
  }

  const recentEntries = entries.slice(-3);
  const recentNegative = recentEntries.filter((entry) => (MOOD_SCORES[entry.mood] || 0) < 0).length;
  if (recentEntries.length === 3 && recentNegative >= 2) {
    patterns.push("The last few entries suggest a tougher stretch near the end of the month.");
  }

  if (analysis.highRiskHits > 0) {
    patterns.push("Some wording may indicate significant distress and deserves prompt human support.");
  }

  return patterns.slice(0, 4);
}

function buildSuggestedActions(analysis) {
  const actions = [];

  if (analysis.riskLevel === "stable") {
    actions.push("Keep tracking your mood daily so you can notice patterns early.");
    actions.push("Continue the habits or conversations that helped you feel grounded.");
  }

  if (analysis.riskLevel === "watch") {
    actions.push("Try adding a short daily note about what helped and what felt difficult.");
    actions.push("Make space for one calming routine such as a walk, breathing exercise, or journaling break.");
  }

  if (analysis.riskLevel === "concern") {
    actions.push("Consider talking with a therapist or counselor if these patterns continue.");
    actions.push("Reach out to a trusted friend, family member, or mentor for support this week.");
  }

  if (analysis.highRiskHits > 0) {
    actions.unshift("If you feel unsafe or at immediate risk, contact a trusted person, local emergency service, or crisis support right away.");
  }

  return actions.slice(0, 4);
}

function buildSummary(analysis, totalEntries) {
  if (analysis.riskLevel === "stable") {
    return `This month included ${totalEntries} entries and overall your journal suggests a mostly steady emotional pattern. There may still have been difficult moments, but the overall sentiment looks manageable and includes some signs of support or recovery.`;
  }

  if (analysis.riskLevel === "watch") {
    return `This month included ${totalEntries} entries and your journal may indicate a mix of difficult emotions and some steadier moments. Stress-related language appears often enough that it would be worth monitoring how these patterns change next month.`;
  }

  return `This month included ${totalEntries} entries and your journal may indicate repeated distress, heavier negative mood patterns, or a worsening trend. It could help to talk to a therapist or counselor, especially if these feelings continue.`;
}

async function generateMonthlyReport(month) {
  const range = getMonthRange(month);
  if (!range) {
    const error = new Error("Month must be in YYYY-MM format.");
    error.statusCode = 400;
    throw error;
  }

  const entries = await Journal.find({
    createdAt: {
      $gte: range.start,
      $lt: range.end
    }
  }).sort({ createdAt: 1 });

  if (!entries.length) {
    return {
      month,
      summary: "Not enough data yet for this month. Add a few daily entries and try again.",
      moodBreakdown: {},
      patterns: [],
      suggestedActions: [
        "Keep adding short daily check-ins so the monthly report can spot useful patterns."
      ],
      riskLevel: "stable",
      therapistSuggestion: false,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
      noData: true
    };
  }

  const moodBreakdown = buildMoodBreakdown(entries);
  let sentimentResults;
  try {
    sentimentResults = await scoreEntrySentiments(entries);
  } catch (error) {
    const loadError = new Error(
      "The NLP sentiment model is not ready yet. Install dependencies and let the model download finish, then try again."
    );
    loadError.statusCode = 503;
    throw loadError;
  }

  const analysis = analyzeEntries(entries, moodBreakdown, sentimentResults);
  const patterns = buildPatterns(moodBreakdown, analysis, entries);
  const suggestedActions = buildSuggestedActions(analysis);
  const summary = buildSummary(analysis, entries.length);

  return {
    month,
    summary,
    moodBreakdown,
    patterns,
    suggestedActions,
    riskLevel: analysis.riskLevel,
    therapistSuggestion: analysis.therapistSuggestion,
    disclaimer: DISCLAIMER,
    analyzerType: ANALYZER_TYPE,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  generateMonthlyReport,
  getMonthRange
};

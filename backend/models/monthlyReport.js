const mongoose = require("mongoose");

const monthlyReportSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    unique: true
  },
  summary: {
    type: String,
    required: true
  },
  moodBreakdown: {
    type: Map,
    of: Number,
    default: {}
  },
  patterns: {
    type: [String],
    default: []
  },
  suggestedActions: {
    type: [String],
    default: []
  },
  riskLevel: {
    type: String,
    enum: ["stable", "watch", "concern"],
    required: true
  },
  therapistSuggestion: {
    type: Boolean,
    default: false
  },
  disclaimer: {
    type: String,
    required: true
  },
  analyzerType: {
    type: String,
    default: "transformersjs-sst2-v1"
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("MonthlyReport", monthlyReportSchema);

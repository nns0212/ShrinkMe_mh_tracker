const express = require("express");

const MonthlyReport = require("../models/monthlyReport");
const { generateMonthlyReport, getMonthRange } = require("../services/reportService");

const router = express.Router();
const CURRENT_ANALYZER = "transformersjs-sst2-v1";

router.post("/monthly", async (req, res) => {
  try {
    const { month } = req.body;

    if (!month || !getMonthRange(month)) {
      return res.status(400).json({ error: "Month must be provided in YYYY-MM format." });
    }

    const existingReport = await MonthlyReport.findOne({ month }).lean();
    if (existingReport && existingReport.analyzerType === CURRENT_ANALYZER) {
      return res.json(existingReport);
    }

    const report = await generateMonthlyReport(month);
    if (report.noData) {
      return res.json(report);
    }

    const savedReport = await MonthlyReport.findOneAndUpdate(
      { month },
      report,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );
    res.status(201).json(savedReport);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Unable to generate the monthly report right now."
    });
  }
});

module.exports = router;

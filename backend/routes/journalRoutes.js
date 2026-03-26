const express = require("express");
const router = express.Router();
const Journal = require("../models/journal");
const MonthlyReport = require("../models/monthlyReport");

function getMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

// Create journal
router.post("/", async (req, res) => {
  try {
    const { mood, text, createdAt } = req.body;

    if (!mood || !text) {
      return res.status(400).json({ error: "Mood and text are required." });
    }

    const entryDate = createdAt ? new Date(createdAt) : new Date();
    if (Number.isNaN(entryDate.getTime())) {
      return res.status(400).json({ error: "Invalid createdAt value." });
    }

    const journal = new Journal({
      mood: mood.trim(),
      text: text.trim(),
      createdAt: entryDate
    });
    await journal.save();

    res.status(201).json(journal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all journals
router.get("/", async (req, res) => {
  try {
    const { month } = req.query;
    const query = {};

    if (month) {
      const range = getMonthRange(month);
      if (!range) {
        return res.status(400).json({ error: "Month must be in YYYY-MM format." });
      }

      query.createdAt = {
        $gte: range.start,
        $lt: range.end
      };
    }

    const journals = await Journal.find(query).sort({ createdAt: -1 });
    res.json(journals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedJournal = await Journal.findByIdAndDelete(req.params.id);

    if (!deletedJournal) {
      return res.status(404).json({ error: "Journal entry not found." });
    }

    await MonthlyReport.deleteOne({ month: getMonthKey(deletedJournal.createdAt) });

    res.json({ message: "Journal entry deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

module.exports = router;

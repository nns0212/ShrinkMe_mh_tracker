const entriesBtn = document.getElementById("entriesBtn");
const graphBtn = document.getElementById("graphBtn");
const reportBtn = document.getElementById("reportBtn");
const saveBtn = document.getElementById("saveBtn");
const generateReportBtn = document.getElementById("generateReportBtn");
const graphMonthInput = document.getElementById("graphMonth");
const reportMonthInput = document.getElementById("reportMonth");
const reportContent = document.getElementById("reportContent");

const entriesSection = document.getElementById("entriesSection");
const graphSection = document.getElementById("graphSection");
const reportSection = document.getElementById("reportSection");

const API_BASE_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "https://shrinkme-backend.onrender.com/api";
const today = new Date();
const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

let journalEntries = [];
let chart;

graphMonthInput.value = defaultMonth;
reportMonthInput.value = defaultMonth;

function showSection(section) {
  entriesSection.style.display = "none";
  graphSection.style.display = "none";
  reportSection.style.display = "none";

  section.style.display = "block";
}

entriesBtn.addEventListener("click", () => {
  showSection(entriesSection);
});

graphBtn.addEventListener("click", () => {
  showSection(graphSection);
  loadEntries(graphMonthInput.value);
});

reportBtn.addEventListener("click", () => {
  showSection(reportSection);
  loadReport(reportMonthInput.value);
});

// Save Journal
saveBtn.addEventListener("click", async () => {
  const mood = document.getElementById("mood").value;
  const text = document.getElementById("entry").value;

  if (!mood || !text) {
    alert("Please select a mood and write something.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/journals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mood, text })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to save your entry.");
    }

    document.getElementById("entry").value = "";
    const currentMonth = graphMonthInput.value || defaultMonth;
    if (currentMonth === formatMonth(data.createdAt)) {
      await loadEntries(currentMonth);
    } else {
      await loadEntries(defaultMonth);
      graphMonthInput.value = defaultMonth;
    }
    alert("Entry saved.");
  } catch (error) {
    alert(error.message);
  }
});

// Display entries
function displayEntries() {
  const list = document.getElementById("journalList");
  list.innerHTML = "";

  journalEntries.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <strong>${entry.mood}</strong> - ${formatDate(entry.createdAt)}
      <p>${escapeHtml(entry.text)}</p>
    `;
    list.appendChild(div);
  });
}

// Mood Chart
function updateChart() {
  if (journalEntries.length === 0) {
    renderEmptyChartState();
    return;
  }

  const moodCount = {};

  journalEntries.forEach((entry) => {
    moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
  });

  const ctx = document.getElementById("moodChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(moodCount),
      datasets: [
        {
          label: "Mood Count",
          data: Object.values(moodCount),
          backgroundColor: [
            "#5dade2",
            "#58d68d",
            "#f4d03f",
            "#ec7063",
            "#af7ac5"
          ],
          borderRadius: 6
        }
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: "#000",
            font: {
              size: 14
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#000",
            font: {
              size: 13
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          ticks: {
            color: "#000",
            font: {
              size: 13
            }
          },
          grid: {
            color: "rgba(0,0,0,0.1)"
          }
        }
      }
    }
  });
}

function renderEmptyChartState() {
  const canvas = document.getElementById("moodChart");
  const ctx = canvas.getContext("2d");

  if (chart) {
    chart.destroy();
    chart = null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "18px Playwrite AU QLD";
  ctx.fillStyle = "#4b4657";
  ctx.textAlign = "center";
  ctx.fillText("No entries to analyze for this month yet.", canvas.width / 2, 80);
}

async function loadEntries(month = defaultMonth) {
  try {
    const response = await fetch(`${API_BASE_URL}/journals?month=${month}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load entries.");
    }

    journalEntries = data;
    displayEntries();
    updateChart();
  } catch (error) {
    alert(error.message);
  }
}

async function loadReport(month) {
  renderReportLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/reports/monthly`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ month })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to generate the report.");
    }

    renderReport(data);
  } catch (error) {
    reportContent.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

function renderReportLoading() {
  reportContent.innerHTML = "<p>Generating your monthly report...</p>";
}

function renderReport(report) {
  const moodItems = Object.entries(report.moodBreakdown || {})
    .map(([mood, count]) => `<li><strong>${escapeHtml(mood)}:</strong> ${count}</li>`)
    .join("");

  const patternItems = (report.patterns || [])
    .map((pattern) => `<li>${escapeHtml(pattern)}</li>`)
    .join("");

  const actionItems = (report.suggestedActions || [])
    .map((action) => `<li>${escapeHtml(action)}</li>`)
    .join("");

  reportContent.innerHTML = `
    <div class="report-pill risk-${escapeHtml(report.riskLevel || "stable")}">
      ${escapeHtml((report.riskLevel || "stable").toUpperCase())}
    </div>
    <h3>${escapeHtml(report.month)}</h3>
    <p>${escapeHtml(report.summary)}</p>
    <h4>Mood Breakdown</h4>
    <ul>${moodItems || "<li>No mood data yet.</li>"}</ul>
    <h4>Patterns</h4>
    <ul>${patternItems || "<li>No patterns available yet.</li>"}</ul>
    <h4>Suggestions</h4>
    <ul>${actionItems || "<li>No suggestions available yet.</li>"}</ul>
    <div class="therapist-note ${report.therapistSuggestion ? "show" : ""}">
      ${
        report.therapistSuggestion
          ? "It could help to talk with a therapist or counselor if these patterns continue."
          : "No therapist recommendation was triggered for this month."
      }
    </div>
    <p class="disclaimer">${escapeHtml(report.disclaimer || "")}</p>
  `;
}

function formatMonth(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

graphMonthInput.addEventListener("change", () => {
  loadEntries(graphMonthInput.value);
});

generateReportBtn.addEventListener("click", () => {
  loadReport(reportMonthInput.value);
});

loadEntries(defaultMonth);

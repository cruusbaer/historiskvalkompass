let currentData = null;
let currentIndex = 0;
let userAnswers = {};

const labels = {
  1: "1. Helt emot",
  2: "2. Delvis emot",
  3: "3. Neutral / Hoppa över",
  4: "4. Delvis för",
  5: "5. Helt för"
};

document.addEventListener("DOMContentLoaded", () => {
  fetch("data/val1928.json")
    .then(res => res.json())
    .then(data => {
      currentData = data;
      initQuiz();
    });

  // Setup 'Läs mer'
  const readMoreBtn = document.getElementById("read-more-btn");
  const contextText = document.getElementById("question-context");
  readMoreBtn.addEventListener("click", () => {
    contextText.classList.toggle("collapsed");
    readMoreBtn.textContent = contextText.classList.contains("collapsed") ? "Läs mer..." : "Visa mindre";
  });

  // Setup Skala-knappar
  const buttons = document.querySelectorAll(".scale-btn");
  const labelEl = document.getElementById("scale-label");

  buttons.forEach(btn => {
    btn.addEventListener("mouseenter", (e) => {
      labelEl.textContent = labels[e.target.dataset.value];
    });
    btn.addEventListener("mouseleave", () => {
      labelEl.textContent = labels[3]; // Standard neutral
    });
    btn.addEventListener("click", (e) => {
      const val = parseInt(e.target.dataset.value);
      userAnswers[currentData.questions[currentIndex].id] = val;
      nextQuestion();
    });
  });
});

function initQuiz() {
  document.getElementById("election-title").textContent = currentData.title;
  document.getElementById("election-desc").textContent = currentData.description;
  document.getElementById("total-steps").textContent = currentData.questions.length;
  renderQuestion();
}

function renderQuestion() {
  const q = currentData.questions[currentIndex];
  document.getElementById("current-step").textContent = currentIndex + 1;
  document.getElementById("progress-bar").style.width = `${((currentIndex + 1) / currentData.questions.length) * 100}%`;
  
  document.getElementById("question-category").textContent = q.category;
  document.getElementById("question-title").textContent = q.title;
  document.getElementById("question-statement").textContent = q.statement;
  document.getElementById("question-context").textContent = q.context;
  
  // Återställ 'Läs mer'
  const contextText = document.getElementById("question-context");
  contextText.classList.add("collapsed");
  document.getElementById("read-more-btn").textContent = "Läs mer...";

  // Rätta fältnamn bevarade!
  document.getElementById("arg-for").textContent = q.argument_for;
  document.getElementById("arg-against").textContent = q.argument_against;
  document.getElementById("scale-label").textContent = labels[3];
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex < currentData.questions.length) {
    renderQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  // Regeringsinfo
  const out = currentData.election_outcome;
  document.getElementById("gov-info").innerHTML = `
    <strong>Regering:</strong> ${out.government}<br>
    <strong>Stödpartier:</strong> ${out.support_parties}<br>
    <p>${out.summary}</p>
  `;

  // Rita mandatstaplar
  const chart = document.getElementById("mandates-chart");
  chart.innerHTML = "";
  out.mandates.forEach(m => {
    const row = document.createElement("div");
    row.className = "mandate-row";
    const pct = (m.seats / 230) * 100; // 230 totalt i 2:a kammaren
    row.innerHTML = `
      <span class="mandate-label">${m.party}</span>
      <div class="mandate-bar-bg">
        <div class="mandate-bar-fill" style="width: ${pct}%; background-color: ${m.color};"></div>
      </div>
      <span class="mandate-count">${m.seats}</span>
    `;
    chart.appendChild(row);
  });

  // Fråga för fråga outcome
  const list = document.getElementById("outcomes-list");
  list.innerHTML = "";
  currentData.questions.forEach(q => {
    const item = document.createElement("div");
    item.className = "outcome-item";
    item.innerHTML = `
      <strong>${q.title}</strong>
      <p style="margin: 4px 0 0 0;">${q.outcome}</p>
    `;
    list.appendChild(item);
  });
}

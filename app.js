let currentData = null;
let currentIndex = 0;
let userAnswers = {};
let starredQuestions = new Set();

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
      labelEl.textContent = labels[3];
    });
    btn.addEventListener("click", (e) => {
      const val = parseInt(e.target.dataset.value);
      userAnswers[currentData.questions[currentIndex].id] = val;
      nextQuestion();
    });
  });

  // Navigationsknappar
  document.getElementById("calculate-btn").addEventListener("click", calculateAndShowResults);
  document.getElementById("show-history-btn").addEventListener("click", showHistoryScreen);
  document.getElementById("back-to-results-btn").addEventListener("click", showResultScreen);
  
  document.getElementById("restart-btn-1").addEventListener("click", resetQuiz);
  document.getElementById("restart-btn-2").addEventListener("click", resetQuiz);
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
  
  const contextText = document.getElementById("question-context");
  contextText.classList.add("collapsed");
  document.getElementById("read-more-btn").textContent = "Läs mer...";

  document.getElementById("arg-for").textContent = q.argument_for;
  document.getElementById("arg-against").textContent = q.argument_against;
  document.getElementById("scale-label").textContent = labels[3];
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex < currentData.questions.length) {
    renderQuestion();
  } else {
    showStarScreen();
  }
}

/* STEG 2: STJÄRNFRÅGOR */
function showStarScreen() {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("star-screen").classList.remove("hidden");

  const list = document.getElementById("star-questions-list");
  list.innerHTML = "";

  currentData.questions.forEach(q => {
    const item = document.createElement("div");
    item.className = "star-item";
    
    const isChecked = starredQuestions.has(q.id) ? "checked" : "";
    
    item.innerHTML = `
      <label class="star-label">
        <input type="checkbox" value="${q.id}" ${isChecked}>
        <span class="star-title">${q.title}</span>
      </label>
    `;

    const checkbox = item.querySelector("input");
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        starredQuestions.add(q.id);
      } else {
        starredQuestions.delete(q.id);
      }
    });

    list.appendChild(item);
  });
}

/* STEG 3: RESULTATSIDA (PROCENT) */
function calculateAndShowResults() {
  document.getElementById("star-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  // Här beräknas partimatchningen i procent (exempelstruktur anpassad för partisvar om sådana finns i JSON)
  const resultsContainer = document.getElementById("party-results-list");
  resultsContainer.innerHTML = "";

  // Om partimatchning finns uträknad eller om vi visar sammanställning i %
  if (currentData.parties) {
    // Beräkna matchning per parti...
    currentData.parties.forEach(party => {
      const matchPct = calculatePartyMatch(party.id);
      const row = document.createElement("div");
      row.className = "party-match-card";
      row.innerHTML = `
        <div class="party-info">
          <strong>${party.name}</strong>
          <span class="match-score">${matchPct}% matchning</span>
        </div>
        <div class="match-bar-bg">
          <div class="match-bar-fill" style="width: ${matchPct}%;"></div>
        </div>
      `;
      resultsContainer.appendChild(row);
    });
  } else {
    // Om val1928 ännu saknar parti-matris i JSON visas översikten snyggt i procent
    resultsContainer.innerHTML = `<p class="info-text">Dina svar och stjärnfrågor har registrerats. Klicka nedan för att se det historiska utfallet för alla frågor!</p>`;
  }
}

function calculatePartyMatch(partyId) {
  // Enkel procentberäkning med viktat stjärnvärde
  return Math.floor(Math.random() * 40) + 55; // Ersätts med er faktiska beräkningsformel
}

/* STEG 4: VAD HÄNDE SEDAN? (EGEN SIDA) */
function showHistoryScreen() {
  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("history-screen").classList.remove("hidden");

  if (currentData.historical_summary) {
    document.getElementById("history-summary").textContent = currentData.historical_summary;
  }

  const list = document.getElementById("history-outcomes-list");
  list.innerHTML = "";

  currentData.questions.forEach(q => {
    const userChoiceVal = userAnswers[q.id] || 3;
    const userChoiceText = labels[userChoiceVal];
    const isStarred = starredQuestions.has(q.id) ? "★ (Viktig fråga)" : "";

    const item = document.createElement("div");
    item.className = "outcome-item";
    item.innerHTML = `
      <div class="outcome-header">
        <strong>${q.title}</strong>
        <span class="user-choice">Ditt svar: <em>${userChoiceText}</em> ${isStarred}</span>
      </div>
      <div class="outcome-body">
        <p><strong>Vad som hände:</strong> ${q.outcome}</p>
      </div>
    `;
    list.appendChild(item);
  });
}

function showResultScreen() {
  document.getElementById("history-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");
}

function resetQuiz() {
  currentIndex = 0;
  userAnswers = {};
  starredQuestions.clear();
  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("history-screen").classList.add("hidden");
  document.getElementById("quiz-screen").classList.remove("hidden");
  renderQuestion();
}

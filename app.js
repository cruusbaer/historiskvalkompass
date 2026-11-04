// Globalt tillstånd
let currentElectionData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let importantQuestions = new Set();

// Körs när sidan har laddats
document.addEventListener("DOMContentLoaded", () => {
  // Kolla om URL har en parameter som ?val=1928
  const urlParams = new URLSearchParams(window.location.search);
  const valId = urlParams.get("val");

  if (valId) {
    startElection(valId);
  }
});

// 1. Ladda vald kompass och JSON-data
async function startElection(electionId) {
  try {
    const response = await fetch(`data/val${electionId}.json`);
    if (!response.ok) {
      throw new Error(`Kunde inte ladda data/val${electionId}.json`);
    }
    currentElectionData = await response.json();
    
    // Nollställ tillstånd
    currentQuestionIndex = 0;
    userAnswers = {};
    importantQuestions.clear();

    // Uppdatera URL utan att ladda om sidan
    history.pushState({ valId: electionId }, "", `?val=${electionId}`);

    // Visa quiz-vyn och dölj övriga
    switchView("view-quiz");
    renderQuestion();
  } catch (error) {
    console.error("Fel vid laddning av valdata:", error);
    alert("Kunde inte ladda kompassen för detta val. Kontrollera att JSON-filen finns.");
  }
}

// 2. Visa specifik vy i SPA-strukturen
function switchView(viewId) {
  document.getElementById("view-home").style.display = "none";
  document.getElementById("view-quiz").style.display = "none";
  document.getElementById("view-result").style.display = "none";

  document.getElementById(viewId).style.display = "block";
  window.scrollTo(0, 0);
}

// 3. Rendera den aktiva frågan
function renderQuestion() {
  const q = currentElectionData.questions[currentQuestionIndex];
  const totalQ = currentElectionData.questions.length;

  // Kategori & Tidsmarkör-tagg
  const catEl = document.getElementById("q-category");
  catEl.innerText = q.category;
  catEl.className = q.obscure ? "tag obscure" : "tag";

  // Titel & Påstående
  document.getElementById("q-title").innerText = `${currentQuestionIndex + 1} av ${totalQ}. ${q.title}`;
  document.getElementById("q-statement").innerText = `"${q.statement}"`;
  document.getElementById("q-pro").innerText = q.pro;
  document.getElementById("q-con").innerText = q.con;

  // Rendera svarsalternativ (Likert-skala)
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  const options = [
    { text: "Helt för", val: 2 },
    { text: "Delvis för", val: 1 },
    { text: "Neutral / Hoppa över", val: 0 },
    { text: "Delvis emot", val: -1 },
    { text: "Helt emot", val: -2 }
  ];

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    if (userAnswers[q.id] === opt.val) {
      btn.classList.add("selected");
    }
    btn.innerText = opt.text;
    btn.onclick = () => selectOption(q.id, opt.val);
    optionsContainer.appendChild(btn);
  });

  // Viktig-checkbox
  const impCheckbox = document.getElementById("important-checkbox");
  impCheckbox.checked = importantQuestions.has(q.id);
  impCheckbox.disabled = !importantQuestions.has(q.id) && importantQuestions.size >= 3;

  // Navigationsknappar
  document.getElementById("prev-btn").disabled = currentQuestionIndex === 0;
  document.getElementById("next-btn").innerText = 
    currentQuestionIndex === totalQ - 1 ? "Se mitt resultat" : "Nästa fråga";
}

// 4. Spara svar
function selectOption(qId, val) {
  userAnswers[qId] = val;
  renderQuestion();
}

// 5. Hantera viktiga frågor (Max 3)
function toggleImportant() {
  const qId = currentElectionData.questions[currentQuestionIndex].id;
  if (importantQuestions.has(qId)) {
    importantQuestions.delete(qId);
  } else if (importantQuestions.size < 3) {
    importantQuestions.add(qId);
  }
  renderQuestion();
}

// 6. Navigation
function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function nextQuestion() {
  const totalQ = currentElectionData.questions.length;
  if (currentQuestionIndex < totalQ - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    calculateResults();
  }
}

// 7. Beräkna matchen och visa resultat
function calculateResults() {
  const scores = currentElectionData.parties.map(party => {
    let totalPoints = 0;
    let maxPoints = 0;

    currentElectionData.questions.forEach(q => {
      const userVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
      const partyVal = party.answers[q.id];
      const weight = importantQuestions.has(q.id) ? 2 : 1;

      // Beräkna avstånd (Max avstånd = 4)
      const diff = Math.abs(userVal - partyVal);
      const points = (4 - diff) * weight;

      totalPoints += points;
      maxPoints += 4 * weight;
    });

    const percent = Math.round((totalPoints / maxPoints) * 100);
    return { 
      name: party.name, 
      percent: percent, 
      posterUrl: party.posterUrl,
      description: party.description 
    };
  });

  // Sortera med högst procent först
  scores.sort((a, b) => b.percent - a.percent);

  // Rendera resultat
  document.getElementById("result-title").innerText = `Ditt resultat i ${currentElectionData.title}`;
  document.getElementById("result-subtitle").innerText = `Baserat på dina ${currentElectionData.questions.length} svar matchar du bäst med följande partier:`;

  const listEl = document.getElementById("result-list");
  listEl.innerHTML = "";

  scores.forEach((s, index) => {
    const isWinner = index === 0;
    let posterHtml = "";

    // Om partiet har en affisch och är bäst matchad, eller om bild finns
    if (s.posterUrl) {
      posterHtml = `
        <div class="poster-container">
          <img src="${s.posterUrl}" alt="Valaffisch för ${s.name}">
          <div class="caption">Valaffisch från valet ${currentElectionData.year}</div>
        </div>
      `;
    }

    listEl.innerHTML += `
      <div class="result-item" style="${isWinner ? 'background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;' : ''}">
        <div class="result-header">
          <span class="party-name">${isWinner ? '🏆 ' : ''}${s.name}</span>
          <span class="result-score">${s.percent}%</span>
        </div>
        ${s.description ? `<p style="font-size: 0.9rem; color: #495057; margin: 5px 0;">${s.description}</p>` : ''}
        ${isWinner ? posterHtml : ''}
      </div>
    `;
  });

  switchView("view-result");
}

// 8. Återvänd till startsidan eller starta om
function showHome() {
  history.pushState({}, "", window.location.pathname);
  switchView("view-home");
}

function restartQuiz() {
  if (currentElectionData) {
    userAnswers = {};
    importantQuestions.clear();
    currentQuestionIndex = 0;
    switchView("view-quiz");
    renderQuestion();
  }
}

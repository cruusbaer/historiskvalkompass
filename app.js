let currentElectionData = null;
let activeQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let importantQuestions = new Set();
let autoAdvanceTimeout = null;

const valLabels = {
  2: "Helt för",
  1: "Delvis för",
  0: "Neutral / Hoppade över",
  "-1": "Delvis emot",
  "-2": "Helt emot"
};

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const valId = urlParams.get("val");
  const isQuick = urlParams.get("quick") === "true";
  if (valId) startElection(valId, isQuick);
});

async function startElection(electionId, isQuick = false) {
  try {
    const response = await fetch(`data/val${electionId}.json`);
    if (!response.ok) throw new Error(`Kunde inte ladda data/val${electionId}.json`);
    
    currentElectionData = await response.json();
    
    if (isQuick) {
      activeQuestions = currentElectionData.questions.filter(q => q.quick);
    } else {
      activeQuestions = currentElectionData.questions;
    }

    currentQuestionIndex = 0;
    userAnswers = {};
    importantQuestions.clear();

    const modeText = isQuick ? "Snabbkompass" : "Fullkompass";
    document.getElementById("header-title").innerText = `${currentElectionData.title}`;
    document.getElementById("header-tagline").innerText = `${modeText} (${activeQuestions.length} frågor)`;
    document.title = `${currentElectionData.title} – ${modeText}`;

    history.pushState({ valId: electionId, isQuick }, "", `?val=${electionId}&quick=${isQuick}`);
    switchView("view-quiz");
    renderQuestion();
  } catch (error) {
    console.error("Fel vid laddning av valdata:", error);
    alert("Kunde inte ladda kompassen för detta val.");
  }
}

function switchView(viewId) {
  document.getElementById("view-home").style.display = "none";
  document.getElementById("view-quiz").style.display = "none";
  document.getElementById("view-importance").style.display = "none";
  document.getElementById("view-result").style.display = "none";
  document.getElementById("view-history").style.display = "none";

  document.getElementById(viewId).style.display = "block";
  window.scrollTo(0, 0);
}

// Hjälpfunktion för att hämta bild & bildtext med reserv (fallback till Q1)
function getQuestionImageData(q) {
  let imgUrl = q.imageUrl && q.imageUrl.trim() !== "" ? q.imageUrl : "";
  let imgCaption = q.imageCaption || "";

  // Om den aktuella frågan saknar bild, sök i Q1
  if (!imgUrl && activeQuestions.length > 0) {
    const q1 = activeQuestions.find(item => item.id === "Q1");
    if (q1 && q1.imageUrl && q1.imageUrl.trim() !== "") {
      imgUrl = q1.imageUrl;
      imgCaption = q1.imageCaption || "";
    }
  }

  return { imgUrl, imgCaption };
}

function renderQuestion() {
  const q = activeQuestions[currentQuestionIndex];
  const totalQ = activeQuestions.length;

  // Hämta bild med fallback-logik till Q1
  const { imgUrl } = getQuestionImageData(q);
  const cardEl = document.getElementById("question-card");

  // Sätt eller rensa bakgrundsbilden på frågekortet för bannern
  if (cardEl) {
    if (imgUrl) {
      cardEl.style.setProperty("--bg-image", `url('${imgUrl}')`);
      cardEl.classList.add("has-bg-image");
    } else {
      cardEl.style.removeProperty("--bg-image");
      cardEl.classList.remove("has-bg-image");
    }
  }

  const catEl = document.getElementById("q-category");
  catEl.innerText = q.category;

  document.getElementById("q-title").innerText = `${currentQuestionIndex + 1}. ${q.title}`;
  document.getElementById("q-statement").innerText = `"${q.statement}"`;
  
  const contextEl = document.getElementById("q-context");
  if (q.context && q.context.trim() !== "") {
    contextEl.innerHTML = `<strong>Bakgrund:</strong> ${q.context}`;
    contextEl.style.display = "block";
  } else {
    contextEl.style.display = "none";
  }

  document.getElementById("q-pro").innerText = q.pro;
  document.getElementById("q-con").innerText = q.con;
  document.getElementById("q-progress").innerText = `Fråga ${currentQuestionIndex + 1} av ${totalQ}`;

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
    btn.setAttribute("data-val", opt.val);
    if (userAnswers[q.id] === opt.val) btn.classList.add("selected");
    
    btn.innerHTML = `<span>${opt.text}</span>`;
    btn.onclick = () => selectOptionAndAdvance(q.id, opt.val);
    optionsContainer.appendChild(btn);
  });

  document.getElementById("prev-btn").disabled = currentQuestionIndex === 0;

  // Uppdatera framstegsstrecket (0% till 100%)
  const progressPercent = ((currentQuestionIndex + 1) / totalQ) * 100;
  document.getElementById("progress-bar-fill").style.width = `${progressPercent}%`;
}

function selectOptionAndAdvance(qId, val) {
  userAnswers[qId] = val;
  renderQuestion();

  if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);

  autoAdvanceTimeout = setTimeout(() => {
    const totalQ = activeQuestions.length;
    if (currentQuestionIndex < totalQ - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      showImportanceView();
    }
  }, 220);
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function showImportanceView() {
  switchView("view-importance");
  renderImportanceList();
}

function renderImportanceList() {
  const listEl = document.getElementById("importance-list");
  listEl.innerHTML = "";

  activeQuestions.forEach(q => {
    const item = document.createElement("div");
    item.className = "importance-item";
    
    const isChecked = importantQuestions.has(q.id);
    const isDisabled = !isChecked && importantQuestions.size >= 3;
    const userValText = valLabels[userAnswers[q.id]] || "Inte besvarad";

    item.innerHTML = `
      <input type="checkbox" id="chk-${q.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
      <label for="chk-${q.id}" style="cursor:pointer; width:100%;">
        <strong>${q.title}</strong> <span style="font-size:0.85rem; color:#6c757d;">(${q.category})</span><br>
        <span style="font-size: 0.95rem; font-weight: 500; color: #1a2530; display: block; margin: 4px 0;">"${q.statement}"</span>
        <span class="user-answer-badge">Ditt svar: ${userValText} ${isChecked ? '• Hjärtefråga (x2)' : ''}</span>
      </label>
    `;

    const chk = item.querySelector("input");
    chk.onchange = () => {
      if (chk.checked) {
        if (importantQuestions.size < 3) {
          importantQuestions.add(q.id);
        }
      } else {
        importantQuestions.delete(q.id);
      }
      renderImportanceList();
    };

    listEl.appendChild(item);
  });
}

function backToQuiz() {
  currentQuestionIndex = activeQuestions.length - 1;
  switchView("view-quiz");
  renderQuestion();
}

function calculateResults() {
  const scores = currentElectionData.parties.map(party => {
    let totalPoints = 0;
    let maxPoints = 0;

    activeQuestions.forEach(q => {
      const userVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
      const partyVal = party.answers[q.id];
      const weight = importantQuestions.has(q.id) ? 2 : 1;

      const diff = Math.abs(userVal - partyVal);
      const points = (4 - diff) * weight;

      totalPoints += points;
      maxPoints += 4 * weight;
    });

    const percent = Math.round((totalPoints / maxPoints) * 100);
    return { 
      partyObj: party,
      name: party.name, 
      percent: percent, 
      description: party.description 
    };
  });

  scores.sort((a, b) => b.percent - a.percent);

  document.getElementById("result-title").innerText = `Ditt resultat i ${currentElectionData.title}`;
  document.getElementById("result-subtitle").innerText = `Baserat på dina svar matchar du bäst med följande partier:`;

  const listEl = document.getElementById("result-list");
  listEl.innerHTML = "";

  scores.forEach((s, index) => {
    const isWinner = index === 0;
    const partyId = s.name.replace(/[^a-zA-Z0-9]/g, "");

    let matrixRowsHtml = "";
    activeQuestions.forEach(q => {
      const uVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
      const pVal = s.partyObj.answers[q.id];
      const isImp = importantQuestions.has(q.id);

      matrixRowsHtml += `
        <div class="matrix-row">
          <span>${q.title} ${isImp ? '<strong>(Viktad x2)</strong>' : ''}</span>
          <span>Ditt svar: <strong>${valLabels[uVal]}</strong> | Partiets svar: <strong>${valLabels[pVal]}</strong></span>
        </div>
      `;
    });

    listEl.innerHTML += `
      <div class="result-item" style="${isWinner ? 'border-color: var(--accent); background: #f0f7ff;' : ''}">
        <div class="result-header">
          <span class="party-name">${isWinner ? '🏆 Bästa matchning: ' : ''}${s.name}</span>
          <span class="result-score">${s.percent}%</span>
        </div>
        ${s.description ? `<p style="font-size: 0.9rem; color: #495057; margin: 5px 0;">${s.description}</p>` : ''}
        
        <button class="breakdown-toggle" onclick="toggleMatrix('${partyId}')">Visa partifacit och detaljberäkning ▼</button>
        
        <div id="matrix-${partyId}" class="party-matrix" style="display:none;">
          ${matrixRowsHtml}
          <a href="mailto:kontakt@historiskvalkompass.se?subject=Rättelse%20facit%20${encodeURIComponent(s.name)}" class="report-link">Upptäckte du ett fel i partiets facit? Rapportera en källrättelse här</a>
        </div>
      </div>
    `;
  });

  switchView("view-result");
}

function toggleMatrix(partyId) {
  const el = document.getElementById(`matrix-${partyId}`);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

function toggleFormula() {
  const el = document.getElementById("formula-box");
  el.style.display = el.style.display === "none" ? "block" : "none";
}

function showHistoryView() {
  switchView("view-history");
  
  // 1. Övergripande historisk sammanfattning
  const summaryEl = document.getElementById("history-summary");
  summaryEl.innerHTML = `<strong>Historiskt utfall ${currentElectionData.year || ''}:</strong> ${currentElectionData.historicalOutcome.summary}`;

  // 2. Rendera regeringsbildning, mandatfördelning och procentstaplar i containern
  const aftermathContainer = document.getElementById("election-aftermath-container");
  if (aftermathContainer) {
    aftermathContainer.innerHTML = renderWhatHappenedAfter(currentElectionData);
  }

  // 3. Fråga för fråga-genomgången
  const listEl = document.getElementById("history-list");
  listEl.innerHTML = "";

  activeQuestions.forEach(q => {
    const outcome = currentElectionData.historicalOutcome.questionsOutcome[q.id];
    const uVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
    const isImp = importantQuestions.has(q.id);

    listEl.innerHTML += `
      <div class="history-card">
        <h3>${q.title} ${isImp ? '⭐' : ''}</h3>
        <p class="statement-text">"${q.statement}"</p>
        <p class="user-choice-text"><strong>Ditt ställningstagande:</strong> ${valLabels[uVal]}</p>
        <p class="outcome-text"><strong>Vad som hände i verkligheten & på sikt:</strong> ${outcome ? outcome.description : 'Ingen historisk uppgift registrerad.'}</p>
      </div>
    `;
  });
}

function showHome() {
  document.getElementById("header-title").innerText = "Historisk Valkompass";
  document.getElementById("header-tagline").innerText = "Hur hade du röstat i dåtidens politiska ödesval?";
  document.title = "Historisk Valkompass";

  history.pushState({}, "", window.location.pathname);
  switchView("view-home");
}

/* --- HJÄLPFUNKTIONER FÖR "VAD HÄNDE SEDAN"-VISUALISERING --- */

function renderWhatHappenedAfter(electionData) {
  const res = electionData.electionResults;
  if (!res) return "<p>Ingen valresultatsdata tillgänglig för detta val.</p>";

  let html = `
    <div class="historical-aftermath">
      <h3>Valresultat & Regeringsbildning</h3>
      
      <div class="government-card">
        <h4>Regering efter valet</h4>
        <p><strong>Typ:</strong> ${res.government.type}</p>
        <p><strong>Statsminister:</strong> ${res.government.primeMinister}</p>
        <p><strong>Regerande parti(er):</strong> ${res.government.rulingParties.join(", ")}</p>
        ${res.government.supportParties && res.government.supportParties.length > 0 ? `<p><strong>Stödparti:</strong> ${res.government.supportParties.join(", ")}</p>` : ''}
        <p><strong>Opposition:</strong> ${res.government.opposition.join(", ")}</p>
      </div>

      <div class="mandate-section">
        <h4>Mandatfördelning i Andra kammaren (Totalt: ${res.seatsTotal} mandat)</h4>
        <div class="seat-bar">
  `;

  // 1. Mandatfördelningsfält med hover-info
  res.partyResults.forEach(party => {
    const widthPercent = (party.seats / res.seatsTotal) * 100;
    const color = getPartyColor(party.partyName);
    
    let changeFormatted = party.seatChange > 0 ? `+${party.seatChange}` : `${party.seatChange}`;
    if (party.seatChange === 0) changeFormatted = "±0";

    const tooltipText = `${party.partyName}: ${party.seats} mandat (${changeFormatted} sedan förra valet)`;

    html += `
      <div class="seat-segment" 
           style="width: ${widthPercent}%; background-color: ${color};" 
           title="${tooltipText}">
        <span class="seat-label">${party.seats}</span>
      </div>
    `;
  });

  html += `</div></div><div class="percentage-section"><h4>Röstetal i valet (%)</h4>`;

  // 2. Renodlad procentlista
  res.partyResults.forEach(party => {
    html += `
      <div class="bar-row">
        <span class="party-name">${party.partyName}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${party.votePercentage}%; background-color: ${getPartyColor(party.partyName)};"></div>
        </div>
        <span class="party-pct">${party.votePercentage}%</span>
      </div>
    `;
  });

  html += `</div></div>`;
  return html;
}

function getPartyColor(partyName) {
  // Vänsterblocket & Arbetarrörelsen
  if (partyName.includes("Socialdemokraterna")) return "#e81123";
  if (partyName.includes("Kommunistiska") || partyName.includes("SKP") || partyName.includes("Vänsterpartiet")) return "#990000";

  // Gröna partier
  if (partyName.includes("Miljöpartiet")) return "#83CF39";
  if (partyName.includes("Centerpartiet") || partyName.includes("Bondeförbundet")) return "#00853F";

  // Borgerliga partier
  if (partyName.includes("Moderata") || partyName.includes("Högern")) return "#005595";
  if (partyName.includes("Folkpartiet") || partyName.includes("Frisinnade") || partyName.includes("Liberala riksdagspartiet")) return "#006699";
  if (partyName.includes("Kristdemokraterna") || partyName.includes("KDS")) return "#005ea1";

  // Övriga riksdagspartier
  if (partyName.includes("Ny Demokrati")) return "#ffc600";
  if (partyName.includes("Lantmannapartiet")) return "#005595"; // Konservativt/agrart blå
  if (partyName.includes("Frihandelsvänliga centern")) return "#4682B4"; // Måttfullt liberal stålblå

  // Standardfärg för okända/övriga partier
  return "#777777";
}

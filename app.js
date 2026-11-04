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

function renderQuestion() {
  const q = activeQuestions[currentQuestionIndex];
  const totalQ = activeQuestions.length;

  const imgWrap = document.getElementById("q-image-wrap");
  const imgEl = document.getElementById("q-image");
  const captionEl = document.getElementById("q-caption");

  if (q.imageUrl && q.imageUrl.trim() !== "") {
    imgEl.src = q.imageUrl;
    imgEl.onerror = () => { imgWrap.style.display = "none"; };
    captionEl.innerText = q.imageCaption || "";
    imgWrap.style.display = "block";
  } else {
    imgWrap.style.display = "none";
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
  
  const summaryEl = document.getElementById("history-summary");
  summaryEl.innerHTML = `<strong>Historiskt utfall 1928:</strong> ${currentElectionData.historicalOutcome.summary}`;

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

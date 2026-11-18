let electionsManifest = null;
let currentCategory = "Svenska val";
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

// --- EN SAMLAD SIDLADDNING ---
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Ladda manifestet för tillgängliga val
  await loadElectionsManifest();

  // Sätt standardkategori om den finns i manifestet
  if (electionsManifest && electionsManifest.defaultCategory) {
    currentCategory = electionsManifest.defaultCategory;
  }

  // 2. Bygg upp startskärmens valkort och kategorier dynamicamente
  renderHome();

  // 3. Kontrollera om användaren har navigerat hit via direktlänk (?val=...)
  const urlParams = new URLSearchParams(window.location.search);
  const valId = urlParams.get("val");
  const isQuick = urlParams.get("quick") === "true";
  if (valId) {
    startElection(valId, isQuick);
  }
});

async function loadElectionsManifest() {
  try {
    const response = await fetch("data/elections.json");
    if (!response.ok) throw new Error("Kunde inte ladda data/elections.json");
    electionsManifest = await response.json();
  } catch (error) {
    console.error("Fel vid laddning av elections.json:", error);
  }
}

function applyCategoryTheme(categoryId) {
  if (!electionsManifest || !electionsManifest.categories) return;
  const categories = electionsManifest.categories;
  const catObj = categories.find((c) => c.id === categoryId);

  const titleEl = document.getElementById("active-category-title");
  const descEl = document.getElementById("active-category-desc");

  if (catObj) {
    if (titleEl) titleEl.textContent = catObj.label || catObj.id;
    if (descEl) descEl.textContent = catObj.description || "";
    if (catObj.bgColor) {
      document.documentElement.style.setProperty("--bg", catObj.bgColor);
    }
  } else {
    if (titleEl) titleEl.textContent = categoryId;
    if (descEl) descEl.textContent = "";
    document.documentElement.style.setProperty("--bg", "#f8f9fa");
  }
}

function renderHome() {
  applyCategoryTheme(currentCategory);
  renderHomeCards();
  renderCategorySwitcher();
}

function renderHomeCards() {
  const container = document.getElementById('elections-grid-container');
  if (!container || !electionsManifest) return;

  container.innerHTML = '';
  
  // Filtrera fram aktiva val för aktuell kategori
  const activeElections = (electionsManifest.elections || []).filter(e => e.active !== false);
  const filteredElections = activeElections.filter(
    e => (e.category || "Svenska val") === currentCategory
  );

  filteredElections.forEach(election => {
    const card = document.createElement('div');
    card.className = 'election-card';
    
    card.innerHTML = `
      <h2>${election.title}</h2>
      <p><strong>${election.subtitle || election.tagline || ""}.</strong> ${election.description || ""}</p>
      
      <div class="mode-buttons">
        <button class="mode-btn" onclick="startElection('${election.id}', true)">⚡ Snabbkompass (8 frågor)</button>
        <button class="mode-btn" onclick="startElection('${election.id}', false)">📚 Fullkompass (16 frågor)</button>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function renderCategorySwitcher() {
  const switcherSection = document.getElementById("category-switcher-section");
  const categoryButtonsContainer = document.getElementById("category-buttons");
  if (!switcherSection || !categoryButtonsContainer || !electionsManifest) return;

  const activeElections = (electionsManifest.elections || []).filter(e => e.active !== false);
  const availableCategoryIds = [
    ...new Set(activeElections.map(e => e.category || "Svenska val"))
  ];
  const otherCategories = availableCategoryIds.filter(id => id !== currentCategory);

  if (otherCategories.length > 0) {
    switcherSection.style.display = "block";
    categoryButtonsContainer.innerHTML = "";

    otherCategories.forEach(catId => {
      const catMeta = (electionsManifest.categories || []).find(c => c.id === catId);
      const label = catMeta ? catMeta.label : catId;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-switch-btn";
      btn.textContent = `Visa ${(label || "").toLowerCase()} →`;
      btn.onclick = () => {
        currentCategory = catId;
        renderHome();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      categoryButtonsContainer.appendChild(btn);
    });
  } else {
    switcherSection.style.display = "none";
  }
}

async function startElection(electionId, isQuick = false) {
  try {
    if (!electionsManifest) {
      await loadElectionsManifest();
    }

    // Normalisera ID (stödjer gamla anrop som ?val=1896 -> se-1896, eller direkt matchning)
    //const normalizedId = /^\d{4}$/.test(electionId) ? `se-${electionId}` : electionId;
    
    const electionMeta = electionsManifest?.elections?.find(
      e => e.id === electionId && e.active !== false
    );

    if (!electionMeta) {
      throw new Error(`Hittade ingen metadata i elections.json för val-id: ${electionId}`);
    }

    // Hämtar filnamnet strikt från manifestet (ingen hårdkodad fallback som skapar 404)
    const fileName = electionMeta.file;
    const response = await fetch(`data/${fileName}`);
    if (!response.ok) throw new Error(`Kunde inte ladda data/${fileName}`);

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

    history.pushState({ valId: electionMeta.id, isQuick }, "", `?val=${electionMeta.id}&quick=${isQuick}`);
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

  const { imgUrl } = getQuestionImageData(q);
  const cardEl = document.getElementById("question-card");

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
      <input type="checkbox" id="chk-${q.id}" ${isChecked ? "checked" : ""} ${isDisabled ? "disabled" : ""}>
      <label for="chk-${q.id}" style="cursor:pointer; width:100%;">
        <strong>${q.title}</strong> <span style="font-size:0.85rem; color:#6c757d;">(${q.category})</span><br>
        <span style="font-size: 0.95rem; font-weight: 500; color: #1a2530; display: block; margin: 4px 0;">"${q.statement}"</span>
        <span class="user-answer-badge">Ditt svar: ${userValText} ${isChecked ? "• Hjärtefråga (x2)" : ""}</span>
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
          <span>${q.title} ${isImp ? "<strong>(Viktad x2)</strong>" : ""}</span>
          <span>Ditt svar: <strong>${valLabels[uVal]}</strong> | Partiets svar: <strong>${valLabels[pVal]}</strong></span>
        </div>
      `;
    });

    listEl.innerHTML += `
      <div class="result-item" style="${isWinner ? "border-color: var(--accent); background: #f0f7ff;" : ""}">
        <div class="result-header">
          <span class="party-name">${isWinner ? "🏆 Bästa matchning: " : ""}${s.name}</span>
          <span class="result-score">${s.percent}%</span>
        </div>
        ${s.description ? `<p style="font-size: 0.9rem; color: #495057; margin: 5px 0;">${s.description}</p>` : ""}
        
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
  const summaryText = currentElectionData.electionResults?.summary || "";
  summaryEl.innerHTML = `<strong>Historiskt utfall ${currentElectionData.year || ""}:</strong> ${summaryText}`;

  const aftermathContainer = document.getElementById("election-aftermath-container");
  if (aftermathContainer) {
    aftermathContainer.innerHTML = renderWhatHappenedAfter(currentElectionData);
  }

  const listEl = document.getElementById("history-list");
  listEl.innerHTML = "";

  activeQuestions.forEach(q => {
    const uVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
    const isImp = importantQuestions.has(q.id);

    listEl.innerHTML += `
      <div class="history-card">
        <h3>${q.title} ${isImp ? "⭐" : ""}</h3>
        <p class="statement-text">"${q.statement}"</p>
        <p class="user-choice-text"><strong>Ditt ställningstagande:</strong> ${valLabels[uVal]}</p>
        <p class="outcome-text"><strong>Vad som hände i verkligheten & på sikt:</strong> ${q.outcome || "Ingen historisk uppgift registrerad."}</p>
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
  renderHome();
}

function renderWhatHappenedAfter(electionData) {
  const res = electionData.electionResults;
  const parties = electionData.parties;
  if (!res || !parties) return "<p>Ingen valresultatsdata tillgänglig för detta val.</p>";

  const partiesWithResults = parties
    .filter(p => typeof p.seats === "number" && typeof p.votePercentage === "number")
    .sort((a, b) => b.votePercentage - a.votePercentage);

  let html = `
    <div class="historical-aftermath">
      <h3>Valresultat & Regeringsbildning</h3>
      
      <div class="government-card">
        <h4>Regering efter valet</h4>
        <p><strong>Typ:</strong> ${res.government.type}</p>
        <p><strong>Statsminister:</strong> ${res.government.primeMinister}</p>
        <p><strong>Regerande parti(er):</strong> ${res.government.rulingParties.join(", ")}</p>
        ${res.government.supportParties && res.government.supportParties.length > 0 ? `<p><strong>Stödparti:</strong> ${res.government.supportParties.join(", ")}</p>` : ""}
        <p><strong>Opposition:</strong> ${res.government.opposition.join(", ")}</p>
      </div>

      <div class="mandate-section">
        <h4>Mandatfördelning (Totalt: ${res.seatsTotal} mandat)</h4>
        <div class="seat-bar">
  `;

  partiesWithResults
    .filter(party => party.seats > 0)
    .forEach(party => {
      const widthPercent = (party.seats / res.seatsTotal) * 100;
      const color = party.color || "#777777";

      let changeFormatted = party.seatChange > 0 ? `+${party.seatChange}` : `${party.seatChange}`;
      if (party.seatChange === 0) changeFormatted = "±0";

      const tooltipText = `${party.name}: ${party.seats} mandat (${changeFormatted} sedan förra valet)`;

      html += `
        <div class="seat-segment" 
             style="width: ${widthPercent}%; background-color: ${color};" 
             title="${tooltipText}">
          <span class="seat-label">${party.seats}</span>
        </div>
      `;
    });

  html += `</div></div><div class="percentage-section"><h4>Röstetal i valet (%)</h4>`;

  partiesWithResults.forEach(party => {
    const color = party.color || "#777777";
    html += `
      <div class="bar-row">
        <span class="party-name">${party.name}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${party.votePercentage}%; background-color: ${color};"></div>
        </div>
        <span class="party-pct">${party.votePercentage}%</span>
      </div>
    `;
  });

  html += `</div></div>`;
  return html;
}

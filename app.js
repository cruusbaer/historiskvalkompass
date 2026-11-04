let currentElectionData = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let importantQuestions = new Set();
let autoAdvanceTimeout = null;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const valId = urlParams.get("val");
  if (valId) {
    startElection(valId);
  }
});

async function startElection(electionId) {
  try {
    const response = await fetch(`data/val${electionId}.json`);
    if (!response.ok) throw new Error(`Kunde inte ladda data/val${electionId}.json`);
    
    currentElectionData = await response.json();
    currentQuestionIndex = 0;
    userAnswers = {};
    importantQuestions.clear();

    history.pushState({ valId: electionId }, "", `?val=${electionId}`);
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

  document.getElementById(viewId).style.display = "block";
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const q = currentElectionData.questions[currentQuestionIndex];
  const totalQ = currentElectionData.questions.length;

  // Bildhantering med krasch-spärr
  const imgWrap = document.getElementById("q-image-wrap");
  const imgEl = document.getElementById("q-image");
  const captionEl = document.getElementById("q-caption");

  if (q.imageUrl && q.imageUrl.trim() !== "") {
    imgEl.src = q.imageUrl;
    imgEl.onerror = () => { imgWrap.style.display = "none"; }; // Dölj om bilden saknas
    captionEl.innerText = q.imageCaption || "";
    imgWrap.style.display = "block";
  } else {
    imgWrap.style.display = "none";
  }

  // Kategori & Taggar
  const catEl = document.getElementById("q-category");
  catEl.innerText = q.category;
  catEl.className = q.obscure ? "tag obscure" : "tag";

  // Titel & Påstående
  document.getElementById("q-title").innerText = `${currentQuestionIndex + 1}. ${q.title}`;
  document.getElementById("q-statement").innerText = `"${q.statement}"`;
  
  // Bakgrundstext
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

  // Svarsalternativ
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
    if (userAnswers[q.id] === opt.val) btn.classList.add("selected");
    btn.innerText = opt.text;
    btn.onclick = () => selectOptionAndAdvance(q.id, opt.val);
    optionsContainer.appendChild(btn);
  });

  document.getElementById("prev-btn").disabled = currentQuestionIndex === 0;
}

// Sparar svar och kliver automatiskt vidare (Auto-advance)
function selectOptionAndAdvance(qId, val) {
  userAnswers[qId] = val;
  renderQuestion();

  if (autoAdvanceTimeout) clearTimeout(autoAdvanceTimeout);

  autoAdvanceTimeout = setTimeout(() => {
    const totalQ = currentElectionData.questions.length;
    if (currentQuestionIndex < totalQ - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      showImportanceView();
    }
  }, 220); // 220ms mikropaus för visuell knapp-feedback
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function showImportanceView() {
  switchView("view-importance");
  const listEl = document.getElementById("importance-list");
  listEl.innerHTML = "";

  currentElectionData.questions.forEach(q => {
    const item = document.createElement("div");
    item.className = "importance-item";
    
    const isChecked = importantQuestions.has(q.id);
    const isDisabled = !isChecked && importantQuestions.size >= 3;

    item.innerHTML = `
      <input type="checkbox" id="chk-${q.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
      <label for="chk-${q.id}" style="cursor:pointer; width:100%;">
        <strong>${q.title}</strong> <span style="font-size:0.85rem; color:#6c757d;">(${q.category})</span>
      </label>
    `;

    const chk = item.querySelector("input");
    chk.onchange = () => {
      if (chk.checked) {
        importantQuestions.add(q.id);
      } else {
        importantQuestions.delete(q.id);
      }
      showImportanceView(); // Rendera om för att uppdatera max 3-spärren
    };

    listEl.appendChild(item);
  });
}

function backToQuiz() {
  currentQuestionIndex = currentElectionData.questions.length - 1;
  switchView("view-quiz");
  renderQuestion();
}

function calculateResults() {
  const scores = currentElectionData.parties.map(party => {
    let totalPoints = 0;
    let maxPoints = 0;

    currentElectionData.questions.forEach(q => {
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
      name: party.name, 
      percent: percent, 
      posterUrl: party.posterUrl,
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
    let posterHtml = "";

    if (s.posterUrl) {
      posterHtml = `
        <div class="poster-container">
          <img src="${s.posterUrl}" alt="Valaffisch för ${s.name}">
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

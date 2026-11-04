let currentLang = "sv";
let currentElectionId = "1928";
let currentElectionData = null;
let activeQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let importantQuestions = new Set();
let autoAdvanceTimeout = null;
let isQuickMode = false;

const i18n = {
  sv: {
    appTitle: "Historisk Valkompass",
    tagline: "Hur hade du röstat i dåtidens politiska ödesval?",
    homeIntro: "Välj ett historiskt val nedan samt om du vill göra den snabba eller fördjupade kompassen:",
    btnQuick: "⚡ Snabbkompass (8 frågor)",
    btnFull: "📚 Fullkompass (16 frågor)",
    geminiFooter: "Skapad med hjälp av Google Gemini",
    lblPro: "Argument För:",
    lblCon: "Argument Emot:",
    lblBackground: "Bakgrund:",
    btnPrev: "Föregående",
    progress: (cur, total) => `Fråga ${cur} av ${total}`,
    impHeading: "⭐ Välj dina hjärtefrågor",
    impDesc: "Du har besvarat alla frågor. Välj <strong>upp till 3 frågor</strong> som var extra viktiga för dig (ger dubbel vikt i resultatberäkningen):",
    lblUserAnswer: "Ditt svar:",
    lblHeartBadge: "• Hjärtefråga (x2)",
    btnBackQuiz: "Tillbaka till frågorna",
    btnShowRes: "Visa mitt resultat",
    resSubtitle: "Baserat på dina svar matchar du bäst med följande partier:",
    lblBestMatch: "🏆 Bästa matchning: ",
    btnMatrixToggle: "Visa partifacit och detaljberäkning ▼",
    lblReportCorrection: "Upptäckte du ett fel i partiets facit? Rapportera en källrättelse här",
    btnFormulaToggle: "Så räknades ditt resultat ut ▼",
    lblFormulaHead: "Hur beräknas matchningen?",
    lblFormulaText: "Ditt resultat bygger på hur nära dina åsikter ligger partiernas historiska ställningstaganden i frågorna.<br><br>Ju mer du och ett parti tycker lika på skalan från \"Helt för\" till \"Helt emot\", desto högre poäng får partiet. Om ni har helt motsatta åsikter ges inga poäng.<br><br>Frågor som du markerat som dina hjärtefrågor väger dubbelt så tungt. Slutligen räknas partiets sammanlagda poäng om till en procentandel av den högsta möjliga poängen.",
    btnWhatNext: "Vad hände sedan?",
    btnHome: "Startsidan",
    histSubheading: "Fråga för fråga: Besluten vs. Dina svar",
    histHistOutcome: "Vad som hände i verkligheten & på sikt:",
    btnBackRes: "Tillbaka till resultatet",
    btnChooseOther: "Välj ett annat val",
    valLabels: {
      2: "Helt för",
      1: "Delvis för",
      0: "Neutral / Hoppade över",
      "-1": "Delvis emot",
      "-2": "Helt emot"
    }
  },
  en: {
    appTitle: "Historical Election Compass",
    tagline: "How would you have voted in historical elections?",
    homeIntro: "Select a historical election below and choose between the quick or full compass:",
    btnQuick: "⚡ Quick Compass (8 questions)",
    btnFull: "📚 Full Compass (16 questions)",
    geminiFooter: "Created with Google Gemini",
    lblPro: "Arguments For:",
    lblCon: "Arguments Against:",
    lblBackground: "Background:",
    btnPrev: "Previous",
    progress: (cur, total) => `Question ${cur} of ${total}`,
    impHeading: "⭐ Choose your key issues",
    impDesc: "You have answered all questions. Select <strong>up to 3 questions</strong> that were most important to you (receives double weight):",
    lblUserAnswer: "Your answer:",
    lblHeartBadge: "• Key Issue (x2)",
    btnBackQuiz: "Back to questions",
    btnShowRes: "Show my result",
    resSubtitle: "Based on your answers, you match best with the following parties:",
    lblBestMatch: "🏆 Top Match: ",
    btnMatrixToggle: "Show party matrix and calculation breakdown ▼",
    lblReportCorrection: "Spotted an error in the party's answers? Submit a correction here",
    btnFormulaToggle: "How your score was calculated ▼",
    lblFormulaHead: "How is the match calculated?",
    lblFormulaText: "Your score is based on how close your opinions match the historical positions of the parties.<br><br>The more you agree on the scale from \"Strongly Agree\" to \"Strongly Disagree\", the higher score the party receives. Completely opposing views earn 0 points.<br><br>Questions marked as key issues carry double weight. Finally, total points are converted to a percentage of maximum possible points.",
    btnWhatNext: "What happened next?",
    btnHome: "Home",
    histSubheading: "Question by question: Decisions vs. Your answers",
    histHistOutcome: "What actually happened & long-term outcome:",
    btnBackRes: "Back to results",
    btnChooseOther: "Choose another election",
    valLabels: {
      2: "Strongly Agree",
      1: "Somewhat Agree",
      0: "Neutral / Skipped",
      "-1": "Somewhat Disagree",
      "-2": "Strongly Disagree"
    }
  },
  zh: {
    appTitle: "历史选举罗盘",
    tagline: "在历史的关键选举中，你会如何投票？",
    homeIntro: "请在下方选择一个历史选举，并选择快速测试或完整测试：",
    btnQuick: "⚡ 快速测试（8个问题）",
    btnFull: "📚 完整测试（16个问题）",
    geminiFooter: "由 Google Gemini 协助创建",
    lblPro: "支持理由：",
    lblCon: "反对理由：",
    lblBackground: "历史背景：",
    btnPrev: "上一题",
    progress: (cur, total) => `第 ${cur} / ${total} 题`,
    impHeading: "⭐ 选择你的核心关切",
    impDesc: "你已回答所有问题。请选择<strong>最多3个问题</strong>作为你的核心关切（将在结果中计算双倍权重）：",
    lblUserAnswer: "你的选择：",
    lblHeartBadge: "• 核心关切 (x2)",
    btnBackQuiz: "返回题目",
    btnShowRes: "查看我的匹配结果",
    resSubtitle: "根据你的回答，你与以下政党的立场最为契合：",
    lblBestMatch: "🏆 最高匹配度：",
    btnMatrixToggle: "显示政党立场对比及计算明细 ▼",
    lblReportCorrection: "发现政党数据有误？在此提交更正建议",
    btnFormulaToggle: "匹配度是如何计算的 ▼",
    lblFormulaHead: "匹配度计算规则",
    lblFormulaText: "你的结果取决于你的观点与各政党历史立场的接近程度。<br><br>在“完全赞成”到“完全反对”的量表上，双方观点越接近，政党得分越高。完全对立的观点得0分。<br><br>被标为核心关切的问题权重翻倍。最后，将总得分转换为最高可能得分的百分比。",
    btnWhatNext: "历史的后续发展",
    btnHome: "返回首页",
    histSubheading: "逐题对比：历史决策 vs 你的立场",
    histHistOutcome: "历史真实结果及长远影响：",
    btnBackRes: "返回测试结果",
    btnChooseOther: "选择其他选举",
    valLabels: {
      2: "完全赞成",
      1: "部分赞成",
      0: "中立 / 跳过",
      "-1": "部分反对",
      "-2": "完全反对"
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const valId = urlParams.get("val") || "1928";
  const lang = urlParams.get("lang") || "sv";
  const isQuick = urlParams.get("quick") === "true";
  
  currentLang = lang;
  updateLanguageUI();

  if (urlParams.get("val")) {
    startElection(valId, isQuick);
  }
});

function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`lang-${lang}`).classList.add("active");
  
  updateLanguageUI();

  // Om användaren har laddat in ett val, hämta rätt översättning av JSON
  if (currentElectionData) {
    startElection(currentElectionId, isQuickMode);
  }
}

function updateLanguageUI() {
  const t = i18n[currentLang];
  
  document.getElementById("header-title").innerText = t.appTitle;
  document.getElementById("header-tagline").innerText = t.tagline;
  document.getElementById("home-intro").innerText = t.homeIntro;
  document.getElementById("btn-quick").innerText = t.btnQuick;
  document.getElementById("btn-full").innerText = t.btnFull;
  document.getElementById("gemini-footer").innerText = t.geminiFooter;

  document.getElementById("lbl-pro").innerText = t.lblPro;
  document.getElementById("lbl-con").innerText = t.lblCon;
  document.getElementById("prev-btn").innerText = t.btnPrev;

  document.getElementById("imp-heading").innerText = t.impHeading;
  document.getElementById("imp-desc").innerHTML = t.impDesc;
  document.getElementById("btn-back-quiz").innerText = t.btnBackQuiz;
  document.getElementById("btn-show-res").innerText = t.btnShowRes;

  document.getElementById("btn-toggle-formula").innerText = t.btnFormulaToggle;
  document.getElementById("lbl-formula-head").innerText = t.lblFormulaHead;
  document.getElementById("lbl-formula-text").innerHTML = t.lblFormulaText;

  document.getElementById("btn-what-next").innerText = t.btnWhatNext;
  document.getElementById("btn-home-res").innerText = t.btnHome;
  document.getElementById("hist-subheading").innerText = t.histSubheading;
  document.getElementById("btn-back-res").innerText = t.btnBackRes;
  document.getElementById("btn-choose-other").innerText = t.btnChooseOther;

  document.querySelectorAll(".lang-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`lang-${currentLang}`).classList.add("active");
}

async function startElection(electionId, isQuick = false) {
  currentElectionId = electionId;
  isQuickMode = isQuick;
  
  // Hämta val1928.json som standard (sv), eller val1928_en.json / val1928_zh.json
  const fileSuffix = currentLang === "sv" ? "" : `_${currentLang}`;
  const filePath = `data/val${electionId}${fileSuffix}.json`;

  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Kunde inte ladda ${filePath}`);
    
    currentElectionData = await response.json();
    
    if (isQuick) {
      activeQuestions = currentElectionData.questions.filter(q => q.quick);
    } else {
      activeQuestions = currentElectionData.questions;
    }

    currentQuestionIndex = 0;
    userAnswers = {};
    importantQuestions.clear();

    const modeText = isQuick ? (currentLang === 'sv' ? 'Snabbkompass' : (currentLang === 'en' ? 'Quick Compass' : '快速测试')) : (currentLang === 'sv' ? 'Fullkompass' : (currentLang === 'en' ? 'Full Compass' : '完整测试'));
    document.getElementById("header-title").innerText = currentElectionData.title;
    document.getElementById("header-tagline").innerText = `${modeText} (${activeQuestions.length} ${currentLang === 'sv' ? 'frågor' : (currentLang === 'en' ? 'questions' : '题')})`;
    document.title = `${currentElectionData.title} – ${modeText}`;

    history.pushState({ valId: electionId, lang: currentLang, isQuick }, "", `?val=${electionId}&lang=${currentLang}&quick=${isQuick}`);
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
  const t = i18n[currentLang];
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
    contextEl.innerHTML = `<strong>${t.lblBackground}</strong> ${q.context}`;
    contextEl.style.display = "block";
  } else {
    contextEl.style.display = "none";
  }

  document.getElementById("q-pro").innerText = q.pro;
  document.getElementById("q-con").innerText = q.con;
  document.getElementById("q-progress").innerText = t.progress(currentQuestionIndex + 1, totalQ);

  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  const options = [
    { text: t.valLabels[2], val: 2 },
    { text: t.valLabels[1], val: 1 },
    { text: t.valLabels[0], val: 0 },
    { text: t.valLabels[-1], val: -1 },
    { text: t.valLabels[-2], val: -2 }
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
  const t = i18n[currentLang];
  const listEl = document.getElementById("importance-list");
  listEl.innerHTML = "";

  activeQuestions.forEach(q => {
    const item = document.createElement("div");
    item.className = "importance-item";
    
    const isChecked = importantQuestions.has(q.id);
    const isDisabled = !isChecked && importantQuestions.size >= 3;
    const userValText = t.valLabels[userAnswers[q.id]] || "N/A";

    item.innerHTML = `
      <input type="checkbox" id="chk-${q.id}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
      <label for="chk-${q.id}" style="cursor:pointer; width:100%;">
        <strong>${q.title}</strong> <span style="font-size:0.85rem; color:#6c757d;">(${q.category})</span><br>
        <span style="font-size: 0.95rem; font-weight: 500; color: #1a2530; display: block; margin: 4px 0;">"${q.statement}"</span>
        <span class="user-answer-badge">${t.lblUserAnswer} ${userValText} ${isChecked ? t.lblHeartBadge : ''}</span>
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
  const t = i18n[currentLang];

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

  document.getElementById("result-title").innerText = `${currentElectionData.title}`;
  document.getElementById("result-subtitle").innerText = t.resSubtitle;

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
          <span>${q.title} ${isImp ? '<strong>(x2)</strong>' : ''}</span>
          <span>${t.lblUserAnswer} <strong>${t.valLabels[uVal]}</strong> | ${s.name}: <strong>${t.valLabels[pVal]}</strong></span>
        </div>
      `;
    });

    listEl.innerHTML += `
      <div class="result-item" style="${isWinner ? 'border-color: var(--accent); background: #f0f7ff;' : ''}">
        <div class="result-header">
          <span class="party-name">${isWinner ? t.lblBestMatch : ''}${s.name}</span>
          <span class="result-score">${s.percent}%</span>
        </div>
        ${s.description ? `<p style="font-size: 0.9rem; color: #495057; margin: 5px 0;">${s.description}</p>` : ''}
        
        <button class="breakdown-toggle" onclick="toggleMatrix('${partyId}')">${t.btnMatrixToggle}</button>
        
        <div id="matrix-${partyId}" class="party-matrix" style="display:none;">
          ${matrixRowsHtml}
          <a href="mailto:kontakt@historiskvalkompass.se?subject=Rättelse%20facit%20${encodeURIComponent(s.name)}" class="report-link">${t.lblReportCorrection}</a>
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
  const t = i18n[currentLang];
  switchView("view-history");
  
  document.getElementById("hist-heading").innerText = `${currentElectionData.title}`;
  const summaryEl = document.getElementById("history-summary");
  summaryEl.innerHTML = `<strong>${currentElectionData.title}:</strong> ${currentElectionData.historicalOutcome.summary}`;

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
        <p class="user-choice-text"><strong>${t.lblUserAnswer}</strong> ${t.valLabels[uVal]}</p>
        <p class="outcome-text"><strong>${t.histHistOutcome}</strong> ${outcome ? outcome.description : 'N/A'}</p>
      </div>
    `;
  });
}

function showHome() {
  updateLanguageUI();
  history.pushState({}, "", window.location.pathname);
  switchView("view-home");
}

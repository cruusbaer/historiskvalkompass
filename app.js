let manifest = null;
let currentCategory = "Svenska val";
let currentElectionData = null;
let activeQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let lastMode = "quick";

const ANSWER_LABELS = {
  "2": "Instämmer helt",
  "1": "Instämmer delvis",
  "0": "Neutral / Vet ej",
  "-1": "Tar delvis avstånd",
  "-2": "Tar helt avstånd"
};

// DOM-element
const homeView = document.getElementById("home-view");
const quizView = document.getElementById("quiz-view");
const resultView = document.getElementById("result-view");

const siteTitle = document.getElementById("site-title");
const activeCategoryTitle = document.getElementById("active-category-title");
const activeCategoryDesc = document.getElementById("active-category-desc");
const electionsGrid = document.getElementById("elections-grid");
const categorySwitcherSection = document.getElementById("category-switcher-section");
const categoryButtons = document.getElementById("category-buttons");

// Initiera appen
async function init() {
  try {
    const response = await fetch("elections.json");
    if (!response.ok) throw new Error("Kunde inte ladda elections.json");
    manifest = await response.json();

    currentCategory = manifest.defaultCategory || "Svenska val";
    bindGlobalEvents();
    renderHome();
  } catch (err) {
    electionsGrid.innerHTML = `<p>Ett fel uppstod vid laddning av valdata: ${err.message}</p>`;
  }
}

function bindGlobalEvents() {
  // Klick på huvudrubriken tar alltid tillbaka till startsidan
  siteTitle.addEventListener("click", showHome);

  // Avbryt-knapp i quizet
  document.getElementById("cancel-quiz-btn").addEventListener("click", showHome);

  // Quiz-navigering
  document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
    } else {
      calculateAndShowResults();
    }
  });

  // Svarsknappar
  document.querySelectorAll(".answer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = activeQuestions[currentQuestionIndex];
      userAnswers[q.id] = parseInt(btn.dataset.value, 10);
      renderQuestion();

      // Gå automatiskt vidare efter en kort fördröjning om det inte är sista frågan
      if (currentQuestionIndex < activeQuestions.length - 1) {
        setTimeout(() => {
          currentQuestionIndex++;
          renderQuestion();
        }, 180);
      }
    });
  });

  // Resultatvyns knappar
  document.getElementById("restart-btn").addEventListener("click", () => {
    startQuiz(lastMode);
  });

  document.getElementById("back-home-btn").addEventListener("click", showHome);
}

function showHome() {
  quizView.classList.add("hidden");
  resultView.classList.add("hidden");
  homeView.classList.remove("hidden");
  renderHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyCategoryTheme(categoryId) {
  const categories = manifest.categories || [];
  const catObj = categories.find((c) => c.id === categoryId);

  if (catObj) {
    activeCategoryTitle.textContent = catObj.label || catObj.id;
    activeCategoryDesc.textContent = catObj.description || "";
    if (catObj.bgColor) {
      document.documentElement.style.setProperty("--bg", catObj.bgColor);
    }
  } else {
    activeCategoryTitle.textContent = categoryId;
    activeCategoryDesc.textContent = "";
    document.documentElement.style.setProperty("--bg", "#f4f6f9");
  }
}

function renderHome() {
  applyCategoryTheme(currentCategory);

  const activeElections = (manifest.elections || []).filter((e) => e.active);
  const filteredElections = activeElections.filter(
    (e) => (e.category || "Svenska val") === currentCategory
  );

  // Rendera valkort för aktuell kategori
  electionsGrid.innerHTML = "";
  filteredElections.forEach((election) => {
    const card = document.createElement("div");
    card.className = "election-card";
    card.innerHTML = `
      <div>
        <span class="election-year">${election.year}</span>
        <h3>${election.title}</h3>
        <p>${election.subtitle || ""}</p>
      </div>
      <div class="card-actions">
        <button type="button" class="btn btn-primary" data-file="${election.file}" data-mode="quick">
          ⚡ Snabbkompass (8 frågor)
        </button>
        <button type="button" class="btn btn-secondary" data-file="${election.file}" data-mode="full">
          Fullkompass (16 frågor)
        </button>
      </div>
    `;

    card.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        loadElectionAndStart(btn.dataset.file, btn.dataset.mode);
      });
    });

    electionsGrid.appendChild(card);
  });

  // Automatgenerera kategoriknappar längst ner (dölj den kategori man redan är i)
  const availableCategoryIds = [
    ...new Set(activeElections.map((e) => e.category || "Svenska val"))
  ];
  const otherCategories = availableCategoryIds.filter((id) => id !== currentCategory);

  if (otherCategories.length > 0) {
    categorySwitcherSection.classList.remove("hidden");
    categoryButtons.innerHTML = "";

    otherCategories.forEach((catId) => {
      const catMeta = (manifest.categories || []).find((c) => c.id === catId);
      const label = catMeta ? catMeta.label : catId;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-switch-btn";
      // Säkerhetsskydd med (label || "") för att förhindra toLowerCase-krasch om fält saknas
      btn.textContent = `Visa ${(label || "").toLowerCase()} →`;
      btn.addEventListener("click", () => {
        currentCategory = catId;
        renderHome();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      categoryButtons.appendChild(btn);
    });
  } else {
    categorySwitcherSection.classList.add("hidden");
  }
}

async function loadElectionAndStart(fileName, mode) {
  try {
    const response = await fetch(`data/${fileName}`);
    if (!response.ok) throw new Error(`Kunde inte ladda data/${fileName}`);
    currentElectionData = await response.json();
    startQuiz(mode);
  } catch (err) {
    alert(`Kunde inte starta valkompassen: ${err.message}`);
  }
}

function startQuiz(mode) {
  lastMode = mode;
  userAnswers = {};
  currentQuestionIndex = 0;

  if (mode === "quick") {
    activeQuestions = currentElectionData.questions.filter((q) => q.quick);
  } else {
    activeQuestions = [...currentElectionData.questions];
  }

  document.getElementById("quiz-election-badge").textContent = currentElectionData.title;

  homeView.classList.add("hidden");
  resultView.classList.add("hidden");
  quizView.classList.remove("hidden");

  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuestion() {
  const q = activeQuestions[currentQuestionIndex];
  const total = activeQuestions.length;

  document.getElementById("question-counter").textContent = `Fråga ${currentQuestionIndex + 1} av ${total}`;
  document.getElementById("question-category").textContent = q.category || "";
  document.getElementById("progress-bar-fill").style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;

  document.getElementById("question-title").textContent = q.title;
  document.getElementById("question-statement").textContent = q.statement;
  document.getElementById("question-context").textContent = q.context || "";
  document.getElementById("question-pro").textContent = q.pro || "";
  document.getElementById("question-con").textContent = q.con || "";

  // Stäng bakgrundsrutan vid ny fråga
  document.querySelector(".context-details").removeAttribute("open");

  // Markera eventuellt tidigare valt svar
  const savedValue = userAnswers[q.id];
  document.querySelectorAll(".answer-btn").forEach((btn) => {
    const val = parseInt(btn.dataset.value, 10);
    btn.classList.toggle("selected", savedValue === val);
  });

  // Uppdatera navigeringsknappar
  document.getElementById("prev-btn").style.visibility =
    currentQuestionIndex === 0 ? "hidden" : "visible";

  const nextBtn = document.getElementById("next-btn");
  nextBtn.textContent =
    currentQuestionIndex === total - 1 ? "Visa mitt resultat ✓" : "Nästa →";
}

function calculateAndShowResults() {
  const parties = currentElectionData.parties || [];
  const results = parties.map((party) => {
    let totalDiff = 0;
    let maxPossibleDiff = 0;

    activeQuestions.forEach((q) => {
      const userVal = userAnswers[q.id] !== undefined ? userAnswers[q.id] : 0;
      const partyVal = party.answers[q.id] !== undefined ? party.answers[q.id] : 0;

      totalDiff += Math.abs(userVal - partyVal);
      maxPossibleDiff += 4;
    });

    const matchPercent =
      maxPossibleDiff > 0
        ? Math.round(((maxPossibleDiff - totalDiff) / maxPossibleDiff) * 100)
        : 0;

    return

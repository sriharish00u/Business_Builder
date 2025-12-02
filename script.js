let SAVE_KEY = "business_builder_progress_v1";
let THEME_KEY = "business_builder_theme";

// ---------------- LOAD JSONS ---------------
let questionsJSON = {};
let promptsJSON = {};

let flat = [];        // flattened questions
let cursor = 0;       // current position
let answers = [];     // collected answers

// --------- THEME MANAGEMENT ---------
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeButton();
});

// --------------- INITIAL LOAD ----------------
async function init() {
  questionsJSON = await fetch("questions.json").then(r => r.json());
  promptsJSON   = await fetch("prompts.json").then(r => r.json());

  initTheme();
  flattenQuestions();

  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    cursor = data.cursor || 0;
    answers = data.answers || [];
  } else {
    cursor = 0;
    answers = [];
  }

  render();
}

// ---------------- FLATTEN QUESTIONS ----------------
function flattenQuestions() {
  for (const level in questionsJSON) {
    const sec = questionsJSON[level];

    if (Array.isArray(sec)) {
      sec.forEach(q => flat.push({ level, dimension: null, question: q }));
    } 
    else if (typeof sec === "object") {
      for (const dim in sec) {
        sec[dim].forEach(q => flat.push({ level, dimension: dim, question: q }));
      }
    }
  }
}

// ---------------- PROMPT MATCHING ----------------
function findPrompt(level, dimension, question) {
  const levelPrompts = promptsJSON[level];
  if (!levelPrompts) return "No prompt found for this level.";

  // LEVEL 3 DIMENSION HANDLER
  if (dimension && typeof levelPrompts[dimension] === "object") {
    let all = [];
    Object.values(levelPrompts[dimension]).forEach(arr => all.push(...arr));
    return all.join("\n\n• ");
  }

  // LEVEL 1 + LEVEL 2 KEYWORD HANDLER
  const q = question.toLowerCase();

  const map = {
    "idea": "idea",
    "name": "name",
    "tagline": "tagline",
    "one-line": "oneliner",
    "one line": "oneliner",
    "audience": "audience",
    "problem": "problem",
    "solution": "solution",
    "competitor": "competitors",
    "vibe": "brand_vibe",
    "goal": "goals",
    "market": "market",
    "revenue": "revenue_model",
    "value": "value_proposition",
    "feature": "features_benefits",
    "time": "timing",
    "segment": "customer_segments",
    "strength": "founder_strengths",
    "weakness": "founder_weaknesses",
    "motivation": "motivation",
    "budget": "budget",
    "risk": "risks",
    "limitation": "constraints"
  };

  for (const key in map) {
    if (q.includes(key) && levelPrompts[map[key]]) {
      return levelPrompts[map[key]].join("\n\n• ");
    }
  }

  // fallback → return ALL prompts in this level
  let all = [];
  for (const key in levelPrompts) {
    let item = levelPrompts[key];
    if (Array.isArray(item)) all.push(...item);
    else if (typeof item === "object") {
      Object.values(item).forEach(v => all.push(...v));
    }
  }

  return all.join("\n\n• ");
}

// ----------- STORE ANSWERS & PROGRESS ----------
function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ cursor, answers }));
}

// ---------- UPDATE PROGRESS BAR ----------
function updateProgressBar() {
  if (flat.length > 0) {
    const percentage = (cursor / flat.length) * 100;
    document.getElementById("progressFill").style.width = percentage + "%";
  }
}

// ----------- RENDER UI ----------
function render() {
  if (cursor >= flat.length) return showSummary();

  const qObj = flat[cursor];

  document.getElementById("levelText").textContent =
    qObj.level.replace(/_/g, " ").toUpperCase();

  document.getElementById("dimensionText").textContent =
    qObj.dimension ? ("Dimension: " + qObj.dimension.replace(/_/g, " ")) : "";

  document.getElementById("questionText").textContent = qObj.question;

  document.getElementById("progress").textContent =
    `Question ${cursor + 1} of ${flat.length}`;

  updateProgressBar();

  const input = document.getElementById("answerInput");
  input.value = "";
  document.getElementById("saveBtn").disabled = true;

  document.getElementById("answerBox").style.display = "none";
  document.getElementById("promptArea").style.display = "none";
  document.getElementById("navButtons").style.display = cursor > 0 ? "flex" : "none";
}

// ---------------- BUTTON ACTIONS ----------------
btnYes.onclick = () => {
  document.getElementById("answerBox").style.display = "block";
  document.getElementById("saveBtn").disabled = true;
};

document.getElementById("answerInput").addEventListener("input", () => {
  const val = document.getElementById("answerInput").value.trim();
  document.getElementById("saveBtn").disabled = val.length === 0;
});

btnNo.onclick = () => {
  const qObj = flat[cursor];
  const prompt = findPrompt(qObj.level, qObj.dimension, qObj.question);

  document.getElementById("promptText").textContent = prompt;
  document.getElementById("promptArea").style.display = "block";
};

// SAVE AND CONTINUE (YES path)
saveBtn.onclick = () => {
  const val = document.getElementById("answerInput").value.trim();

  answers.push({
    level: flat[cursor].level,
    dimension: flat[cursor].dimension,
    question: flat[cursor].question,
    answer: val
  });

  saveProgress();
  cursor++;
  render();
};

// BACK BUTTON
document.getElementById("backBtn").addEventListener("click", () => {
  if (cursor > 0) {
    cursor--;
    
    const currentAnswer = answers[cursor];
    if (currentAnswer) {
      document.getElementById("answerInput").value = currentAnswer.answer;
      document.getElementById("answerBox").style.display = "block";
    }
    
    answers.pop();
    saveProgress();
    render();
  }
});

// ---------------- SUMMARY ----------------
function showSummary() {
  document.getElementById("questionArea").style.display = "none";
  document.getElementById("finalArea").style.display = "block";

  let out = "";
  answers.forEach((a, i) => {
    out += `${i + 1}. [${a.level}] ${a.dimension ? '(' + a.dimension + ')' : ''}\n`;
    out += `${a.question}\n`;
    out += `   → Answer: ${a.answer}\n\n`;
  });

  document.getElementById("summary").textContent = out;
}

init();

const SAVE_KEY = "business_builder_progress_v1";
const THEME_KEY = "business_builder_theme";
const HISTORY_KEY = "business_builder_history";

let questionsJSON = {};
let promptsJSON = {};

let flat = [];        
let cursor = 0;       
let answers = [];     
let answerHistory = [];
let sessionStartTime = Date.now();
let reviewScreenShown = false;
const MAX_UNDO = 10;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.className = 'toast', 3000);
}

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

async function init() {
  try {
    document.getElementById('skeleton').style.display = 'block';
    document.getElementById('progress').textContent = 'Loading questions...';

    const [questionsRes, promptsRes] = await Promise.all([
      fetch("questions.json"),
      fetch("prompts.json")
    ]);

    if (!questionsRes.ok || !promptsRes.ok) {
      throw new Error('Failed to load question data');
    }

    questionsJSON = await questionsRes.json();
    promptsJSON = await promptsRes.json();

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

    document.getElementById('skeleton').style.display = 'none';
    render();
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Error loading questions. Please refresh the page.', 'error');
    document.getElementById('progress').textContent = 'Error loading data. Please refresh.';
  }
}

function flattenQuestions() {
  for (const level in questionsJSON) {
    const sec = questionsJSON[level];

    if (Array.isArray(sec)) {
      sec.forEach(q => {
        const qText = typeof q === 'string' ? q : q.question;
        const hint = typeof q === 'object' ? q.hint : null;
        const difficulty = typeof q === 'object' ? q.difficulty : null;
        flat.push({ level, dimension: null, question: qText, hint, difficulty });
      });
    } 
    else if (typeof sec === "object") {
      for (const dim in sec) {
        sec[dim].forEach(q => {
          const qText = typeof q === 'string' ? q : q.question;
          const hint = typeof q === 'object' ? q.hint : null;
          const difficulty = typeof q === 'object' ? q.difficulty : null;
          flat.push({ level, dimension: dim, question: qText, hint, difficulty });
        });
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

function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ cursor, answers }));
}

function getEstimatedTime() {
  const avgSecsPerQuestion = 45;
  const remainingQuestions = flat.length - cursor;
  const remainingMins = Math.ceil((remainingQuestions * avgSecsPerQuestion) / 60);
  return remainingMins;
}

function updateProgressBar() {
  if (flat.length > 0) {
    const percentage = (cursor / flat.length) * 100;
    document.getElementById("progressFill").style.width = percentage + "%";
  }
}

function getSectionProgress() {
  const levelCounts = {};
  const levelAnswered = {};

  flat.forEach((q, idx) => {
    if (!levelCounts[q.level]) levelCounts[q.level] = 0;
    levelCounts[q.level]++;
    
    if (!levelAnswered[q.level]) levelAnswered[q.level] = 0;
    if (idx < cursor) levelAnswered[q.level]++;
  });

  return { levelCounts, levelAnswered };
}

function render() {
  if (cursor >= flat.length) return showSummary();

  const qObj = flat[cursor];
  const estimatedTime = getEstimatedTime();
  const { levelCounts, levelAnswered } = getSectionProgress();

  const levelName = qObj.level.replace(/_/g, " ").toUpperCase();
  let levelInfo = levelName;
  if (levelCounts[qObj.level] !== undefined) {
    const answered = levelAnswered[qObj.level] || 0;
    const total = levelCounts[qObj.level];
    levelInfo += ` (${answered}/${total})`;
  }

  document.getElementById("levelText").textContent = levelInfo;

  let dimensionText = qObj.dimension ? ("Dimension: " + qObj.dimension.replace(/_/g, " ")) : "";
  if (qObj.difficulty) {
    const diffEmoji = qObj.difficulty === 'Beginner' ? '🟢' : qObj.difficulty === 'Intermediate' ? '🟡' : '🔴';
    dimensionText += (dimensionText ? " • " : "") + diffEmoji + " " + qObj.difficulty;
  }
  document.getElementById("dimensionText").textContent = dimensionText;

  document.getElementById("questionText").textContent = qObj.question;

  let progressText = `Question ${cursor + 1} of ${flat.length} • ⏱ ~${estimatedTime} min left`;
  document.getElementById("progress").textContent = progressText;

  updateProgressBar();

  const input = document.getElementById("answerInput");
  input.value = "";
  input.maxLength = 500;
  document.getElementById("saveBtn").disabled = true;

  document.getElementById("answerBox").style.display = "none";
  document.getElementById("promptArea").style.display = "none";
  
  const navButtons = document.getElementById("navButtons");
  navButtons.style.display = cursor > 0 ? "flex" : "none";
  
  const undoBtn = document.getElementById("undoBtn");
  if (undoBtn) {
    undoBtn.style.display = answerHistory.length > 0 ? "inline-block" : "none";
  }

  if (qObj.hint) {
    const hintEl = document.getElementById("hintText") || createHintElement();
    hintEl.textContent = "💡 " + qObj.hint;
    hintEl.style.display = "block";
  } else {
    const hintEl = document.getElementById("hintText");
    if (hintEl) hintEl.style.display = "none";
  }
}

function createHintElement() {
  const hintEl = document.createElement('div');
  hintEl.id = "hintText";
  hintEl.style.cssText = "color: #666; font-size: 0.9em; margin: 12px 0; padding: 8px 12px; background: rgba(0,102,204,0.08); border-left: 3px solid #0066cc; border-radius: 4px;";
  document.getElementById("questionText").parentNode.insertBefore(hintEl, document.getElementById("questionText").nextSibling);
  return hintEl;
}

document.getElementById("btnYes").addEventListener("click", () => {
  document.getElementById("answerBox").style.display = "block";
  document.getElementById("answerInput").focus();
  document.getElementById("saveBtn").disabled = true;
});

document.getElementById("answerInput").addEventListener("input", (e) => {
  const val = e.target.value.trim();
  document.getElementById("saveBtn").disabled = val.length === 0;
  const charCount = val.length;
  const counter = document.getElementById("charCounter") || createCharCounter();
  counter.textContent = `${charCount}/500`;
  if (charCount > 400) counter.style.color = '#ff9500';
  if (charCount >= 500) counter.style.color = '#dc3545';
  if (charCount < 400) counter.style.color = '#666';
});

function createCharCounter() {
  const counter = document.createElement('div');
  counter.id = "charCounter";
  counter.style.cssText = "font-size: 0.85em; color: #666; margin-top: 4px; text-align: right;";
  document.getElementById("answerInput").parentNode.appendChild(counter);
  return counter;
}

document.getElementById("btnNo").addEventListener("click", () => {
  const qObj = flat[cursor];
  const prompt = findPrompt(qObj.level, qObj.dimension, qObj.question);

  document.getElementById("promptText").textContent = prompt;
  document.getElementById("promptArea").style.display = "block";
});

document.getElementById("saveBtn").addEventListener("click", () => {
  const val = document.getElementById("answerInput").value.trim();

  if (val.length === 0) {
    showToast('Please enter an answer', 'warning');
    return;
  }

  answers.push({
    level: flat[cursor].level,
    dimension: flat[cursor].dimension,
    question: flat[cursor].question,
    answer: val
  });

  saveProgress();
  cursor++;
  render();
  showToast('✓ Answer saved', 'success');
});

document.getElementById("backBtn").addEventListener("click", () => {
  if (cursor > 0) {
    answerHistory.push({ cursor, answers: JSON.parse(JSON.stringify(answers)) });
    if (answerHistory.length > MAX_UNDO) answerHistory.shift();
    
    cursor--;
    
    const currentAnswer = answers[cursor];
    if (currentAnswer) {
      document.getElementById("answerInput").value = currentAnswer.answer;
      document.getElementById("answerBox").style.display = "block";
    }
    
    answers.pop();
    saveProgress();
    render();
    showToast('← Previous question', 'info');
  }
});

const undoBtn = document.createElement('button');
undoBtn.id = "undoBtn";
undoBtn.className = "back-btn";
undoBtn.textContent = "↶ Undo";
undoBtn.title = "Undo last action";
undoBtn.style.display = "none";
undoBtn.addEventListener("click", () => {
  if (answerHistory.length > 0) {
    const lastState = answerHistory.pop();
    cursor = lastState.cursor;
    answers = lastState.answers;
    saveProgress();
    render();
    showToast('↶ Undo successful', 'info');
  }
});
document.getElementById("navButtons").appendChild(undoBtn);

function showSummary() {
  if (!reviewScreenShown) {
    reviewScreenShown = true;
    showReview();
    return;
  }
  
  document.getElementById("questionArea").style.display = "none";
  document.getElementById("reviewArea").style.display = "none";
  document.getElementById("finalArea").style.display = "block";

  const sessionTime = Math.round((Date.now() - sessionStartTime) / 1000 / 60);
  const completionSummary = document.getElementById("completionSummary");
  completionSummary.innerHTML = `
    <p style="font-size: 1.1em; margin: 16px 0;">
      🎉 <strong>You completed the Business Builder Wizard!</strong>
    </p>
    <p style="color: #666; margin: 8px 0;">
      Total time: <strong>${sessionTime} minutes</strong> | Answers: <strong>${answers.length}</strong>
    </p>
  `;

  let out = "";
  answers.forEach((a, i) => {
    out += `${i + 1}. [${a.level}] ${a.dimension ? '(' + a.dimension + ')' : ''}\n`;
    out += `${a.question}\n`;
    out += `   → Answer: ${a.answer}\n\n`;
  });

  document.getElementById("summary").textContent = out;

  saveSessionToHistory();
}

function saveSessionToHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      timestamp: new Date().toISOString(),
      answers: answers.length,
      time: Math.round((Date.now() - sessionStartTime) / 1000 / 60)
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch (e) {
    console.error('Error saving to history:', e);
  }
}

document.getElementById("submitBtn").addEventListener("click", () => {
  showSummary();
  showToast('✓ Moving to final summary', 'success');
});

document.getElementById("restartBtn").addEventListener("click", () => {
  localStorage.removeItem(SAVE_KEY);
  cursor = 0;
  answers = [];
  answerHistory = [];
  sessionStartTime = Date.now();
  reviewScreenShown = false;
  document.getElementById("questionArea").style.display = "block";
  document.getElementById("finalArea").style.display = "none";
  document.getElementById("reviewArea").style.display = "none";
  render();
  showToast('↻ Restarted', 'info');
});

function showReview() {
  document.getElementById("questionArea").style.display = "none";
  document.getElementById("reviewArea").style.display = "block";
  
  const reviewContainer = document.getElementById("reviewContainer");
  reviewContainer.innerHTML = "";
  
  answers.forEach((answer, idx) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "review-item";
    itemDiv.innerHTML = `
      <strong>${idx + 1}. ${answer.question}</strong><br>
      <small style="color: #666;">[${answer.level}${answer.dimension ? ' - ' + answer.dimension.replace(/_/g, ' ') : ''}]</small><br>
      <span style="color: #0066cc; margin-top: 8px; display: block;">✓ ${answer.answer}</span>
    `;
    
    itemDiv.addEventListener("click", () => {
      if (itemDiv.classList.contains("editing")) {
        itemDiv.classList.remove("editing");
      } else {
        document.querySelectorAll(".review-item.editing").forEach(el => {
          if (el !== itemDiv) el.classList.remove("editing");
        });
        
        itemDiv.classList.add("editing");
        itemDiv.innerHTML = `
          <strong>${idx + 1}. ${answer.question}</strong><br>
          <textarea class="review-item-inline-edit" maxlength="500">${answer.answer}</textarea>
          <div style="margin-top: 8px;">
            <button class="primary" style="padding: 6px 12px; font-size: 0.9em;">Save</button>
            <button class="secondary-btn" style="padding: 6px 12px; font-size: 0.9em; margin-left: 4px;">Cancel</button>
          </div>
        `;
        
        const saveBtn = itemDiv.querySelector(".primary");
        const cancelBtn = itemDiv.querySelector(".secondary-btn");
        const textarea = itemDiv.querySelector("textarea");
        
        textarea.focus();
        
        saveBtn.addEventListener("click", () => {
          answers[idx].answer = textarea.value.trim();
          saveProgress();
          showToast('✓ Answer updated', 'success');
          itemDiv.classList.remove("editing");
          showReview();
        });
        
        cancelBtn.addEventListener("click", () => {
          itemDiv.classList.remove("editing");
          showReview();
        });
      }
    });
    
    reviewContainer.appendChild(itemDiv);
  });
}

document.getElementById("editBtn").addEventListener("click", () => {
  document.getElementById("reviewArea").style.display = "none";
  document.getElementById("questionArea").style.display = "block";
  render();
  showToast('← Back to questions', 'info');
});

init();

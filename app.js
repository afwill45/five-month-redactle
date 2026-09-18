const article = {
  title: "Jade",
  sections: [
    {
      heading: null,
      paragraphs: [
        "Jade is a university student based in Boston, Massachusetts. She is best known in this private encyclopedia as Afolabi Williams's girlfriend and the subject of a puzzle created to mark their fifth month together.",
        "She attends Boston University and has pursued a pre-medical course of study. Her academic interests have included medicine and the many possible careers surrounding patient care. She is completing her senior year in Boston."
      ]
    },
    {
      heading: "Relationship",
      paragraphs: [
        "Jade and Afolabi maintain a long-distance relationship between Boston and Maryland. Their routine includes frequent FaceTime calls, virtual dates, and carefully planned visits. Afolabi has looked for trains, flights, and quiet places to stay near campus so that an ordinary weekend can become time together.",
        "Their relationship is characterized by affection, honesty, reflection, and a shared effort to keep growing. Afolabi has described Jade as a good woman whom he cares about deeply. He has also tried to become a more thoughtful partner and to protect the trust at the center of their relationship."
      ]
    },
    {
      heading: "Food and traditions",
      paragraphs: [
        "Among the meals Afolabi has made for Jade are shawarma, biryani, Indomie, and butter chicken. These dishes became part of the small collection of memories celebrated in a scrapbook made for her.",
        "Because distance separates them, the pair often turn everyday communication into quality time. Their fifth-month anniversary was commemorated with this playable redacted article, in which the reader gradually uncovers a record of their story one word at a time."
      ]
    },
    {
      heading: "Legacy",
      paragraphs: [
        "At five months, the history of Jade and Afolabi remains a young one. Its most important chapters have not yet been written."
      ]
    }
  ]
};

const alwaysVisible = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "between", "by", "for", "from", "has", "have", "he", "her", "in", "is", "it", "its", "not", "of", "on", "or", "she", "so", "that", "the", "their", "them", "they", "this", "to", "was", "whom", "with"
]);

const state = {
  guesses: [],
  guessedWords: new Set(),
  startTime: Date.now(),
  solved: false,
  gaveUp: false,
  timerId: null
};

const els = {
  title: document.querySelector("#articleTitle"),
  body: document.querySelector("#articleBody"),
  form: document.querySelector("#guessForm"),
  input: document.querySelector("#guessInput"),
  feedback: document.querySelector("#guessFeedback"),
  guessCount: document.querySelector("#guessCount"),
  hitCount: document.querySelector("#hitCount"),
  accuracy: document.querySelector("#accuracy"),
  history: document.querySelector("#guessHistory"),
  emptyHistory: document.querySelector("#emptyHistory"),
  timer: document.querySelector("#timer"),
  info: document.querySelector("#infoDialog"),
  win: document.querySelector("#winDialog"),
  winSummary: document.querySelector("#winSummary")
};

function normalize(value) {
  return value.toLocaleLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "").trim();
}

function wordForms(value) {
  const word = normalize(value).replace(/'s$/, "");
  const forms = new Set([word]);
  if (word.length > 4 && word.endsWith("ies")) forms.add(`${word.slice(0, -3)}y`);
  if (word.length > 4 && word.endsWith("es")) forms.add(word.slice(0, -2));
  if (word.length > 3 && word.endsWith("s")) forms.add(word.slice(0, -1));
  if (word.length > 5 && word.endsWith("ing")) {
    forms.add(word.slice(0, -3));
    forms.add(`${word.slice(0, -3)}e`);
  }
  if (word.length > 4 && word.endsWith("ed")) {
    forms.add(word.slice(0, -2));
    forms.add(`${word.slice(0, -1)}`);
  }
  return forms;
}

function matchesGuess(word, guess) {
  const guessedForms = wordForms(guess);
  return [...wordForms(word)].some(form => guessedForms.has(form));
}

function tokenize(text) {
  return text.split(/([A-Za-z0-9]+(?:['’][A-Za-z]+)?|[^A-Za-z0-9]+)/g).filter(Boolean);
}

function shouldReveal(token) {
  const word = normalize(token);
  if (!/[a-z0-9]/.test(word)) return true;
  return state.gaveUp || alwaysVisible.has(word) || [...state.guessedWords].some(guess => matchesGuess(word, guess));
}

function renderText(text, container) {
  tokenize(text).forEach(token => {
    const word = normalize(token);
    if (!/[a-z0-9]/.test(word)) {
      container.append(document.createTextNode(token));
      return;
    }
    const span = document.createElement("span");
    span.className = `word ${shouldReveal(token) ? "revealed" : "redacted"}`;
    span.dataset.word = word;
    span.textContent = token;
    container.append(span);
  });
}

function renderArticle() {
  els.title.replaceChildren();
  renderText(article.title, els.title);
  els.body.replaceChildren();
  article.sections.forEach(section => {
    if (section.heading) {
      const heading = document.createElement("h2");
      renderText(section.heading, heading);
      els.body.append(heading);
    }
    section.paragraphs.forEach(text => {
      const paragraph = document.createElement("p");
      renderText(text, paragraph);
      els.body.append(paragraph);
    });
  });
}

function allWords() {
  const strings = [article.title];
  article.sections.forEach(section => {
    if (section.heading) strings.push(section.heading);
    strings.push(...section.paragraphs);
  });
  return strings.flatMap(tokenize).map(normalize).filter(word => /[a-z0-9]/.test(word));
}

function countWord(guess) {
  return allWords().filter(word => matchesGuess(word, guess)).length;
}

function updateStats() {
  const hits = state.guesses.filter(item => item.hits > 0).length;
  els.guessCount.textContent = state.guesses.length;
  els.hitCount.textContent = hits;
  els.accuracy.textContent = state.guesses.length ? `${Math.round((hits / state.guesses.length) * 100)}%` : "—";
}

function updateHistory() {
  els.history.replaceChildren();
  els.emptyHistory.hidden = state.guesses.length > 0;
  [...state.guesses].reverse().forEach(item => {
    const li = document.createElement("li");
    if (item.hits) li.classList.add("hit");
    const guess = document.createElement("span");
    guess.textContent = item.word;
    const hits = document.createElement("span");
    hits.textContent = item.hits;
    li.append(guess, hits);
    els.history.append(li);
  });
}

function flashWord(word) {
  document.querySelectorAll("[data-word]").forEach(node => {
    if (!matchesGuess(node.dataset.word, word)) return;
    node.classList.remove("redacted");
    node.classList.add("revealed", "just-revealed");
    window.setTimeout(() => node.classList.remove("just-revealed"), 1100);
  });
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function finishGame(gaveUp = false) {
  state.solved = true;
  state.gaveUp = gaveUp;
  clearInterval(state.timerId);
  renderArticle();
  els.input.disabled = true;
  els.form.querySelector("button").disabled = true;
  const time = formatTime(Date.now() - state.startTime);
  els.winSummary.textContent = gaveUp
    ? `The article was revealed after ${state.guesses.length} guesses.`
    : `You found her name in ${state.guesses.length} guesses and ${time}.`;
  window.setTimeout(() => els.win.showModal(), 350);
}

function makeGuess(raw) {
  const guess = normalize(raw);
  els.feedback.className = "feedback";
  if (!guess || !/[a-z0-9]/.test(guess)) {
    els.feedback.textContent = "Enter a word to guess.";
    return;
  }
  if (state.guessedWords.has(guess) || alwaysVisible.has(guess)) {
    els.feedback.textContent = `“${guess}” is already visible.`;
    return;
  }
  const hits = countWord(guess);
  state.guessedWords.add(guess);
  state.guesses.push({ word: guess, hits });
  flashWord(guess);
  updateStats();
  updateHistory();
  els.feedback.textContent = hits ? `${hits} ${hits === 1 ? "match" : "matches"} found.` : `No matches for “${guess}”.`;
  els.feedback.classList.add(hits ? "success" : "miss");
  if (guess === normalize(article.title)) finishGame(false);
}

function resetGame() {
  clearInterval(state.timerId);
  state.guesses = [];
  state.guessedWords = new Set();
  state.startTime = Date.now();
  state.solved = false;
  state.gaveUp = false;
  els.input.disabled = false;
  els.form.querySelector("button").disabled = false;
  els.feedback.textContent = "";
  if (els.win.open) els.win.close();
  renderArticle();
  updateStats();
  updateHistory();
  startTimer();
  els.input.focus();
}

function startTimer() {
  els.timer.textContent = "0s";
  state.timerId = setInterval(() => {
    els.timer.textContent = formatTime(Date.now() - state.startTime);
  }, 1000);
}

function registerAgentTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  void Promise.resolve(context.registerTool({
    name: "guess_word",
    title: "Guess a word",
    description: "Submit one word to the active Redactle puzzle and reveal every exact match.",
    inputSchema: {
      type: "object",
      properties: { word: { type: "string", minLength: 1, maxLength: 40 } },
      required: ["word"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (state.solved) throw new Error("The puzzle is already complete.");
      const word = normalize(input?.word ?? "");
      if (!word || word.includes(" ")) throw new Error("Provide exactly one word.");
      const before = state.guesses.length;
      makeGuess(word);
      const result = state.guesses[state.guesses.length - 1];
      return before === state.guesses.length
        ? { accepted: false, message: els.feedback.textContent }
        : { accepted: true, word: result.word, hits: result.hits, solved: state.solved };
    }
  })).catch(() => {});

  void Promise.resolve(context.registerTool({
    name: "read_puzzle_progress",
    title: "Read puzzle progress",
    description: "Read the current number of guesses, hits, accuracy, and whether the puzzle is solved.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      const hits = state.guesses.filter(item => item.hits > 0).length;
      return {
        guesses: state.guesses.length,
        hits,
        accuracy: state.guesses.length ? Math.round((hits / state.guesses.length) * 100) : null,
        solved: state.solved
      };
    }
  })).catch(() => {});
}

els.form.addEventListener("submit", event => {
  event.preventDefault();
  makeGuess(els.input.value);
  els.input.value = "";
  els.input.focus();
});

document.querySelector("#menuButton").addEventListener("click", () => els.info.showModal());
document.querySelector("#settingsButton").addEventListener("click", () => document.querySelector("#settingsDialog").showModal());
document.querySelector("#largeTextToggle").addEventListener("change", event => document.body.classList.toggle("large-text", event.target.checked));
document.querySelector("#sideResetButton").addEventListener("click", resetGame);
document.querySelector("#statsButton").addEventListener("click", () => {
  els.feedback.textContent = `${state.guesses.length} guesses so far · ${els.accuracy.textContent} accuracy.`;
  els.feedback.className = "feedback";
  els.feedback.scrollIntoView({ behavior: "smooth", block: "center" });
});
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelector("#giveUpButton").addEventListener("click", () => {
  if (!state.solved && window.confirm("Reveal the whole article?")) finishGame(true);
});
document.querySelector("#resetButton").addEventListener("click", resetGame);
document.querySelector("#shareButton").addEventListener("click", async event => {
  const hits = state.guesses.filter(item => item.hits).length;
  const result = `Redactle #5 ♥\n${state.guesses.length} guesses · ${hits} hits · ${els.timer.textContent}`;
  try {
    await navigator.clipboard.writeText(result);
    event.currentTarget.textContent = "COPIED!";
  } catch {
    event.currentTarget.textContent = "COPY UNAVAILABLE";
  }
});

renderArticle();
updateStats();
updateHistory();
startTimer();
registerAgentTools();
window.setTimeout(() => els.input.focus(), 200);

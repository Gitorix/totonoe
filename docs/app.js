// ===============================
// TOTONOE - app.js (A/B + Code Lab)
// ===============================

const QUESTIONS_KEY = "totonoe_questions";
const HISTORY_KEY = "totonoe_history";

// A/B mode (A=通常 / B=視聴者コーディング体験)
const AB_KEY = "totonoe_mode"; // "A" or "B"
const CODELAB_KEY = "totonoe_codelab_config";

// -------------------------------
// Storage helpers
// -------------------------------
function loadQuestions(defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "null");
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}
  return defaults;
}

function saveQuestions(list) {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(list));
  } catch (e) {}
}

function getMode() {
  try {
    return localStorage.getItem(AB_KEY) || "A";
  } catch {
    return "A";
  }
}

function setMode(mode) {
  try {
    localStorage.setItem(AB_KEY, mode);
  } catch {}
}

// -------------------------------
// Utility
// -------------------------------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now());
}

// -------------------------------
// Code Lab (B mode) config
// -------------------------------
function getDefaultCodeLabConfig() {
  return {
    questions: [
      "① 状況（事実）：いま何が起きてる？",
      "② 気持ち：どう感じてる？",
      "③ 引っかかり：どこがモヤる？",
      "④ 本当はどうしたい：理想は？",
      "⑤ 次の一歩（小さくてOK）：何からやる？",
    ],
    ui: { accent: "#7c5cff", cardRadius: 16 },
    behavior: { gentle: true, animate: true },
  };
}

function loadCodeLabConfig() {
  try {
    const raw = localStorage.getItem(CODELAB_KEY);
    if (!raw) return getDefaultCodeLabConfig();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : getDefaultCodeLabConfig();
  } catch {
    return getDefaultCodeLabConfig();
  }
}

function saveCodeLabConfig(cfg) {
  try {
    localStorage.setItem(CODELAB_KEY, JSON.stringify(cfg));
  } catch {}
}

// ===============================
// Main
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (!app) {
    console.error("index.html に <div id='app'></div> がありません");
    return;
  }

  // ===== Defaults =====
  const DEFAULT_QUESTIONS = [
    "① 状況（事実）：いま何が起きてる？",
    "② 気持ち：どう感じてる？",
    "③ 引っかかり：どこがモヤる？",
    "④ 本当はどうしたい：理想は？",
    "⑤ 次の一歩（小さくてOK）：何からやる？",
  ];

  // ===== State =====
  let questions = loadQuestions(DEFAULT_QUESTIONS);
  let idx = 0;
  let loopCount = 0;
  const answers = Array(questions.length).fill("");

  // ===== Theme apply (CSS vars + dataset) =====
  function applyBehaviorFlags(cfg) {
    const gentle = !!cfg?.behavior?.gentle;
    const animate = !!cfg?.behavior?.animate;
    document.body.dataset.gentle = gentle ? "1" : "0";
    document.body.dataset.animate = animate ? "1" : "0";
  }

  function applyTheme(cfg) {
    const accent = String(cfg?.ui?.accent || "#7c5cff");
    const radius = Number(cfg?.ui?.cardRadius ?? 16);
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty(
      "--card-radius",
      (isFinite(radius) ? radius : 16) + "px"
    );
    applyBehaviorFlags(cfg);
  }

  // ===== History =====
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveSessionHistory(final) {
    const history = loadHistory();
    history.unshift({
      id: safeId(),
      timestamp: new Date().toISOString(),
      final, // "YES" or "NO"
      loopCount,
      answers: [...answers],
    });
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    } catch {}
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    showHistory();
  }

  // ===============================
  // A/B Header
  // ===============================
  function mountABHeader() {
    if (document.getElementById("abHeader")) return;

    const header = document.createElement("div");
    header.id = "abHeader";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";
    header.style.padding = "10px 12px";
    header.style.position = "sticky";
    header.style.top = "0";
    header.style.zIndex = "999";
    header.style.backdropFilter = "blur(8px)";
    header.style.background = "rgba(255,255,255,0.06)";
    header.style.borderBottom = "1px solid rgba(255,255,255,0.08)";

    header.innerHTML = `
      <div style="font-weight:800;">TOTONOE</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button id="modeA">A</button>
        <button id="modeB">B</button>
        <button id="openLab" style="display:none;">🧪 Code Lab</button>
      </div>
    `;

    document.body.prepend(header);

    const apply = () => {
      const mode = getMode();
      document.body.dataset.mode = mode;
      document.getElementById("modeA").className = mode === "A" ? "primary" : "";
      document.getElementById("modeB").className = mode === "B" ? "primary" : "";
      document.getElementById("openLab").style.display = mode === "B" ? "inline-block" : "none";
    };

    document.getElementById("modeA").addEventListener("click", () => {
      setMode("A");
      apply();
      renderQuestion(true);
    });

    document.getElementById("modeB").addEventListener("click", () => {
      setMode("B");
      apply();
      showCodeLab();
    });

    document.getElementById("openLab").addEventListener("click", showCodeLab);

    apply();
  }

  // ===============================
  // B mode: Code Lab (safe JSON)
  // ===============================
  function applyCodeLabConfig(cfg) {
    // ✅ validate questions
    const q = Array.isArray(cfg?.questions)
      ? cfg.questions.map((s) => String(s || "").trim()).filter(Boolean)
      : null;

    if (!q || q.length === 0) throw new Error("questions は1つ以上必要です");

    // 反映
    questions = [...q];
    saveQuestions(questions);

    // answers の長さ合わせ
    while (answers.length < questions.length) answers.push("");
    if (answers.length > questions.length) answers.length = questions.length;
    idx = Math.min(idx, questions.length - 1);

    // Theme/behavior
    applyTheme(cfg);
  }

  function showCodeLab() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    const cfg = loadCodeLabConfig();
    const initialText = JSON.stringify(cfg, null, 2);

    card.innerHTML = `
      <p class="qtitle">🧪 Bモード：Code Lab（疑似コーディング体験）</p>
      <p class="small muted">JSONを編集 → Applyで即反映（危険なJSは実行しません）</p>

      <textarea id="codeLabArea" spellcheck="false"
        style="
          width:100%;
          height:320px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size:12px;
          line-height:1.5;
          padding:12px;
          border-radius:12px;
        "
      >${escapeHtml(initialText)}</textarea>

      <div class="row" style="margin-top:12px;">
        <button id="btnBackToApp">← アプリに戻る</button>
        <button id="btnResetLab">Reset</button>
        <button class="primary" id="btnApplyLab" style="margin-left:auto;">Apply / Run</button>
      </div>

      <p class="small muted" style="margin-top:10px;">
        例）questions配列を増やす / ui.accentを変える / behavior.animateをfalseにする
      </p>
    `;

    app.appendChild(card);

    document.getElementById("btnBackToApp").addEventListener("click", () => {
      renderQuestion(true);
    });

    document.getElementById("btnResetLab").addEventListener("click", () => {
      if (!confirm("Code Lab設定を初期化しますか？")) return;
      const d = getDefaultCodeLabConfig();
      saveCodeLabConfig(d);
      applyTheme(d);
      showCodeLab();
    });

    document.getElementById("btnApplyLab").addEventListener("click", () => {
      const raw = document.getElementById("codeLabArea").value;
      try {
        const parsed = JSON.parse(raw);
        applyCodeLabConfig(parsed);
        saveCodeLabConfig(parsed);
        alert("反映しました！（アプリに戻って確認できます）");
      } catch (e) {
        alert("JSONエラー or 設定エラー：\n" + (e?.message || String(e)));
      }
    });
  }

  // ===============================
  // Question Editor (UI)
  // ===============================
  function showQuestionEditor() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";

    const title = document.createElement("p");
    title.className = "qtitle";
    title.textContent = "⚙ 質問を編集（かんたん）";

    const note = document.createElement("p");
    note.className = "small";
    note.style.marginTop = "8px";
    note.textContent = "※ この設定は、このブラウザ（あなたの端末）だけに保存されます。";

    const form = document.createElement("div");
    form.style.display = "grid";
    form.style.gap = "10px";
    form.style.marginTop = "14px";

    const draft = [...questions];
    const textareas = [];

    for (let i = 0; i < draft.length; i++) {
      const label = document.createElement("p");
      label.className = "small";
      label.style.margin = "0";
      label.innerHTML = `<b>Q${i + 1}</b>`;

      const ta = document.createElement("textarea");
      ta.rows = 2;
      ta.value = draft[i] || "";
      ta.placeholder = `Q${i + 1} の質問文`;
      ta.addEventListener("input", () => {
        draft[i] = ta.value;
      });

      textareas.push(ta);
      form.appendChild(label);
      form.appendChild(ta);
    }

    const row = document.createElement("div");
    row.className = "row";
    row.style.marginTop = "14px";

    const btnBack = document.createElement("button");
    btnBack.textContent = "← 戻る";

    const btnReset = document.createElement("button");
    btnReset.textContent = "初期に戻す";

    const btnSave = document.createElement("button");
    btnSave.textContent = "保存";
    btnSave.className = "primary";
    btnSave.style.marginLeft = "auto";

    row.appendChild(btnBack);
    row.appendChild(btnReset);
    row.appendChild(btnSave);

    const hint = document.createElement("p");
    hint.className = "small";
    hint.style.marginTop = "10px";
    hint.textContent = "保存すると次の質問から反映されます。履歴は消えません。";

    card.appendChild(title);
    card.appendChild(note);
    card.appendChild(form);
    card.appendChild(row);
    card.appendChild(hint);
    app.appendChild(card);

    btnBack.addEventListener("click", () => {
      renderQuestion(true);
    });

    btnReset.addEventListener("click", () => {
      if (!confirm("質問を初期状態に戻しますか？")) return;
      questions = [...DEFAULT_QUESTIONS];
      saveQuestions(questions);

      while (answers.length < questions.length) answers.push("");
      if (answers.length > questions.length) answers.length = questions.length;

      idx = Math.min(idx, questions.length - 1);
      renderQuestion(true);
    });

    btnSave.addEventListener("click", () => {
      const cleaned = textareas
        .map((ta) => String(ta.value || "").trim())
        .filter(Boolean);

      if (cleaned.length === 0) {
        alert("1つ以上、質問文を入力してください。");
        return;
      }

      questions = [...cleaned];
      saveQuestions(questions);

      while (answers.length < questions.length) answers.push("");
      if (answers.length > questions.length) answers.length = questions.length;

      idx = Math.min(idx, questions.length - 1);
      renderQuestion(true);
    });
  }

  // ===============================
  // Prompt build
  // ===============================
  function buildPromptText(questions, answers) {
    const lines = [];
    lines.push("以下は思考整理メモです。");
    lines.push("この内容をもとに、次の2点だけを出してください：");
    lines.push("1) 要点の整理（箇条書き）");
    lines.push("2) 見落としがちな視点（押し付けず、候補として）");
    lines.push("");
    lines.push("【思考整理メモ】");

    for (let i = 0; i < questions.length; i++) {
      lines.push(`${questions[i]}`);
      lines.push(answers[i] ? answers[i] : "（未入力）");
      lines.push("");
    }

    if (answers.length > questions.length) {
      lines.push("【追加メモ】");
      lines.push(answers[answers.length - 1]);
      lines.push("");
    }

    lines.push("※助言や断定は避け、選択肢として提案してください。");
    return lines.join("\n");
  }

  // ===============================
  // UI: Main flow
  // ===============================
  function renderQuestion(prefill = false) {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    const title = document.createElement("p");
    title.className = "qtitle";
    title.textContent = `Q${idx + 1}. ${questions[idx]}`;

    const textarea = document.createElement("textarea");
    textarea.rows = 4;
    textarea.placeholder = "ここに入力（短くてもOK）";
    textarea.value = prefill ? (answers[idx] || "") : "";

    const row = document.createElement("div");
    row.className = "row";

    const btnBack = document.createElement("button");
    btnBack.textContent = "← 戻る";
    btnBack.disabled = idx === 0;

    const btnNext = document.createElement("button");
    btnNext.textContent = idx < questions.length - 1 ? "次へ →" : "最後へ →";
    btnNext.className = "primary";

    const btnHistory = document.createElement("button");
    btnHistory.textContent = "🗂 履歴";
    btnHistory.style.marginLeft = "auto";

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "⚙ 質問を編集";

    row.appendChild(btnBack);
    row.appendChild(btnNext);
    row.appendChild(btnHistory);
    row.appendChild(btnEdit);

    card.appendChild(title);
    card.appendChild(textarea);
    card.appendChild(row);
    app.appendChild(card);

    textarea.focus();

    btnBack.addEventListener("click", () => {
      answers[idx] = textarea.value.trim();
      idx = Math.max(0, idx - 1);
      renderQuestion(true);
    });

    btnNext.addEventListener("click", () => {
      answers[idx] = textarea.value.trim();
      idx++;

      if (idx < questions.length) {
        renderQuestion(true);
      } else {
        showFinalQuestion();
      }
    });

    btnHistory.addEventListener("click", showHistory);
    btnEdit.addEventListener("click", showQuestionEditor);
  }

  function showFinalQuestion() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    card.innerHTML = `
      <p class="qtitle">最後の確認</p>
      <p>ここまで整理して、いったん区切ってもいい？</p>
      <div class="row">
        <button class="primary" id="btnYes">YES</button>
        <button id="btnNo">NO</button>
        <button id="btnHistory" style="margin-left:auto;">🗂 履歴</button>
      </div>
      <p class="muted small">YES：ここで区切る ／ NO：もう少し整理を続ける</p>
    `;

    app.appendChild(card);

    document.getElementById("btnYes").addEventListener("click", () => finalAnswer(true));
    document.getElementById("btnNo").addEventListener("click", () => finalAnswer(false));
    document.getElementById("btnHistory").addEventListener("click", showHistory);
  }

  function finalAnswer(isYes) {
    const final = isYes ? "YES" : "NO";
    saveSessionHistory(final);

    if (isYes) showResult();
    else showNoBridge();
  }

  // NO側（Aとしての既存）も残しつつ、ここは後で“B演出”に寄せてもOK
  function showNoBridge() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    card.innerHTML = `
      <p class="qtitle">OK。まだ引っかかりが残ってる感じだね。</p>
      <p class="small">次はどっちで整理する？</p>
      <div class="row" style="flex-direction:column; gap:10px;">
        <button class="primary" id="btnLoop">🔁 もう一周する（回答を編集）</button>
        <button id="btnDeep">🎯 引っかかりだけ深掘り</button>
        <button id="btnHistory" style="margin-left:auto;">🗂 履歴</button>
      </div>
    `;

    app.appendChild(card);

    document.getElementById("btnLoop").addEventListener("click", restartLoop);
    document.getElementById("btnDeep").addEventListener("click", deepDiveOne);
    document.getElementById("btnHistory").addEventListener("click", showHistory);
  }

  function restartLoop() {
    loopCount += 1;
    idx = 0;
    renderQuestion(true);
  }

  function deepDiveOne() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    card.innerHTML = `
      <p class="qtitle">🎯 どこが一番引っかかってる？</p>
      <textarea id="deepInput" rows="3" placeholder="例：決め手がない / 不安 / 情報不足 など"></textarea>
      <div class="row">
        <button class="primary" id="btnDeepOk">整理して続ける</button>
        <button id="btnBackFinal">← 戻る</button>
      </div>
      <p class="muted">※ 入れた内容はメモとして残します。</p>
    `;

    app.appendChild(card);

    const deepInput = document.getElementById("deepInput");
    deepInput.focus();

    document.getElementById("btnBackFinal").addEventListener("click", showFinalQuestion);
    document.getElementById("btnDeepOk").addEventListener("click", () => {
      const v = deepInput.value.trim();
      if (!v) return;
      answers.push(`【引っかかりメモ】${v}`);
      restartLoop();
    });
  }

  function generateGentleOutput(a1, a2, a3, a4, a5) {
    return [
      "🧩 TOTONOEまとめ（やさしい出力）",
      "",
      `① 状況（事実）\n${a1 || "（未入力）"}`,
      "",
      `② 気持ち\n${a2 || "（未入力）"}`,
      "",
      `③ 引っかかり\n${a3 || "（未入力）"}`,
      "",
      `④ 本当はどうしたい\n${a4 || "（未入力）"}`,
      "",
      `⑤ 次の一歩（小さくてOK）\n${a5 || "（未入力）"}`,
      "",
      "やさしい補助：完璧に書けなくても大丈夫。ここまで言葉にできた時点で前進です。",
    ].join("\n");
  }

  function showResult() {
    app.innerHTML = "";

    const output = generateGentleOutput(
      answers[0] || "",
      answers[1] || "",
      answers[2] || "",
      answers[3] || "",
      answers[4] || ""
    );

    const memo = answers.length > questions.length ? (answers[answers.length - 1] || "") : "";
    const promptText = buildPromptText(questions, answers);

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    card.innerHTML = `
      <p class="qtitle">結果</p>

      <pre style="white-space:pre-wrap; margin:0;">${escapeHtml(output)}</pre>

      ${
        memo
          ? `
        <p class="small" style="margin-top:12px;">
          <b>メモ</b><br>${escapeHtml(memo)}
        </p>
      `
          : ""
      }

      <div class="row">
        <button class="primary" id="btnRestart">最初から</button>
        <button id="btnHistory" style="margin-left:auto;">🗂 履歴</button>
      </div>

      <hr style="margin:24px 0;">

      <p class="qtitle">🧠 コピー用プロンプト（AIに貼る用）</p>

      <textarea id="promptText" readonly
        style="width:100%;height:220px;white-space:pre-wrap; padding:12px; border-radius:12px;">${escapeHtml(
          promptText
        )}</textarea>

      <div class="row" style="margin-top:12px;">
        <button class="primary" id="btnCopyPrompt">📋 プロンプトをコピー</button>
      </div>
    `;

    app.appendChild(card);

    document.getElementById("btnCopyPrompt").addEventListener("click", async () => {
      const text = document.getElementById("promptText").value;
      try {
        await navigator.clipboard.writeText(text);
        alert("プロンプトをコピーしました");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("プロンプトをコピーしました（互換コピー）");
      }
    });

    document.getElementById("btnRestart").addEventListener("click", () => {
      idx = 0;
      loopCount = 0;

      for (let i = 0; i < questions.length; i++) answers[i] = "";
      answers.length = questions.length;

      renderQuestion(false);
    });

    document.getElementById("btnHistory").addEventListener("click", showHistory);
  }

  function showHistory() {
    const history = loadHistory();
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";
    card.style.borderRadius = "var(--card-radius, 16px)";

    if (history.length === 0) {
      card.innerHTML = `
        <p class="qtitle">🗂 履歴</p>
        <p>履歴はまだないよ。</p>
        <div class="row">
          <button class="primary" id="btnBack">← 戻る</button>
        </div>
      `;
      app.appendChild(card);
      document.getElementById("btnBack").addEventListener("click", showFinalQuestion);
      return;
    }

    const list = history.slice(0, 10).map((h) => {
      const date = new Date(h.timestamp).toLocaleString("ja-JP");
      const mini = (h.answers || []).join(" / ");
      return `
        <div class="history-item">
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <span class="badge">${escapeHtml(h.final)}</span>
            <span class="muted">${escapeHtml(date)}</span>
            <span class="muted">周回:${escapeHtml(String(h.loopCount))}</span>
          </div>
          <div class="small" style="margin-top:6px;">${escapeHtml(mini.slice(0, 140))}${mini.length > 140 ? "..." : ""}</div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <p class="qtitle">🗂 履歴（最新10件）</p>
      <div class="history-list">${list}</div>
      <div class="row">
        <button class="primary" id="btnBack">← 戻る</button>
        <button id="btnClear" style="margin-left:auto;">履歴を消す</button>
      </div>
    `;

    app.appendChild(card);

    document.getElementById("btnBack").addEventListener("click", showFinalQuestion);
    document.getElementById("btnClear").addEventListener("click", clearHistory);
  }

  // ===============================
  // Boot
  // ===============================
  // Apply last saved codelab theme if exists
  const savedLab = loadCodeLabConfig();
  applyTheme(savedLab);

  mountABHeader();

  // Start
  if (getMode() === "B") {
    showCodeLab();
  } else {
    renderQuestion(false);
  }
});

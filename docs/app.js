const QUESTIONS_KEY = "totonoe_questions";

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

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (!app) {
    // #app が無いと描画できない
    console.error("index.html に <div id='app'></div> がありません");
    return;
  }

  // ===== 設定 =====
  let questions = loadQuestions([
  "① 状況（事実）：いま何が起きてる？",
  "② 気持ち：どう感じてる？",
  "③ 引っかかり：どこがモヤる？",
  "④ 本当はどうしたい：理想は？",
  "⑤ 次の一歩（小さくてOK）：何からやる？",
]);

questions = loadQuestions(questions);


  // ===== 状態 =====
  let idx = 0;
  let loopCount = 0;
  const answers = Array(questions.length).fill("");

  // ===== ユーティリティ =====
  
function saveQuestions(list) {
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(list));
  } catch (e) {}
}


  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
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
  note.textContent =
    "※ この設定は、このブラウザ（あなたの端末）だけに保存されます。";

  const form = document.createElement("div");
  form.style.display = "grid";
  form.style.gap = "10px";
  form.style.marginTop = "14px";

  // いまの質問を編集用にコピー
  const draft = [...questions];

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
  hint.textContent =
    "保存すると次の質問から反映されます。履歴は消えません。";

  card.appendChild(title);
  card.appendChild(note);
  card.appendChild(form);
  card.appendChild(row);
  card.appendChild(hint);

  app.appendChild(card);

  // ===== イベント =====

  btnBack.addEventListener("click", () => {
    // 編集せず戻る
    renderQuestion(true);
  });

  btnReset.addEventListener("click", () => {
    if (!confirm("質問を初期状態に戻しますか？")) return;

    // 初期質問（あなたの現行デフォルトに合わせて書いてOK）
    const defaults = [
      "① 状況（事実）：いま何が起きてる？",
      "② 気持ち：どう感じてる？",
      "③ 引っかかり：どこがモヤる？",
      "④ 本当はどうしたい：理想は？",
      "⑤ 次の一歩（小さくてOK）：何からやる？",
    ];

    // localStorageに保存（質問編集の保存先キー）
    try {
      localStorage.setItem("totonoe_questions", JSON.stringify(defaults));
    } catch (e) {}

    // 反映
    questions = [...defaults];

    // いまの回答配列の長さがズレるのを防ぐ
    if (typeof answers !== "undefined") {
      while (answers.length < questions.length) answers.push("");
      if (answers.length > questions.length) answers.length = questions.length;
    }

    idx = Math.min(idx, questions.length - 1);
    renderQuestion(true);
  });

  btnSave.addEventListener("click", () => {
    const cleaned = draft
      .map((s) => String(s || "").trim())
      .filter((s) => s.length > 0);

    if (cleaned.length === 0) {
      alert("1つ以上、質問文を入力してください。");
      return;
    }

    // もし5問固定にしたいなら、ここで enforce
    // 例：5問より多い場合は先頭5つだけ、少ない場合は不足分を埋める等
    // 今回は「入力された分だけ採用」にしておく

    try {
      localStorage.setItem("totonoe_questions", JSON.stringify(cleaned));
    } catch (e) {}

    questions = [...cleaned];

    // answers配列の長さを合わせる
    if (typeof answers !== "undefined") {
      while (answers.length < questions.length) answers.push("");
      if (answers.length > questions.length) answers.length = questions.length;
    }

    idx = Math.min(idx, questions.length - 1);
    renderQuestion(true);
  });
}


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

  // 深掘りメモがある場合（answersが増えてる時）
  if (answers.length > questions.length) {
    lines.push("【追加メモ】");
    lines.push(answers[answers.length - 1]);
    lines.push("");
  }

  lines.push("※助言や断定は避け、選択肢として提案してください。");
  return lines.join("\n");
}

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
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      timestamp: new Date().toISOString(),
      final,          // "YES" or "NO"
      loopCount,
      answers: [...answers],
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    showHistory();
  }

  // ===== 画面描画 =====
  function renderQuestion(prefill = false) {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";

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
    btnBack.disabled = (idx === 0);

    const btnNext = document.createElement("button");
    btnNext.textContent = (idx < questions.length - 1) ? "次へ →" : "最後へ →";
    btnNext.className = "primary";

    const btnHistory = document.createElement("button");
    btnHistory.textContent = "🗂 履歴";
    btnHistory.style.marginLeft = "auto";

    row.appendChild(btnBack);
    row.appendChild(btnNext);
    row.appendChild(btnHistory);
    const btnEdit = document.createElement("button");
btnEdit.textContent = "⚙ 質問を編集";
btnEdit.addEventListener("click", showQuestionEditor);
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
  }
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
  note.textContent =
    "※ この設定は、このブラウザ（あなたの端末）だけに反映されます。";

  const form = document.createElement("div");
  form.style.display = "grid";
  form.style.gap = "10px";
  form.style.marginTop = "14px";

  // 編集用コピー
  const draft = questions.map(q => String(q || ""));

  const textareas = [];

  for (let i = 0; i < draft.length; i++) {
    const label = document.createElement("p");
    label.className = "small";
    label.style.margin = "0";
    label.innerHTML = `<b>Q${i + 1}</b>`;

    const ta = document.createElement("textarea");
    ta.rows = 2;
    ta.placeholder = `Q${i + 1} の質問文`;
    ta.value = draft[i];

    textareas.push(ta);

    form.appendChild(label);
    form.appendChild(ta);
  }

  const row = document.createElement("div");
  row.className = "row";
  row.style.marginTop = "14px";

  const btnBack = document.createElement("button");
  btnBack.textContent = "← 戻る";

  const btnSave = document.createElement("button");
  btnSave.textContent = "反映する";
  btnSave.className = "primary";
  btnSave.style.marginLeft = "auto";

  row.appendChild(btnBack);
  row.appendChild(btnSave);

  card.appendChild(title);
  card.appendChild(note);
  card.appendChild(form);
  card.appendChild(row);

  app.appendChild(card);

  btnBack.addEventListener("click", () => {
    renderQuestion(true);
  });

  btnSave.addEventListener("click", () => {
    const cleaned = textareas
      .map(ta => ta.value.trim())
      .filter(Boolean);

    if (cleaned.length === 0) {
      alert("1つ以上、質問文を入力してください。");
      return;
    }

    // 反映（questions は配列なので中身だけ差し替える）
    questions.length = 0;
    cleaned.forEach(q => questions.push(q));
    saveQuestions(questions);


    // 回答配列の長さも合わせる（ズレ防止）
    while (answers.length < questions.length) answers.push("");
    if (answers.length > questions.length) answers.length = questions.length;

    idx = 0;
    renderQuestion(false);
  });
}



  function showFinalQuestion() {
  app.innerHTML = "";

  const card = document.createElement("div");
  card.className = "card fade-in";

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

  function showNoBridge() {
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";

    card.innerHTML = `
      <p class="qtitle">OK。まだ引っかかりが残ってる感じだね。</p>
      <p class="small">次はどっちで整理する？</p>
      <div class="row">
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
      // メモとして末尾に追加（履歴にも残る）
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
      "やさしい補助：完璧に書けなくても大丈夫。ここまで言葉にできた時点で前進です。"
    ].join("\n");
  }

 function showResult() {
  app.innerHTML = "";

  // ✅ ここで「結果用テキスト」を必ず作る（これが無いと真っ白になる）
  const output = generateGentleOutput(
    answers[0] || "",
    answers[1] || "",
    answers[2] || "",
    answers[3] || "",
    answers[4] || ""
  );

  // 深掘りメモ（5問より後に1つ追加されている想定）
  const memo = answers.length > questions.length ? (answers[answers.length - 1] || "") : "";

  // ✅ コピー用プロンプト（AIに貼る用）
  const promptText = buildPromptText(questions, answers);

  const card = document.createElement("div");
  card.className = "card fade-in";

  card.innerHTML = `
    <p class="qtitle">結果</p>

    <pre style="white-space:pre-wrap; margin:0;">${escapeHtml(output)}</pre>

    ${memo ? `
      <p class="small" style="margin-top:12px;">
        <b>メモ</b><br>${escapeHtml(memo)}
      </p>
    ` : ""}

    <div class="row">
      <button class="primary" id="btnRestart">最初から</button>
      <button id="btnHistory" style="margin-left:auto;">🗂 履歴</button>
    </div>

    <hr style="margin:24px 0;">

    <p class="qtitle">🧠 コピー用プロンプト（AIに貼る用）</p>

    <textarea id="promptText" readonly
      style="width:100%;height:220px;white-space:pre-wrap; padding:12px; border-radius:12px;">
${escapeHtml(promptText)}
    </textarea>

    <div class="row" style="margin-top:12px;">
      <button class="primary" id="btnCopyPrompt">📋 プロンプトをコピー</button>
    </div>
  `;

  app.appendChild(card);

  // ✅ コピーボタン
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

  // ✅ 最初から
  document.getElementById("btnRestart").addEventListener("click", () => {
    idx = 0;
    loopCount = 0;

    // 回答をリセット（5問分に戻す）
    for (let i = 0; i < questions.length; i++) answers[i] = "";
    answers.length = questions.length;

    renderQuestion(false);
  });

  // ✅ 履歴
  document.getElementById("btnHistory").addEventListener("click", showHistory);
}

  
  function showHistory() {
    const history = loadHistory();
    app.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card fade-in";

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

    const list = history.slice(0, 10).map(h => {
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

  // ===== 起動 =====
  renderQuestion(false);
});

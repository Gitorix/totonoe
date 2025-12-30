/* TOTONOE - single file app.js (GitHub Pages OK)
   - A: TOTONOE（質問に答える）
   - B: Code Lab（JSONを手打ちして質問を編集・追加）
   - Apply / Run：JSONを安全に読み込み、質問とUI設定だけ反映（JS実行なし）
*/

(() => {
  // ---------- Storage Keys ----------
  const QUESTIONS_KEY = "totonoe_questions";
  const UI_KEY = "totonoe_ui";
  const BEHAVIOR_KEY = "totonoe_behavior";
  const MODE_KEY = "totonoe_mode";

  // ---------- Defaults ----------
  const DEFAULT_QUESTIONS = [
    "① 状況（事実）：いま何が起きてる？",
    "② 気持ち：どう感じてる？",
    "③ 引っかかり：どこがモヤる？",
    "④ 本音：本当はどうしたい？理想は？",
    "⑤ 次の一歩（小さくてOK）：何からやる？",
  ];

  const DEFAULT_UI = {
    accent: "#7c5cff",
    cardRadius: 16,
  };

  const DEFAULT_BEHAVIOR = {
    gentle: true,
    animate: true,
  };

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);

  function safeParseJSON(text) {
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function sanitizeQuestions(arr) {
    if (!Array.isArray(arr)) return null;
    const cleaned = arr
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .slice(0, 50); // 上限（好きに変えてOK）
    return cleaned.length ? cleaned : null;
  }

  function clampNum(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.min(max, Math.max(min, x));
  }

  // ---------- State ----------
  let state = {
    mode: loadJSON(MODE_KEY, "A"),
    questions: loadJSON(QUESTIONS_KEY, DEFAULT_QUESTIONS),
    ui: { ...DEFAULT_UI, ...loadJSON(UI_KEY, DEFAULT_UI) },
    behavior: { ...DEFAULT_BEHAVIOR, ...loadJSON(BEHAVIOR_KEY, DEFAULT_BEHAVIOR) },
    idx: 0,
    answers: [],
    seedFixed: "",
  };

  // ---------- Mount ----------
  document.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app");
    if (!app) return;

    injectBaseUI(app);
    bindHeader();
    render();
  });

  function injectBaseUI(app) {
    app.innerHTML = `
      <style>
        :root { --accent: ${state.ui.accent}; --radius: ${state.ui.cardRadius}px; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111; background: #fff; }
        .wrap { max-width: 980px; margin: 0 auto; padding: 28px 22px 60px; }
        .topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 18px; }
        .brand { font-weight: 800; letter-spacing: .3px; }
        .controls { display:flex; gap:10px; align-items:center; }
        .btn { border: 1px solid #e6e6e6; background: #fff; padding: 10px 14px; border-radius: 14px; cursor: pointer; font-weight: 650; }
        .btn:hover { border-color: #d6d6d6; }
        .btn.primary { border-color: transparent; background: var(--accent); color: #fff; }
        .btn.ghost { background:#fff; }
        .btn.active { outline: 2px solid var(--accent); outline-offset: 2px; }
        .card { border: 1px solid #eee; border-radius: var(--radius); padding: 18px; background: #fff; }
        .muted { color:#666; font-size: 13px; }
        .title { font-size: 18px; font-weight: 800; margin: 0 0 8px; }
        .row { display:flex; gap:12px; align-items:center; justify-content:space-between; }
        .spacer { height: 12px; }
        textarea, input[type="text"] {
          width: 100%; border: 1px solid #e6e6e6; border-radius: 14px; padding: 12px 12px;
          font-size: 14px; line-height: 1.5; outline: none;
        }
        textarea:focus, input[type="text"]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,92,255,.12); }
        .q { font-weight: 800; margin: 0 0 10px; }
        .progress { font-size: 13px; color:#555; }
        .pill { display:inline-flex; gap:8px; align-items:center; border: 1px solid #eee; padding: 7px 10px; border-radius: 999px; font-size: 13px; color:#333; }
        .fadeIn { animation: fadeIn .18s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
        pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.55; }
        .danger { color:#b00020; }
        .codehint { font-size: 13px; color:#444; }
        .grid { display:grid; grid-template-columns: 1fr; gap: 14px; }
        @media(min-width: 860px){ .grid { grid-template-columns: 1fr 1fr; } }
      </style>

      <div class="wrap">
        <div class="topbar">
          <div class="brand">TOTONOE</div>
          <div class="controls">
            <button id="btnA" class="btn">A</button>
            <button id="btnB" class="btn">B</button>
            <button id="btnLab" class="btn">🧪 Code Lab</button>
          </div>
        </div>

        <div id="view"></div>
      </div>
    `;
  }

  function bindHeader() {
    $("#btnA").addEventListener("click", () => setMode("A"));
    $("#btnB").addEventListener("click", () => setMode("B"));
    $("#btnLab").addEventListener("click", () => setMode("B")); // 表示は同じ（B＝Code Lab）
  }

  function setMode(mode) {
    state.mode = mode;
    saveJSON(MODE_KEY, mode);
    render();
  }

  function applyActiveButtons() {
    $("#btnA").classList.toggle("active", state.mode === "A");
    $("#btnB").classList.toggle("active", state.mode === "B");
    $("#btnLab").classList.toggle("active", state.mode === "B");
  }

  // ---------- Render ----------
  function render() {
    applyActiveButtons();
    // reflect UI vars
    document.documentElement.style.setProperty("--accent", state.ui.accent);
    document.documentElement.style.setProperty("--radius", `${state.ui.cardRadius}px`);

    const view = $("#view");
    view.innerHTML = "";

    if (state.mode === "A") renderApp(view);
    else renderCodeLab(view);
  }

  // ---------- A: TOTONOE ----------
  function renderApp(view) {
    const animate = !!state.behavior.animate;

    // seed（Code Lab入力）を「開始時に固定」できるようにしておく
    const currentSeed = (window.TOTONOE && window.TOTONOE.codelabText) ? window.TOTONOE.codelabText : "";

    const card = document.createElement("div");
    card.className = `card ${animate ? "fadeIn" : ""}`;

    // 進行中 or 結果
    if (state.idx < state.questions.length) {
      const q = state.questions[state.idx];
      const prev = state.answers[state.idx] || "";

      card.innerHTML = `
        <div class="row">
          <div class="pill">Aモード：TOTONOE</div>
          <div class="progress">${state.idx + 1} / ${state.questions.length}</div>
        </div>
        <div class="spacer"></div>

        <div class="q">${escapeHTML(q)}</div>
        <textarea id="answer" placeholder="ここに回答…">${escapeHTML(prev)}</textarea>

        <div class="spacer"></div>
        <div class="row">
          <button id="back" class="btn ghost" ${state.idx === 0 ? "disabled" : ""}>← 戻る</button>
          <div style="display:flex; gap:10px;">
            <button id="restart" class="btn ghost">Reset</button>
            <button id="next" class="btn primary">${state.idx === state.questions.length - 1 ? "結果へ" : "次へ"}</button>
          </div>
        </div>

        <div class="spacer"></div>
        <div class="muted">
          ※ Code Labの文章がある場合、開始時に固定もできます（必要なら後でONにする）
        </div>
      `;

      view.appendChild(card);

      const answerEl = $("#answer");
      $("#back").addEventListener("click", () => {
        state.answers[state.idx] = answerEl.value;
        state.idx = Math.max(0, state.idx - 1);
        render();
      });

      $("#restart").addEventListener("click", () => {
        if (!confirm("回答をリセットする？")) return;
        state.idx = 0;
        state.answers = [];
        state.seedFixed = "";
        render();
      });

      $("#next").addEventListener("click", () => {
        // 開始時固定：最初の遷移タイミングでseedを確定（必要になったら使う）
        if (state.idx === 0 && !state.seedFixed) {
          state.seedFixed = currentSeed || "";
        }

        state.answers[state.idx] = answerEl.value;
        state.idx += 1;
        render();
      });

      return;
    }

    // Result
    const gentle = !!state.behavior.gentle;
    const summary = buildSummary(state.questions, state.answers);

    card.innerHTML = `
      <div class="row">
        <div class="pill">結果</div>
        <div class="progress">${state.questions.length} / ${state.questions.length}</div>
      </div>
      <div class="spacer"></div>

      <div class="title">まとめ</div>
      <div class="muted">${gentle ? "やさしく整理しました。" : "整理結果です。"}</div>
      <div class="spacer"></div>

      <div class="card" style="border:1px solid #f1f1f1; background:#fafafa;">
        <pre>${escapeHTML(summary)}</pre>
      </div>

      <div class="spacer"></div>
      <div class="row">
        <button id="restart2" class="btn ghost">Reset</button>
        <button id="back2" class="btn">← 戻る</button>
      </div>
    `;

    view.appendChild(card);

    $("#restart2").addEventListener("click", () => {
      if (!confirm("回答をリセットする？")) return;
      state.idx = 0;
      state.answers = [];
      state.seedFixed = "";
      render();
    });

    $("#back2").addEventListener("click", () => {
      state.idx = Math.max(0, state.questions.length - 1);
      render();
    });
  }

  function buildSummary(qs, ans) {
    const lines = [];
    for (let i = 0; i < qs.length; i++) {
      const a = (ans[i] || "").trim();
      lines.push(`${stripNumPrefix(qs[i])}\n${a ? a : "（未入力）"}\n`);
    }
    return lines.join("\n");
  }

  function stripNumPrefix(s) {
    // ①〜などの頭は残しても良いが、読みやすくしたいならここで整える
    return s;
  }

  // ---------- B: Code Lab ----------
  function renderCodeLab(view) {
    const animate = !!state.behavior.animate;

    const card = document.createElement("div");
    card.className = `card ${animate ? "fadeIn" : ""}`;

    const currentConfig = {
      questions: state.questions,
      ui: state.ui,
      behavior: state.behavior,
    };

    const initialText = JSON.stringify(currentConfig, null, 2);

    card.innerHTML = `
      <div class="row">
        <div class="pill">🧪 Bモード：Code Lab（疑似コーディング体験）</div>
        <div class="muted">JSONを編集 → Applyで即反映（危険なJSは実行しません）</div>
      </div>

      <div class="spacer"></div>

      <textarea id="editor" style="min-height: 360px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHTML(initialText)}</textarea>

      <div class="spacer"></div>

      <div class="row">
        <div style="display:flex; gap:10px;">
          <button id="backToApp" class="btn">← アプリに戻る</button>
          <button id="resetEditor" class="btn ghost">Reset</button>
        </div>
        <button id="apply" class="btn primary">Apply / Run</button>
      </div>

      <div class="spacer"></div>

      <div class="codehint">
        例：<code>questions</code>配列を増やす / <code>ui.accent</code>を変える / <code>behavior.animate</code>をfalseにする
        <div id="msg" class="muted" style="margin-top:8px;"></div>
      </div>
    `;

    view.appendChild(card);

    $("#backToApp").addEventListener("click", () => setMode("A"));

   $("#resetEditor").addEventListener("click", () => {
  if (!confirm("エディタを初期テンプレに戻す？（保存済みの設定は消えません）")) return;
  $("#editor").value = DEFAULT_TEMPLATE;
  setMsg("初期テンプレに戻しました。Applyで反映できます。");
});


    // 入力内容を共有（A開始時固定用にも使える）
    $("#editor").addEventListener("input", () => {
      window.TOTONOE = window.TOTONOE || {};
      window.TOTONOE.codelabText = $("#editor").value;
    });
    // 初期も入れておく
    window.TOTONOE = window.TOTONOE || {};
    window.TOTONOE.codelabText = $("#editor").value;

    $("#apply").addEventListener("click", () => {
      const text = $("#editor").value;
      const parsed = safeParseJSON(text);
      if (!parsed.ok) {
        setMsg("JSONの形式が正しくないで。カンマ/カッコを確認してな！", true);
        return;
      }

      const cfg = parsed.value;

      // questions
      const qs = sanitizeQuestions(cfg?.questions);
      if (!qs) {
        setMsg('questions は「文字列の配列」で、1つ以上入れてな！', true);
        return;
      }

      // ui（任意）
      const ui = {
        accent: typeof cfg?.ui?.accent === "string" ? cfg.ui.accent : state.ui.accent,
        cardRadius: clampNum(cfg?.ui?.cardRadius, 8, 28, state.ui.cardRadius),
      };

      // behavior（任意）
      const behavior = {
        gentle: typeof cfg?.behavior?.gentle === "boolean" ? cfg.behavior.gentle : state.behavior.gentle,
        animate: typeof cfg?.behavior?.animate === "boolean" ? cfg.behavior.animate : state.behavior.animate,
      };

      // 保存＆反映
      state.questions = qs;
      state.ui = ui;
      state.behavior = behavior;

      saveJSON(QUESTIONS_KEY, qs);
      saveJSON(UI_KEY, ui);
      saveJSON(BEHAVIOR_KEY, behavior);

      // TOTONOE側は最初からやり直し
      state.idx = 0;
      state.answers = [];
      state.seedFixed = "";

      setMsg("Apply 完了。Aモードに戻ると質問に反映されてるで。");
    });

    function setMsg(text, isError = false) {
      const msg = $("#msg");
      msg.textContent = text;
      msg.classList.toggle("danger", isError);
    }
  }

  // ---------- HTML Escape ----------
  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

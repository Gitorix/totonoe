/* TOTONOE - single file app.js (GitHub Pages OK)
   - A: TOTONOE（質問に答える）
   - B: Code Lab（JSONを手打ちして質問を編集・追加）
   - Apply / Run：JSONを安全に読み込み、質問/UI/挙動だけ反映（JS実行なし）
   - Apply後はBに残る（自分でAを押して確認）
   - 結果画面：結果をプロンプト化して「ワンクリックコピー」
   - Reset（Code Lab）：初期テンプレに戻す（即反映はしない）
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
    "④ 本当はどうしたい：理想は？",
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

  // ✅ Resetで必ず戻る「固定テンプレ」（壊しても復帰可能）
  const DEFAULT_TEMPLATE = JSON.stringify(
    {
      questions: [
        "① 状況（事実）：いま何が起きてる？",
        "② 気持ち：どう感じてる？",
        "③ 引っかかり：どこがモヤる？",
        "④ 本当はどうしたい：理想は？",
        "⑤ 次の一歩（小さくてOK）：何からやる？",
      ],
      ui: { accent: "#7c5cff", cardRadius: 16 },
      behavior: { gentle: true, animate: true },
    },
    null,
    2
  );

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

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- State ----------
  let state = {
    mode: loadJSON(MODE_KEY, "A"),
    questions: loadJSON(QUESTIONS_KEY, DEFAULT_QUESTIONS),
    ui: { ...DEFAULT_UI, ...loadJSON(UI_KEY, DEFAULT_UI) },
    behavior: { ...DEFAULT_BEHAVIOR, ...loadJSON(BEHAVIOR_KEY, DEFAULT_BEHAVIOR) },
    idx: 0,
    answers: [],
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
        .btn:disabled { opacity: .45; cursor: not-allowed; }
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
    $("#btnLab").addEventListener("click", () => setMode("B")); // B＝Code Lab
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
    document.documentElement.style.setProperty("--accent", state.ui.accent);
    document.documentElement.style.setProperty("--radius", `${state.ui.cardRadius}px`);

    const view = $("#view");
    view.innerHTML = "";

    if (state.mode === "A") renderApp(view);
    else renderCodeLab(view);
  }

  // ---------- A: TOTONOE ----------
  function renderApp(view) {
    // ✅ A表示のたびに「保存済み最新」を読み直す（BでApply→Aで即反映）
    state.questions = loadJSON(QUESTIONS_KEY, DEFAULT_QUESTIONS);
    state.ui = { ...DEFAULT_UI, ...loadJSON(UI_KEY, DEFAULT_UI) };
    state.behavior = { ...DEFAULT_BEHAVIOR, ...loadJSON(BEHAVIOR_KEY, DEFAULT_BEHAVIOR) };

    // idxが質問数を“超えて”はみ出した時だけ安全に戻す（結果表示 idx===length はOK）
    if (state.idx > state.questions.length) {
      state.idx = 0;
      state.answers = [];
    }

    const animate = !!state.behavior.animate;

    const card = document.createElement("div");
    card.className = `card ${animate ? "fadeIn" : ""}`;

    // --- 質問画面 ---
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
        render();
      });

      $("#next").addEventListener("click", () => {
        state.answers[state.idx] = answerEl.value;
        state.idx += 1; // 最後は idx===length になり、結果画面へ
        render();
      });

      return;
    }

    // --- 結果画面（idx === questions.length） ---
    const gentle = !!state.behavior.gentle;
    const summary = buildSummary(state.questions, state.answers);
    const promptText = buildPrompt(state.questions, state.answers);

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
        <button id="copyPrompt" class="btn">📋 プロンプトをコピー</button>
        <div style="display:flex; gap:10px;">
          <button id="restart2" class="btn ghost">Reset</button>
          <button id="back2" class="btn">← 戻る</button>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="muted">※コピーされるのは「AIに投げる用のプロンプト」です。</div>
    `;

    view.appendChild(card);

    $("#copyPrompt").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(promptText);
        alert("プロンプトをコピーしました！");
      } catch {
        alert("コピーに失敗しました。");
      }
    });

    $("#restart2").addEventListener("click", () => {
      if (!confirm("回答をリセットする？")) return;
      state.idx = 0;
      state.answers = [];
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
      lines.push(`${qs[i]}\n${a ? a : "（未入力）"}\n`);
    }
    return lines.join("\n");
  }

  // ✅ 結果を「AIに投げるプロンプト」に整形
  function buildPrompt(qs, ans) {
    const lines = [];
    lines.push("あなたは優秀な編集者/コーチです。以下の『思考整理の回答』を読み、");
    lines.push("1) 要点（3〜7個） 2) 本当の論点 3) 次の一歩（具体・小さく）を提案してください。");
    lines.push("出力は日本語で、箇条書き中心で。\n");
    lines.push("【回答】");

    for (let i = 0; i < qs.length; i++) {
      const a = (ans[i] || "").trim() || "（未入力）";
      lines.push(`${qs[i]}\n${a}\n`);
    }
    return lines.join("\n");
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

    // 初期表示は「現在の設定」
    const initialText = JSON.stringify(currentConfig, null, 2);

    card.innerHTML = `
      <div class="row">
        <div class="pill">🧪 Bモード：Code Lab（疑似コーディング体験）</div>
        <div class="muted">JSONを編集 → Applyで保存（JS実行なし）</div>
      </div>

      <div class="spacer"></div>

      <textarea id="editor" style="min-height: 360px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHTML(
        initialText
      )}</textarea>

      <div class="spacer"></div>

      <div class="row">
        <div style="display:flex; gap:10px;">
          <button id="backToApp" class="btn">← アプリに戻る</button>
          <button id="resetEditor" class="btn ghost">Reset（初期へ）</button>
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

    function setMsg(text, isError = false) {
      const msg = $("#msg");
      msg.textContent = text;
      msg.classList.toggle("danger", isError);
    }

    function applyFromText(text) {
      const parsed = safeParseJSON(text);
      if (!parsed.ok) {
        setMsg("JSONの形式が正しくないで。カンマ/カッコを確認してな！", true);
        return false;
      }

      const cfg = parsed.value;

      const qs = sanitizeQuestions(cfg?.questions);
      if (!qs) {
        setMsg('questions は「文字列の配列」で、1つ以上入れてな！', true);
        return false;
      }

      const ui = {
        accent: typeof cfg?.ui?.accent === "string" ? cfg.ui.accent : state.ui.accent,
        cardRadius: clampNum(cfg?.ui?.cardRadius, 8, 28, state.ui.cardRadius),
      };

      const behavior = {
        gentle: typeof cfg?.behavior?.gentle === "boolean" ? cfg.behavior.gentle : state.behavior.gentle,
        animate: typeof cfg?.behavior?.animate === "boolean" ? cfg.behavior.animate : state.behavior.animate,
      };

      // state更新
      state.questions = qs;
      state.ui = ui;
      state.behavior = behavior;

      // 保存
      saveJSON(QUESTIONS_KEY, qs);
      saveJSON(UI_KEY, ui);
      saveJSON(BEHAVIOR_KEY, behavior);

      // TOTONOE側は最初から（質問構成が変わるため）
      state.idx = 0;
      state.answers = [];

      return true;
    }

    // ✅ Apply後はBに残る（自分でAを押して確認）
    $("#apply").addEventListener("click", () => {
      const ok = applyFromText($("#editor").value);
      if (!ok) return;
      setMsg("Apply 完了。Aを押して反映を確認してな。");
    });

    // ✅ Resetは初期テンプレに戻すだけ（即反映しない）
    $("#resetEditor").addEventListener("click", () => {
      if (!confirm("初期テンプレに戻す？（Applyするまで反映されません）")) return;
      $("#editor").value = DEFAULT_TEMPLATE;
      setMsg("初期テンプレに戻しました。Applyで反映できます。");
    });
  }
})();

// --- 初期設定 ---
const questions = [
  "今、頭の中が少し散らかっている？",
  "やるべき事が多すぎると感じる？",
  "一つずつ整理したいと思っている？"
];

let currentIndex = 0;
const answers = [];

// --- ページ読み込み後に開始 ---
document.addEventListener("DOMContentLoaded", () => {
  renderQuestion();
});

// --- 画面描画 ---
function renderQuestion() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="question-box">
      <p class="question">${questions[currentIndex]}</p>

      <div class="buttons">
        <button id="yesBtn">YES</button>
        <button id="noBtn">NO</button>
      </div>
    </div>
  `;

  // 🔴 超重要：innerHTMLの「直後」にイベントを付ける
  document.getElementById("yesBtn").addEventListener("click", () => {
    handleAnswer(true);
  });

  document.getElementById("noBtn").addEventListener("click", () => {
    handleAnswer(false);
  });
}

// --- 回答処理 ---
function handleAnswer(answer) {
  answers.push(answer);

  currentIndex++;

  if (currentIndex < questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// --- 結果表示 ---
function showResult() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="result-box">
      <h2>お疲れさまでした</h2>
      <p>今の思考状態が整理されました。</p>
      <button id="restartBtn">最初から</button>
    </div>
  `;

  document.getElementById("restartBtn").addEventListener("click", () => {
    currentIndex = 0;
    answers.length = 0;
    renderQuestion();
  });
}

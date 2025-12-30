const questions = [
  "今、頭の中が少し散らかっている？",
  "やるべき事が多すぎると感じる？",
  "一つずつ整理したいと思っている？"
];

let currentIndex = 0;
const answers = [];

// ページが読み終わったら開始
document.addEventListener("DOMContentLoaded", () => {
  renderQuestion();
});

// 👉 イベント委譲（これが重要）
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-answer]");
  if (!btn) return;

  handleAnswer(btn.dataset.answer === "yes");
});

function renderQuestion() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="padding:16px">
      <p style="font-size:18px; line-height:1.6; margin-bottom:16px">
        ${questions[currentIndex]}
      </p>

      <div style="display:flex; gap:12px">
        <button data-answer="yes" style="flex:1; padding:14px">YES</button>
        <button data-answer="no"  style="flex:1; padding:14px">NO</button>
      </div>
    </div>
  `;
}

function handleAnswer(answer) {
  answers.push(answer);
  currentIndex++;

  if (currentIndex < questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:16px">
      <h2>お疲れさまでした</h2>
      <p>${answers.map(a => a ? "YES" : "NO").join(" / ")}</p>
      <button id="restart" style="margin-top:16px; padding:12px">
        最初から
      </button>
    </div>
  `;

  document.getElementById("restart").onclick = () => {
    currentIndex = 0;
    answers.length = 0;
    renderQuestion();
  };
}

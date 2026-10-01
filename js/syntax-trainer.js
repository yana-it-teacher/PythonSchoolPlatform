/**
 * Тренажер синтаксису команд Python для школярів
 * 4 захоплюючі режими: Конструктор коду, Знайди помилку, Встав пропущене, Спідран Бліц
 */

class SyntaxTrainer {
  constructor(containerId, gamification) {
    this.container = document.getElementById(containerId);
    this.gamification = gamification;
    this.currentMode = 'builder';
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.timer = null;
    this.timeLeft = 60;
    this.activeTask = null;

    this.initPuzzles();
  }

  initPuzzles() {
    // 1. Пазли для конструктора коду
    this.builderPuzzles = [
      {
        title: "Склади команду виведення вітання",
        tokens: ["print", "(", '"Привіт, друже!"', ")"],
        shuffled: ['"Привіт, друже!"', "print", ")", "("],
        hint: "Команда починається з print, потім відкривається дужка (..."
      },
      {
        title: "Склади рух черепашки вперед на 100 кроків",
        tokens: ["turtle", ".", "forward", "(", "100", ")"],
        shuffled: ["100", "forward", "turtle", ")", ".", "("],
        hint: "Модуль turtle, потім крапка, назва команди і відстань у дужках."
      },
      {
        title: "Склади заголовок циклу for на 5 повторів",
        tokens: ["for", "i", "in", "range", "(", "5", ")", ":"],
        shuffled: [")", "for", ":", "range", "i", "(", "5", "in"],
        hint: "for змінна in range(кількість): - не забудь двокрапку в кінці!"
      },
      {
        title: "Склади перевірку умови if з двокрапкою",
        tokens: ["if", "points", ">=", "100", ":"],
        shuffled: [":", "points", "if", "100", ">="],
        hint: "if умова : (обов'язково двокрапка в кінці)"
      },
      {
        title: "Склади читання цілого числа з клавіатури",
        tokens: ["age", "=", "int", "(", "input", "(", ")", ")"],
        shuffled: ["input", "=", ")", "int", "age", "(", ")", "("],
        hint: "Змінна = int(input())"
      },
      {
        title: "Склади зафарбовування фігури Черепашкою",
        tokens: ["turtle", ".", "fillcolor", "(", '"yellow"', ")"],
        shuffled: ['"yellow"', "fillcolor", ".", "(", "turtle", ")"],
        hint: "turtle.fillcolor(\"yellow\")"
      }
    ];

    // 2. Тести "Знайди правильний синтаксис / Знайди помилку"
    this.spotBugQuestions = [
      {
        question: "Який рядок написаний БЕЗ синтаксичних помилок?",
        options: [
          'print("Привіт, 5-й клас!")',
          'Print("Привіт, 5-й клас!")',
          'print "Привіт, 5-й клас!"',
          'print("Привіт, 5-й клас!\')'
        ],
        correct: 0,
        explanation: "Команда print пишеться маленькими літерами, з круглими дужками та парними лапками одного типу!"
      },
      {
        question: "У якому рядку правильно записано цикл for?",
        options: [
          'for i in range(10):',
          'for i in range(10)',
          'for (i = 0; i < 10; i++)',
          'loop i from 1 to 10:'
        ],
        correct: 0,
        explanation: "У Python обов'язково пишеться 'for i in range(10):' з двокрапкою в кінці."
      },
      {
        question: "Де правильно перевіряється умова рівності?",
        options: [
          'if score == 10:',
          'if score = 10:',
          'if score === 10;',
          'if (score = 10)'
        ],
        correct: 0,
        explanation: "Для перевірки рівності використовується подвійний знак '==', а один знак '=' — це присвоєння!"
      },
      {
        question: "Як правильно повернути черепашку ліворуч на 90 градусів?",
        options: [
          'turtle.left(90)',
          'turtle.turn_left(90)',
          'turtle.go(left, 90)',
          'left.turtle(90)'
        ],
        correct: 0,
        explanation: "Команда в turtle: turtle.left(кут) або скорочено turtle.lt(кут)."
      },
      {
        question: "Де правильно вказано заливку фігури?",
        options: [
          'turtle.begin_fill() ... turtle.end_fill()',
          'turtle.start_color() ... turtle.stop_color()',
          'turtle.fill_on() ... turtle.fill_off()',
          'turtle.paint(True)'
        ],
        correct: 0,
        explanation: "Заливка починається з begin_fill() і фіксується командою end_fill()."
      }
    ];

    // 3. Завдання "Встав пропущене слово"
    this.fillBlanks = [
      {
        codePrefix: "import ",
        codeSuffix: "\nturtle.forward(50)",
        answer: "turtle",
        options: ["turtle", "math", "random", "draw"],
        taskHint: "Який модуль треба імпортувати для роботи з графічною Черепашкою?"
      },
      {
        codePrefix: "",
        codeSuffix: " i in range(5):\n    print(i)",
        answer: "for",
        options: ["for", "while", "loop", "repeat"],
        taskHint: "Яке ключове слово починає цикл з лічильником?"
      },
      {
        codePrefix: "name = ",
        codeSuffix: '("Як тебе звати? ")',
        answer: "input",
        options: ["input", "read", "ask", "print"],
        taskHint: "Яка команда запитує дані з клавіатури у користувача?"
      },
      {
        codePrefix: "if number % 2 == 0:\n    print('Парне')\n",
        codeSuffix: ":\n    print('Непарне')",
        answer: "else",
        options: ["else", "then", "otherwise", "other"],
        taskHint: "Яке слово означає протилежну гілку в розгалуженні ('інакше')?"
      },
      {
        codePrefix: "turtle.",
        codeSuffix: "()\n# Тепер черепашка рухається без малювання лінії",
        answer: "penup",
        options: ["penup", "up_line", "fly", "jump"],
        taskHint: "Яка команда піднімає перо черепашки?"
      }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="trainer-header">
        <div class="trainer-title-wrap">
          <span class="trainer-icon">⚡</span>
          <div>
            <h2>Тренажер синтаксису Python</h2>
            <p>Прокачай швидкість написання команд, виправляй помилки та заробляй XP!</p>
          </div>
        </div>

        <div class="trainer-stats">
          <div class="trainer-badge">
            <span class="stat-icon">🎯</span>
            <div><span class="stat-lbl">Очки:</span> <b id="trainer-score">${this.score}</b></div>
          </div>
          <div class="trainer-badge">
            <span class="stat-icon">🔥</span>
            <div><span class="stat-lbl">Серія:</span> <b id="trainer-streak">${this.streak}</b></div>
          </div>
        </div>
      </div>

      <!-- Вкладки режимів -->
      <div class="trainer-modes-nav">
        <button class="mode-tab-btn ${this.currentMode === 'builder' ? 'active' : ''}" onclick="window.syntaxTrainer.switchMode('builder')">
          🧩 Конструктор коду
        </button>
        <button class="mode-tab-btn ${this.currentMode === 'spot' ? 'active' : ''}" onclick="window.syntaxTrainer.switchMode('spot')">
          🔍 Знайди помилку
        </button>
        <button class="mode-tab-btn ${this.currentMode === 'fill' ? 'active' : ''}" onclick="window.syntaxTrainer.switchMode('fill')">
          ✏️ Встав пропущене
        </button>
        <button class="mode-tab-btn ${this.currentMode === 'blitz' ? 'active' : ''}" onclick="window.syntaxTrainer.switchMode('blitz')">
          ⏱️ Спідран Бліц (60с)
        </button>
      </div>

      <!-- Контейнер завдання -->
      <div id="trainer-work-area" class="trainer-work-area">
        <!-- Рендериться динамічно -->
      </div>
    `;

    this.renderCurrentTask();
  }

  switchMode(mode) {
    this.currentMode = mode;
    this.currentQuestionIndex = 0;
    if (this.timer) clearInterval(this.timer);

    document.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.mode-tab-btn')).find(b => b.textContent.includes(
      mode === 'builder' ? 'Конструктор' : mode === 'spot' ? 'Знайди' : mode === 'fill' ? 'Встав' : 'Бліц'
    ));
    if (activeBtn) activeBtn.classList.add('active');

    this.renderCurrentTask();
  }

  renderCurrentTask() {
    const area = document.getElementById('trainer-work-area');
    if (!area) return;

    if (this.currentMode === 'builder') {
      this.renderBuilderTask(area);
    } else if (this.currentMode === 'spot') {
      this.renderSpotTask(area);
    } else if (this.currentMode === 'fill') {
      this.renderFillTask(area);
    } else if (this.currentMode === 'blitz') {
      this.renderBlitzTask(area);
    }
  }

  // --- Режим 1: Конструктор коду ---
  renderBuilderTask(area) {
    const puzzle = this.builderPuzzles[this.currentQuestionIndex % this.builderPuzzles.length];
    this.selectedTokens = [];
    this.availableTokens = [...puzzle.shuffled];

    area.innerHTML = `
      <div class="trainer-card">
        <div class="task-head">
          <span class="level-indicator">Завдання ${this.currentQuestionIndex + 1} з ${this.builderPuzzles.length}</span>
          <h3>${puzzle.title}</h3>
          <p class="task-hint-sub">Клікай по блоках слів у правильному порядку, щоб скласти бездоганну команду Python:</p>
        </div>

        <div class="code-builder-zone">
          <div class="code-target-slot" id="builder-slot">
            <span class="slot-placeholder">Сюди стануть обрані блоки...</span>
          </div>
        </div>

        <div class="code-tokens-tray" id="tokens-tray">
          <!-- Блоки для вибору -->
        </div>

        <div class="builder-actions">
          <button class="btn btn-outline" onclick="window.syntaxTrainer.resetBuilder()">🔄 Скинути</button>
          <button class="btn btn-primary" id="btn-check-builder" onclick="window.syntaxTrainer.checkBuilder()">✨ Перевірити код</button>
        </div>

        <div id="builder-feedback" class="trainer-feedback"></div>
      </div>
    `;

    this.updateTokensUI();
  }

  updateTokensUI() {
    const slot = document.getElementById('builder-slot');
    const tray = document.getElementById('tokens-tray');
    if (!slot || !tray) return;

    // Очищаємо та показуємо обрані блоки
    if (this.selectedTokens.length === 0) {
      slot.innerHTML = `<span class="slot-placeholder">Клікай по блоках внизу, щоб скласти команду...</span>`;
    } else {
      slot.innerHTML = this.selectedTokens.map((t, idx) => `
        <span class="code-token selected" onclick="window.syntaxTrainer.removeToken(${idx})">
          ${t} <small class="token-remove">×</small>
        </span>
      `).join('');
    }

    // Показуємо доступні блоки
    tray.innerHTML = this.availableTokens.map((t, idx) => `
      <button class="code-token available" onclick="window.syntaxTrainer.addToken(${idx})">
        ${t}
      </button>
    `).join('');
  }

  addToken(idx) {
    const token = this.availableTokens.splice(idx, 1)[0];
    this.selectedTokens.push(token);
    this.updateTokensUI();
    if (window.audioEffects) window.audioEffects.playClick();
  }

  removeToken(idx) {
    const token = this.selectedTokens.splice(idx, 1)[0];
    this.availableTokens.push(token);
    this.updateTokensUI();
    if (window.audioEffects) window.audioEffects.playClick();
  }

  resetBuilder() {
    const puzzle = this.builderPuzzles[this.currentQuestionIndex % this.builderPuzzles.length];
    this.selectedTokens = [];
    this.availableTokens = [...puzzle.shuffled];
    this.updateTokensUI();
    const fb = document.getElementById('builder-feedback');
    if (fb) fb.innerHTML = '';
  }

  checkBuilder() {
    const puzzle = this.builderPuzzles[this.currentQuestionIndex % this.builderPuzzles.length];
    const userStr = this.selectedTokens.join(' ');
    const expectedStr = puzzle.tokens.join(' ');
    const fb = document.getElementById('builder-feedback');

    if (userStr === expectedStr) {
      this.score += 25;
      this.streak += 1;
      this.gamification.addXP(25, "Правильно складений синтаксис");
      if (window.audioEffects) window.audioEffects.playSuccess();

      fb.innerHTML = `
        <div class="feedback-success">
          🎉 <b>Чудово!</b> Правильний синтаксис: <code>${puzzle.tokens.join('')}</code>
          <div style="margin-top: 10px;">
            <button class="btn btn-success" onclick="window.syntaxTrainer.nextBuilder()">Наступне завдання ➡️</button>
          </div>
        </div>
      `;
    } else {
      this.streak = 0;
      if (window.audioEffects) window.audioEffects.playError();
      fb.innerHTML = `
        <div class="feedback-error">
          ❌ <b>Спробуй ще раз!</b> ${puzzle.hint}
        </div>
      `;
    }

    this.updateStatsUI();
  }

  nextBuilder() {
    this.currentQuestionIndex++;
    this.renderCurrentTask();
  }

  // --- Режим 2: Знайди помилку ---
  renderSpotTask(area) {
    const q = this.spotBugQuestions[this.currentQuestionIndex % this.spotBugQuestions.length];

    area.innerHTML = `
      <div class="trainer-card">
        <div class="task-head">
          <span class="level-indicator">Питання ${this.currentQuestionIndex + 1} з ${this.spotBugQuestions.length}</span>
          <h3>${q.question}</h3>
        </div>

        <div class="options-grid" id="spot-options">
          ${q.options.map((opt, i) => `
            <button class="btn-option" onclick="window.syntaxTrainer.answerSpot(${i})">
              <span class="opt-key">${String.fromCharCode(65 + i)}</span>
              <code>${opt}</code>
            </button>
          `).join('')}
        </div>

        <div id="spot-feedback" class="trainer-feedback"></div>
      </div>
    `;
  }

  answerSpot(choiceIdx) {
    const q = this.spotBugQuestions[this.currentQuestionIndex % this.spotBugQuestions.length];
    const fb = document.getElementById('spot-feedback');
    const options = document.querySelectorAll('.btn-option');

    options.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correct) btn.classList.add('correct');
      if (idx === choiceIdx && idx !== q.correct) btn.classList.add('wrong');
    });

    if (choiceIdx === q.correct) {
      this.score += 20;
      this.streak += 1;
      this.gamification.addXP(20, "Знайдено правильний синтаксис");
      if (window.audioEffects) window.audioEffects.playSuccess();

      fb.innerHTML = `
        <div class="feedback-success">
          ✨ <b>Влучно!</b> ${q.explanation}
          <div style="margin-top: 10px;">
            <button class="btn btn-success" onclick="window.syntaxTrainer.nextSpot()">Далі ➡️</button>
          </div>
        </div>
      `;
    } else {
      this.streak = 0;
      if (window.audioEffects) window.audioEffects.playError();
      fb.innerHTML = `
        <div class="feedback-error">
          ⚠️ <b>Не зовсім так.</b> ${q.explanation}
          <div style="margin-top: 10px;">
            <button class="btn btn-outline" onclick="window.syntaxTrainer.nextSpot()">Спробувати інше ➡️</button>
          </div>
        </div>
      `;
    }

    this.updateStatsUI();
  }

  nextSpot() {
    this.currentQuestionIndex++;
    this.renderCurrentTask();
  }

  // --- Режим 3: Встав пропущене ---
  renderFillTask(area) {
    const task = this.fillBlanks[this.currentQuestionIndex % this.fillBlanks.length];

    area.innerHTML = `
      <div class="trainer-card">
        <div class="task-head">
          <span class="level-indicator">Картка ${this.currentQuestionIndex + 1} з ${this.fillBlanks.length}</span>
          <h3>Заповни пропуск у коді</h3>
          <p class="task-hint-sub">${task.taskHint}</p>
        </div>

        <div class="code-fill-box">
          <pre><code>${task.codePrefix}<span class="blank-slot" id="fill-slot">____</span>${task.codeSuffix}</code></pre>
        </div>

        <div class="fill-options-tray">
          ${task.options.map(opt => `
            <button class="btn btn-fill-opt" onclick="window.syntaxTrainer.answerFill('${opt}')">
              ${opt}
            </button>
          `).join('')}
        </div>

        <div id="fill-feedback" class="trainer-feedback"></div>
      </div>
    `;
  }

  answerFill(choice) {
    const task = this.fillBlanks[this.currentQuestionIndex % this.fillBlanks.length];
    const fb = document.getElementById('fill-feedback');
    const slot = document.getElementById('fill-slot');

    if (choice === task.answer) {
      if (slot) {
        slot.textContent = choice;
        slot.classList.add('correct');
      }
      this.score += 20;
      this.streak += 1;
      this.gamification.addXP(20, "Заповнено пропуск");
      if (window.audioEffects) window.audioEffects.playSuccess();

      fb.innerHTML = `
        <div class="feedback-success">
          🎯 <b>Чудово!</b> Команда тепер повна і готова до запуску!
          <div style="margin-top: 10px;">
            <button class="btn btn-success" onclick="window.syntaxTrainer.nextFill()">Наступний пропуск ➡️</button>
          </div>
        </div>
      `;
    } else {
      this.streak = 0;
      if (window.audioEffects) window.audioEffects.playError();
      fb.innerHTML = `
        <div class="feedback-error">
          ❌ <b>Неправильне слово.</b> Подумай, яка саме дія очікується.
        </div>
      `;
    }

    this.updateStatsUI();
  }

  nextFill() {
    this.currentQuestionIndex++;
    this.renderCurrentTask();
  }

  // --- Режим 4: Спідран Бліц 60 сек ---
  renderBlitzTask(area) {
    area.innerHTML = `
      <div class="trainer-card text-center">
        <div class="blitz-hero">
          <div class="timer-circle" id="blitz-timer">60</div>
          <h2>Швидкісний синтаксичний бліц!</h2>
          <p>Відповідай якомога швидше на запитання з синтаксису. Кожна правильна відповідь дає комбо-очки!</p>
          <div style="margin-top: 20px;">
            <button class="btn btn-primary btn-large" onclick="window.syntaxTrainer.startBlitz()">
              🚀 Почати 60-секундний бліц!
            </button>
          </div>
        </div>
      </div>
    `;
  }

  startBlitz() {
    this.timeLeft = 60;
    this.blitzScore = 0;
    this.blitzCombo = 1;
    this.blitzQuestions = [
      ...this.spotBugQuestions,
      ...this.builderPuzzles.map(p => ({
        question: `Який синтаксис правильний для: "${p.title}"?`,
        options: [p.tokens.join(''), p.shuffled.slice(0, 3).join(''), "Print()", "execute()"],
        correct: 0,
        explanation: p.hint
      }))
    ].sort(() => Math.random() - 0.5);

    this.blitzIndex = 0;
    this.renderBlitzQuestion();

    this.timer = setInterval(() => {
      this.timeLeft--;
      const timerEl = document.getElementById('blitz-timer');
      if (timerEl) timerEl.textContent = this.timeLeft;

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endBlitz();
      }
    }, 1000);
  }

  renderBlitzQuestion() {
    const area = document.getElementById('trainer-work-area');
    if (!area) return;

    const q = this.blitzQuestions[this.blitzIndex % this.blitzQuestions.length];

    area.innerHTML = `
      <div class="trainer-card">
        <div class="blitz-bar">
          <div class="blitz-timer-pill">⏳ <span id="blitz-timer">${this.timeLeft}</span>с</div>
          <div class="blitz-combo-pill">🔥 Комбо: x${this.blitzCombo}</div>
          <div class="blitz-pts-pill">🏆 Бали: ${this.blitzScore}</div>
        </div>

        <div class="task-head" style="margin-top: 15px;">
          <h3>${q.question}</h3>
        </div>

        <div class="options-grid" style="margin-top: 15px;">
          ${q.options.map((opt, i) => `
            <button class="btn-option" onclick="window.syntaxTrainer.answerBlitz(${i})">
              <code>${opt}</code>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  answerBlitz(choice) {
    const q = this.blitzQuestions[this.blitzIndex % this.blitzQuestions.length];

    if (choice === q.correct) {
      const added = 10 * this.blitzCombo;
      this.blitzScore += added;
      this.blitzCombo = Math.min(5, this.blitzCombo + 1);
      if (window.audioEffects) window.audioEffects.playClick();
    } else {
      this.blitzCombo = 1;
      if (window.audioEffects) window.audioEffects.playError();
    }

    this.blitzIndex++;
    this.renderBlitzQuestion();
  }

  endBlitz() {
    const area = document.getElementById('trainer-work-area');
    if (!area) return;

    this.gamification.addXP(this.blitzScore, "Результат Бліц-раунду");
    if (window.confettiEffect) window.confettiEffect.celebrate();
    if (window.audioEffects) window.audioEffects.playLevelUp();

    area.innerHTML = `
      <div class="trainer-card text-center">
        <div style="font-size: 50px;">🏁</div>
        <h2>Час вичерпано!</h2>
        <p class="blitz-final-score">Твій результат: <b>${this.blitzScore}</b> балів!</p>
        <p>Ти заробив +${this.blitzScore} XP до свого профілю!</p>
        <div style="margin-top: 20px;">
          <button class="btn btn-primary" onclick="window.syntaxTrainer.startBlitz()">🔄 Спробувати ще раз</button>
          <button class="btn btn-outline" onclick="window.syntaxTrainer.switchMode('builder')">До конструктора</button>
        </div>
      </div>
    `;
  }

  updateStatsUI() {
    const s = document.getElementById('trainer-score');
    const st = document.getElementById('trainer-streak');
    if (s) s.textContent = this.score;
    if (st) st.textContent = this.streak;
  }
}

window.SyntaxTrainer = SyntaxTrainer;

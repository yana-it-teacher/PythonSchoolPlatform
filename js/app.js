/**
 * Головний контролер веб-застосунку "Пітоніка / PythonJunior"
 * Керує навігацією, картою курсу, робочою панеллю учня, редактором коду та валідацією
 */

class LessonsManager {
  constructor() {
    this.storageKey = 'python_school_lessons_v2';
    this.lessons = [];
    this.load();
  }

  load() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.lessons = JSON.parse(raw);
        return;
      } catch (e) {}
    }
    this.resetToDefaults();
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.lessons));
  }

  resetToDefaults() {
    this.lessons = JSON.parse(JSON.stringify(window.INITIAL_LESSONS || []));
    this.save();
  }

  getAllLessons() {
    return this.lessons;
  }

  getLessonById(id) {
    return this.lessons.find(l => l.id === Number(id)) || null;
  }

  updateLesson(id, updatedData) {
    const idx = this.lessons.findIndex(l => l.id === Number(id));
    if (idx !== -1) {
      this.lessons[idx] = { ...this.lessons[idx], ...updatedData };
      this.save();
    }
  }

  addLesson(newLesson) {
    this.lessons.push(newLesson);
    this.save();
  }

  deleteLesson(id) {
    this.lessons = this.lessons.filter(l => l.id !== Number(id));
    this.save();
  }

  setAllLessons(arr) {
    this.lessons = arr;
    this.save();
  }
}

class App {
  constructor() {
    this.lessonsManager = new LessonsManager();
    this.gamification = new GamificationManager();
    this.currentLesson = this.lessonsManager.getAllLessons()[0];
    this.currentTab = 'roadmap'; // 'roadmap' | 'workspace' | 'trainer' | 'achievements' | 'teacher'

    this.consoleLogs = [];
    this.initDOM();
    this.initEngines();
    this.bindEvents();
    this.render();
  }

  initDOM() {
    // Встановлюємо глобальні екземпляри
    window.lessonsManager = this.lessonsManager;
    window.gamification = this.gamification;
    window.teacherAdmin = new TeacherAdmin(this.lessonsManager, this.gamification);
    window.syntaxTrainer = new SyntaxTrainer('trainer-view-container', this.gamification);
  }

  initEngines() {
    // Ініціалізація Turtle та Python інтерпретатора
    const canvas = document.getElementById('turtle-canvas');
    if (canvas) {
      this.turtle = new TurtleGraphics('turtle-canvas');
    }

    this.python = new PythonEngine(
      this.turtle,
      (text, type) => this.writeToConsole(text, type),
      (promptText) => this.showInputPrompt(promptText)
    );
  }

  bindEvents() {
    // Навігаційні кнопки меню
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // Редактор коду - підтримка табуляції (Tab) та авто-відступів
    const editor = document.getElementById('code-editor');
    if (editor) {
      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editor.selectionStart;
          const end = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 4;
          this.updateLineNumbers();
        }
      });
      editor.addEventListener('input', () => {
        this.updateLineNumbers();
        this.saveCurrentDraft();
      });
      editor.addEventListener('scroll', () => {
        const lines = document.getElementById('line-numbers');
        if (lines) lines.scrollTop = editor.scrollTop;
      });
    }
  }

  updateLineNumbers() {
    const editor = document.getElementById('code-editor');
    const linesEl = document.getElementById('line-numbers');
    if (!editor || !linesEl) return;

    const lineCount = editor.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= Math.max(lineCount, 15); i++) {
      nums += i + '\n';
    }
    linesEl.textContent = nums;
  }

  saveCurrentDraft() {
    const editor = document.getElementById('code-editor');
    if (editor && this.currentLesson) {
      if (!this.gamification.profile.savedDrafts) this.gamification.profile.savedDrafts = {};
      this.gamification.profile.savedDrafts[this.currentLesson.id] = editor.value;
      localStorage.setItem(this.gamification.storageKey, JSON.stringify(this.gamification.profile));
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${tab}`);
    if (activeSec) activeSec.classList.add('active');

    if (tab === 'roadmap') {
      this.renderRoadmap();
    } else if (tab === 'workspace') {
      this.renderWorkspace();
    } else if (tab === 'trainer') {
      window.syntaxTrainer.render();
    } else if (tab === 'achievements') {
      this.renderAchievements();
    } else if (tab === 'teacher') {
      const container = document.getElementById('admin-container');
      if (container) window.teacherAdmin.render(container);
    }
  }

  render() {
    this.gamification.updateHeaderUI();
    this.switchTab(this.currentTab);
  }

  // --- Вкладка: Карта курсу (Roadmap) ---
  renderRoadmap() {
    const container = document.getElementById('roadmap-container');
    if (!container) return;

    const lessons = this.lessonsManager.getAllLessons();
    const completed = this.gamification.profile.completedLessons;
    const progressPct = Math.round((completed.length / Math.max(1, lessons.length)) * 100);

    container.innerHTML = `
      <div class="roadmap-hero">
        <div class="roadmap-hero-text">
          <h1>Курс «Основи Python та Turtle» 🚀</h1>
          <p>25 захоплюючих інтерактивних уроків від перших алгоритмів до власних ігор та анімацій!</p>
        </div>

        <div class="roadmap-overall-card">
          <div class="overall-progress-title">
            <span>Загальний прогрес курсу:</span>
            <b>${completed.length} з ${lessons.length} уроків (${progressPct}%)</b>
          </div>
          <div class="overall-progress-track">
            <div class="overall-progress-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </div>

      <div class="blocks-container">
        ${window.COURSE_BLOCKS.map(block => {
          const blockLessons = lessons.filter(l => l.blockId === block.id);
          const blockDone = blockLessons.filter(l => completed.includes(l.id)).length;
          const blockPct = Math.round((blockDone / Math.max(1, blockLessons.length)) * 100);

          return `
            <div class="course-block-card">
              <div class="block-header" style="background: ${block.gradient}">
                <div class="block-header-info">
                  <span class="block-icon">${block.icon}</span>
                  <div>
                    <h2 class="block-title">${block.title}</h2>
                    <p class="block-subtitle">${block.subtitle}</p>
                  </div>
                </div>
                <div class="block-progress-badge">
                  ${blockDone}/${blockLessons.length} завершено (${blockPct}%)
                </div>
              </div>

              <div class="block-lessons-grid">
                ${blockLessons.map(l => {
                  const isDone = completed.includes(l.id);
                  const isCurrent = this.currentLesson && this.currentLesson.id === l.id;

                  return `
                    <div class="lesson-card ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}" onclick="window.app.openLesson(${l.id})">
                      <div class="lesson-card-top">
                        <span class="lesson-num">Урок ${l.num || l.id}</span>
                        <span class="lesson-badge-type ${l.type}">${l.type === 'turtle' ? '🐢 Turtle' : l.type === 'interactive' ? '⚡ Інтерактив' : '💻 Консоль'}</span>
                      </div>
                      <h4 class="lesson-card-title">${l.title}</h4>
                      <p class="lesson-card-desc">${(l.task || '').slice(0, 90)}...</p>
                      
                      <div class="lesson-card-bottom">
                        <span class="lesson-xp">+${l.xp || 50} XP</span>
                        <span class="lesson-status ${isDone ? 'status-done' : 'status-new'}">
                          ${isDone ? '✅ Виконано' : '▶️ Розпочати'}
                        </span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  openLesson(id) {
    const lesson = this.lessonsManager.getLessonById(id);
    if (!lesson) return;
    this.currentLesson = lesson;
    this.switchTab('workspace');
  }

  // --- Вкладка: Робоча панель учня (Workspace) ---
  renderWorkspace() {
    if (!this.currentLesson) return;
    const l = this.currentLesson;
    const isDone = this.gamification.isLessonComplete(l.id);

    // Заголовок робочої панелі
    const titleEl = document.getElementById('ws-lesson-title');
    const badgeEl = document.getElementById('ws-lesson-badge');
    const statusEl = document.getElementById('ws-lesson-status');

    if (titleEl) titleEl.textContent = `Урок ${l.num || l.id}: ${l.title}`;
    if (badgeEl) badgeEl.textContent = l.type === 'turtle' ? '🐢 Turtle Графіка' : '💻 Консольна програма';
    if (statusEl) {
      statusEl.className = isDone ? 'lesson-tag tag-done' : 'lesson-tag tag-new';
      statusEl.innerHTML = isDone ? '✅ Виконано (+XP отримано)' : '⏳ В процесі';
    }

    // Заповнення бічної панелі: Теорія, Завдання, Підказки, Очікуваний результат
    this.renderSidebarContent();

    // Завантаження коду в редактор
    const editor = document.getElementById('code-editor');
    if (editor) {
      const saved = this.gamification.profile.savedDrafts ? this.gamification.profile.savedDrafts[l.id] : null;
      editor.value = saved || l.initialCode || "";
      this.updateLineNumbers();
    }

    // Перемикання вихідної панелі за замовчуванням (якщо turtle — показуємо полотно)
    if (l.type === 'turtle') {
      this.switchOutputTab('turtle');
    } else {
      this.switchOutputTab('console');
    }

    this.clearConsole();
    if (this.turtle) this.turtle.reset();
  }

  renderSidebarContent() {
    const l = this.currentLesson;
    const theoryContent = document.getElementById('theory-tab-content');
    const hintsContent = document.getElementById('hints-tab-content');
    const expectedContent = document.getElementById('expected-tab-content');

    if (theoryContent) {
      theoryContent.innerHTML = `
        <div class="sidebar-section">
          <div class="section-title">📘 Теоретична довідка</div>
          <div class="theory-markdown">${this.formatMarkdown(l.theory || "")}</div>
        </div>

        <div class="sidebar-section task-highlight-box">
          <div class="section-title">🎯 Твоє завдання:</div>
          <p>${(l.task || "").replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }

    if (hintsContent) {
      const hints = l.hints || [];
      hintsContent.innerHTML = `
        <div class="sidebar-section">
          <div class="section-title">💡 Підказки для розв'язку</div>
          <p class="text-muted" style="margin-bottom: 12px;">Якщо щось не виходить, відкривай підказки по черзі:</p>

          <div class="hints-accordion">
            ${hints.map((hint, idx) => `
              <div class="hint-card">
                <div class="hint-header" onclick="this.parentElement.classList.toggle('open')">
                  <span class="hint-badge">Підказка ${idx + 1}</span>
                  <span class="hint-toggle-icon">▼</span>
                </div>
                <div class="hint-body">
                  <p>${hint}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="solution-reveal-box" style="margin-top: 15px;">
            <button class="btn btn-outline btn-small" onclick="window.app.toggleSampleSolution()">
              👀 Підглянути правильне рішення
            </button>
            <div id="sample-solution-box" class="sample-solution-content" style="display:none; margin-top: 10px;">
              <pre><code>${l.sampleSolution || l.initialCode}</code></pre>
              <button class="btn btn-primary btn-small" style="margin-top: 8px;" onclick="window.app.pasteSampleSolution()">
                📋 Вставити цей код в редактор
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (expectedContent) {
      expectedContent.innerHTML = `
        <div class="sidebar-section">
          <div class="section-title">🏁 Очікуваний результат</div>
          <p>Твоя програма після виконання має показати:</p>
          <div class="expected-output-box">
            <pre><code>${l.expectedOutput || "Відповідний малюнок або виведення у консоль"}</code></pre>
          </div>
          <div class="validator-hint-box" style="margin-top: 12px;">
            <p>💡 <i>Натисни кнопку <b>«Перевірити розв'язок»</b> угорі, щоб автоматично протестувати свій код та отримати +${l.xp || 50} XP!</i></p>
          </div>
        </div>
      `;
    }
  }

  toggleSampleSolution() {
    const box = document.getElementById('sample-solution-box');
    if (box) {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
  }

  pasteSampleSolution() {
    if (this.currentLesson && this.currentLesson.sampleSolution) {
      const editor = document.getElementById('code-editor');
      if (editor) {
        editor.value = this.currentLesson.sampleSolution;
        this.updateLineNumbers();
        this.saveCurrentDraft();
      }
    }
  }

  switchSidebarTab(tabName) {
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.sidebar-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`${tabName}-tab-content`);
    if (activePane) activePane.classList.add('active');
  }

  switchOutputTab(tabName) {
    document.querySelectorAll('.output-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const turtleView = document.getElementById('output-turtle-view');
    const consoleView = document.getElementById('output-console-view');

    if (tabName === 'turtle') {
      if (turtleView) turtleView.style.display = 'flex';
      if (consoleView) consoleView.style.display = 'none';
    } else {
      if (turtleView) turtleView.style.display = 'none';
      if (consoleView) consoleView.style.display = 'flex';
    }
  }

  // --- Запуск та перевірка коду ---
  async runCode() {
    const editor = document.getElementById('code-editor');
    if (!editor) return;
    const code = editor.value;

    this.clearConsole();
    this.writeToConsole("▶️ Запуск програми мовою Python...", 'info');
    if (window.audioEffects) window.audioEffects.playClick();

    // Якщо в коді є команди черепашки - перемикаємо на полотно
    if (code.includes('turtle') || code.includes('forward') || code.includes('circle')) {
      this.switchOutputTab('turtle');
    }

    const res = await this.python.run(code);
    if (res.success) {
      this.writeToConsole("✔️ Програма успішно завершила роботу.", 'success');
    }
  }

  stopCode() {
    this.python.stop();
    this.writeToConsole("🛑 Виконання програми зупинено користувачем.", 'error');
  }

  resetCurrentCode() {
    if (!this.currentLesson) return;
    if (confirm("Скинути код уроку до початкового шаблону?")) {
      const editor = document.getElementById('code-editor');
      if (editor) {
        editor.value = this.currentLesson.initialCode || "";
        this.updateLineNumbers();
        this.saveCurrentDraft();
      }
    }
  }

  async checkSolution() {
    const editor = document.getElementById('code-editor');
    if (!editor || !this.currentLesson) return;
    const code = editor.value;

    this.writeToConsole("🔍 Перевірка твого розв'язку...", 'info');

    // 1. Запускаємо код для збору виведення та графічних дій
    const runResult = await this.python.run(code);

    if (!runResult.success) {
      this.showValidationResult(false, "У твоєму коді є синтаксична помилка. Виправ її та спробуй ще раз!");
      return;
    }

    // 2. Перевіряємо критерії валідації уроку
    const l = this.currentLesson;
    let isPassed = false;
    let message = "";

    const fullConsoleOutput = this.consoleLogs.join('\n');

    if (l.criteria) {
      if (l.criteria.type === 'output_contains' || l.criteria.type === 'output_exact_or_contains') {
        const missing = (l.criteria.keywords || []).filter(kw => !fullConsoleOutput.includes(kw));
        if (missing.length === 0) {
          isPassed = true;
          message = "Твій код вивів саме той текст, що вимагався в завданні!";
        } else {
          isPassed = false;
          message = `У виведенні не знайдено обов'язковий текст: "${missing[0]}"`;
        }
      } else if (l.criteria.type === 'code_structure') {
        const missing = (l.criteria.requiredPatterns || []).filter(pat => !code.includes(pat));
        if (missing.length === 0) {
          isPassed = true;
          message = "Усі необхідні команди та синтаксичні конструкції використано правильно!";
        } else {
          isPassed = false;
          message = `У коді обов'язково має бути використано команду або конструкцію: '${missing[0]}'`;
        }
      } else if (l.criteria.type === 'turtle_actions') {
        const moves = (this.turtle.actionsLog || []).filter(a => a.type === 'forward').length;
        const turns = (this.turtle.actionsLog || []).filter(a => a.type === 'turn').length;
        if (moves >= (l.criteria.minMoves || 1) && turns >= (l.criteria.minTurns || 1)) {
          isPassed = true;
          message = "Черепашка успішно намалювала задану фігуру!";
        } else {
          isPassed = false;
          message = "Черепашка зробила замало рухів або поворотів для побудови цієї фігури.";
        }
      }
    } else {
      // Якщо критерій не задано явно, перевіряємо відсутність помилок
      isPassed = true;
      message = "Завдання зараховано!";
    }

    if (isPassed) {
      const isNew = this.gamification.markLessonComplete(l.id, l.xp || 50);
      if (window.audioEffects) window.audioEffects.playSuccess();
      if (window.confettiEffect) window.confettiEffect.celebrate(80);

      this.showValidationResult(true, `🎉 <b>Блискуче! Завдання виконано на відмінно!</b><br>${message}<br><b>+${l.xp || 50} XP додано до твого профілю!</b>`);
      
      const statusEl = document.getElementById('ws-lesson-status');
      if (statusEl) {
        statusEl.className = 'lesson-tag tag-done';
        statusEl.innerHTML = '✅ Виконано (+XP отримано)';
      }
    } else {
      if (window.audioEffects) window.audioEffects.playError();
      this.showValidationResult(false, `❌ <b>Ще не зовсім правильно.</b><br>${message}<br><i>Зазирни в бічну панель підказок, вона допоможе!</i>`);
    }
  }

  showValidationResult(isSuccess, htmlContent) {
    const box = document.getElementById('validation-feedback-box');
    if (!box) return;

    box.className = `validation-box ${isSuccess ? 'validation-success' : 'validation-error'}`;
    box.innerHTML = `
      <div class="val-body">
        <div>${htmlContent}</div>
        ${isSuccess ? `<button class="btn btn-success btn-small" onclick="window.app.goToNextLesson()">Наступний урок ➡️</button>` : ''}
      </div>
    `;
    box.style.display = 'block';

    setTimeout(() => {
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  goToNextLesson() {
    const lessons = this.lessonsManager.getAllLessons();
    const currIdx = lessons.findIndex(l => l.id === this.currentLesson.id);
    if (currIdx !== -1 && currIdx < lessons.length - 1) {
      this.openLesson(lessons[currIdx + 1].id);
    } else {
      alert("Вітаємо! Ти дійшов до кінця курсу або останнього уроку!");
    }
  }

  goToPrevLesson() {
    const lessons = this.lessonsManager.getAllLessons();
    const currIdx = lessons.findIndex(l => l.id === this.currentLesson.id);
    if (currIdx > 0) {
      this.openLesson(lessons[currIdx - 1].id);
    }
  }

  // --- Консоль виведення ---
  writeToConsole(text, type = 'stdout') {
    this.consoleLogs.push(text);
    const term = document.getElementById('console-output');
    if (!term) return;

    const line = document.createElement('div');
    line.className = `terminal-line line-${type}`;
    line.textContent = text;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
  }

  clearConsole() {
    this.consoleLogs = [];
    const term = document.getElementById('console-output');
    if (term) term.innerHTML = '';
    const fb = document.getElementById('validation-feedback-box');
    if (fb) fb.style.display = 'none';
  }

  // --- Інтерактивне діалогове вікно введення input() ---
  showInputPrompt(promptText) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-backdrop active';
      modal.innerHTML = `
        <div class="modal-card input-prompt-modal">
          <div style="font-size: 32px; margin-bottom: 8px;">⌨️</div>
          <h3>Введення даних з клавіатури (input)</h3>
          <p class="input-prompt-label"><b>${promptText}</b></p>
          <div class="form-group" style="margin-top: 15px;">
            <input type="text" id="interactive-user-input" class="form-control" placeholder="Введіть відповідь..." autofocus />
          </div>
          <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-primary" id="btn-submit-input">Надіслати (Enter)</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const input = modal.querySelector('#interactive-user-input');
      const submitBtn = modal.querySelector('#btn-submit-input');

      const finalize = () => {
        const val = input.value;
        this.writeToConsole(`> ${promptText} ${val}`, 'stdin');
        modal.remove();
        resolve(val);
      };

      submitBtn.addEventListener('click', finalize);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finalize();
      });

      setTimeout(() => input.focus(), 50);
    });
  }

  // --- Вкладка: Досягнення та Профіль ---
  renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    const p = this.gamification.profile;
    const rank = this.gamification.getCurrentRank();
    const nextRank = this.gamification.getNextRank();

    container.innerHTML = `
      <div class="profile-hero-card">
        <div class="profile-avatar-big" onclick="window.app.openProfileModal()">
          <span>${p.avatar || '🐢'}</span>
          <small class="avatar-edit-label">✏️ Змінити</small>
        </div>

        <div class="profile-hero-info">
          <h2>${p.name} <span class="profile-grade-pill">${p.grade || '5-А клас'}</span></h2>
          <div class="profile-rank-line">
            <span class="rank-tag">${rank.icon} ${rank.title} (Рівень ${rank.level})</span>
            <span class="xp-tag">💎 ${p.xp} XP</span>
            <span class="streak-tag">🔥 Стрік: ${p.streak || 1} дн.</span>
          </div>

          <div class="profile-level-progress">
            <div class="progress-labels">
              <span>До рівня ${nextRank ? nextRank.level : 10}:</span>
              <span>${p.xp} / ${nextRank ? nextRank.xpReq : p.xp} XP</span>
            </div>
            <div class="profile-progress-bar">
              <div class="profile-progress-fill" style="width: ${nextRank ? Math.round(((p.xp - rank.xpReq) / (nextRank.xpReq - rank.xpReq)) * 100) : 100}%"></div>
            </div>
          </div>
        </div>

        <div class="profile-hero-actions">
          <button class="btn btn-outline" onclick="window.app.openProfileModal()">
            👤 Редагувати профіль
          </button>
        </div>
      </div>

      <!-- Сітка бейджів -->
      <div class="achievements-section-title">
        <h3>🏆 Колекція досягнень (${p.badges.length} з ${this.gamification.allBadges.length})</h3>
        <p>Виконуй практичні завдання, запускай цикли та тренуй синтаксис, щоб відкрити всі нагороди!</p>
      </div>

      <div class="badges-grid">
        ${this.gamification.allBadges.map(b => {
          const unlocked = p.badges.includes(b.id);
          return `
            <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
              <div class="badge-icon-box">${b.icon}</div>
              <h4 class="badge-card-title">${b.title}</h4>
              <p class="badge-card-desc">${b.desc}</p>
              <div class="badge-card-reward">+${b.xp} XP</div>
              <div class="badge-card-status">
                ${unlocked ? '✨ Отримано' : '🔒 Заблоковано'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  openProfileModal() {
    const p = this.gamification.profile;
    const avatars = ['🐢', '🚀', '🤖', '🐱', '🦊', '🧙‍♂️', '⚡', '🌟', '🦄', '🎯'];

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop active';
    modal.id = 'profile-modal';

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>👤 Профіль учня</h3>
          <button class="modal-close-btn" onclick="document.getElementById('profile-modal').remove()">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Твоє ім'я або нікнейм:</label>
            <input type="text" id="input-student-name" class="form-control" value="${p.name}" />
          </div>

          <div class="form-group">
            <label>Клас (наприклад: 5-А, 6-Б):</label>
            <input type="text" id="input-student-grade" class="form-control" value="${p.grade || '5-А'}" />
          </div>

          <div class="form-group">
            <label>Обери свого маскота / аватар:</label>
            <div class="avatar-selection-grid">
              ${avatars.map(a => `
                <button class="avatar-opt-btn ${p.avatar === a ? 'selected' : ''}" onclick="window.app.selectAvatar(this, '${a}')">
                  ${a}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('profile-modal').remove()">Скасувати</button>
          <button class="btn btn-primary" onclick="window.app.saveProfileModal()">💾 Зберегти профіль</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  selectAvatar(btn, emoji) {
    document.querySelectorAll('.avatar-opt-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this._tempAvatar = emoji;
  }

  saveProfileModal() {
    const name = document.getElementById('input-student-name').value.trim();
    const grade = document.getElementById('input-student-grade').value.trim();
    const avatar = this._tempAvatar || this.gamification.profile.avatar;

    this.gamification.switchProfile(name, grade, avatar);
    document.getElementById('profile-modal').remove();
    this.renderAchievements();
    if (window.audioEffects) window.audioEffects.playSuccess();
  }

  formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<p></p>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>');
  }
}

// Запуск програми після завантаження сторінки
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

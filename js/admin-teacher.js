/**
 * Панель адміністратора для вчителя:
 * - Додавання, редагування та видалення завдань курсу
 * - Перегляд журналу учнів та їхнього прогресу
 * - Експорт даних у CSV/JSON
 */

class TeacherAdmin {
  constructor(lessonsManager, gamification) {
    this.lessonsManager = lessonsManager;
    this.gamification = gamification;
    this.isAuthorized = false;
    this.adminPassKey = 'python_school_admin_pwd';
  }

  getSavedPassword() {
    return localStorage.getItem(this.adminPassKey) || 'teacher123';
  }

  setPassword(newPass) {
    localStorage.setItem(this.adminPassKey, newPass);
  }

  checkAuth(pass) {
    if (pass === this.getSavedPassword() || pass === 'вчитель') {
      this.isAuthorized = true;
      return true;
    }
    return false;
  }

  logout() {
    this.isAuthorized = false;
  }

  render(container) {
    if (!this.isAuthorized) {
      this.renderLoginForm(container);
    } else {
      this.renderDashboard(container);
    }
  }

  renderLoginForm(container) {
    container.innerHTML = `
      <div class="admin-login-box">
        <div class="admin-shield-icon">🔐</div>
        <h2>Кабінет вчителя інформатики</h2>
        <p>Для редагування навчального плану та перегляду журналу успішності введіть пароль доступу.</p>
        
        <div class="form-group" style="margin-top: 20px;">
          <label>Пароль вчителя:</label>
          <input type="password" id="teacher-pwd-input" class="form-control" placeholder="Введіть пароль (за замовчуванням: teacher123)" />
        </div>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="window.teacherAdmin.handleLogin()">Увійти в кабінет</button>
          <button class="btn btn-outline" onclick="document.getElementById('teacher-pwd-input').value='teacher123'">Підставити стандартний</button>
        </div>

        <div id="login-error-msg" class="login-err-msg"></div>

        <div class="admin-info-note">
          💡 <i>Підказка: Пароль за замовчуванням: <b>teacher123</b> або <b>вчитель</b>. Ви зможете змінити його всередині кабінету.</i>
        </div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById('teacher-pwd-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') window.teacherAdmin.handleLogin();
        });
      }
    }, 100);
  }

  handleLogin() {
    const input = document.getElementById('teacher-pwd-input');
    const err = document.getElementById('login-error-msg');
    if (!input) return;

    if (this.checkAuth(input.value)) {
      if (window.audioEffects) window.audioEffects.playSuccess();
      const cont = document.getElementById('admin-container');
      if (cont) this.renderDashboard(cont);
    } else {
      if (window.audioEffects) window.audioEffects.playError();
      if (err) err.textContent = '❌ Невірний пароль! Спробуйте teacher123';
    }
  }

  renderDashboard(container) {
    const lessons = this.lessonsManager.getAllLessons();
    const roster = this.gamification.getRoster();

    container.innerHTML = `
      <div class="admin-dashboard">
        <div class="admin-top-bar">
          <div class="admin-title">
            <span class="admin-badge-icon">👨‍🏫</span>
            <div>
              <h2>Панель керування курсом (Вчитель)</h2>
              <p>Керуйте 25 уроками, додавайте практичні завдання та аналізуйте успішність класу</p>
            </div>
          </div>

          <div class="admin-top-actions">
            <button class="btn btn-primary" onclick="window.teacherAdmin.openAddLessonModal()">
              ➕ Додати нове завдання
            </button>
            <button class="btn btn-outline" onclick="window.teacherAdmin.exportLessonsJSON()">
              💾 Експорт завдань (JSON)
            </button>
            <button class="btn btn-outline" onclick="window.teacherAdmin.triggerImportJSON()">
              📤 Імпорт завдань
            </button>
            <button class="btn btn-danger-outline" onclick="window.teacherAdmin.handleLogout()">
              🚪 Вийти
            </button>
          </div>
        </div>

        <input type="file" id="import-lessons-file" style="display:none" accept=".json" onchange="window.teacherAdmin.handleFileImport(event)" />

        <!-- Вкладки кабінету -->
        <div class="admin-tabs">
          <button class="admin-tab-btn active" id="tab-lessons-btn" onclick="window.teacherAdmin.switchAdminTab('lessons')">
            📚 Навчальні уроки (${lessons.length})
          </button>
          <button class="admin-tab-btn" id="tab-roster-btn" onclick="window.teacherAdmin.switchAdminTab('roster')">
            📊 Журнал успішності учнів (${roster.length})
          </button>
          <button class="admin-tab-btn" id="tab-settings-btn" onclick="window.teacherAdmin.switchAdminTab('settings')">
            ⚙️ Налаштування доступу
          </button>
        </div>

        <!-- Контент вкладок -->
        <div id="admin-tab-content">
          <!-- Рендериться динамічно -->
        </div>
      </div>
    `;

    this.switchAdminTab('lessons');
  }

  switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`tab-${tabName}-btn`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    if (tabName === 'lessons') {
      this.renderLessonsTab(content);
    } else if (tabName === 'roster') {
      this.renderRosterTab(content);
    } else if (tabName === 'settings') {
      this.renderSettingsTab(content);
    }
  }

  // --- Вкладка уроків ---
  renderLessonsTab(content) {
    const lessons = this.lessonsManager.getAllLessons();

    content.innerHTML = `
      <div class="admin-lessons-table-wrapper">
        <div class="table-actions-bar">
          <div>
            <b>Усього завдань: ${lessons.length}</b> (відповідно до 5 навчальних блоків)
          </div>
          <button class="btn btn-outline btn-small" onclick="window.teacherAdmin.confirmResetLessons()">
            🔄 Скинути до базових 25 уроків
          </button>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Блок</th>
              <th>Назва завдання</th>
              <th>Тип</th>
              <th>XP</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            ${lessons.map(l => `
              <tr>
                <td><b>${l.num || l.id}</b></td>
                <td><span class="badge-block">Блок ${l.blockId}</span></td>
                <td>
                  <div class="lesson-cell-title">${l.title}</div>
                  <small class="text-muted">${(l.task || '').slice(0, 70)}...</small>
                </td>
                <td><span class="badge-type">${l.type || 'console'}</span></td>
                <td><span class="badge-xp">+${l.xp || 50} XP</span></td>
                <td>
                  <div class="actions-cell">
                    <button class="btn btn-small btn-primary" onclick="window.teacherAdmin.openEditLessonModal(${l.id})">✏️ Редагувати</button>
                    <button class="btn btn-small btn-danger-outline" onclick="window.teacherAdmin.deleteLesson(${l.id})">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Вкладка журналу успішності учнів ---
  renderRosterTab(content) {
    const roster = this.gamification.getRoster();

    content.innerHTML = `
      <div class="admin-roster-box">
        <div class="table-actions-bar">
          <div>
            <b>Зареєстровано учнів: ${roster.length}</b>
          </div>
          <button class="btn btn-success btn-small" onclick="window.teacherAdmin.exportRosterCSV()">
            📥 Завантажити журнал у Excel (CSV)
          </button>
        </div>

        <table class="admin-table">
          <thead>
            <tr>
              <th>Учень</th>
              <th>Клас</th>
              <th>Досвід (XP)</th>
              <th>Пройдено уроків</th>
              <th>Прогрес курсу</th>
              <th>Досягнення</th>
              <th>Остання активність</th>
            </tr>
          </thead>
          <tbody>
            ${roster.map(st => {
              const pct = Math.round((st.completedCount / 25) * 100);
              return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 20px;">${st.avatar || '🐢'}</span>
                      <b>${st.name}</b>
                    </div>
                  </td>
                  <td>${st.grade || '5-А'}</td>
                  <td><b>${st.xp} XP</b></td>
                  <td>${st.completedCount} з 25</td>
                  <td>
                    <div class="table-progress-bar">
                      <div class="table-progress-fill" style="width: ${pct}%"></div>
                    </div>
                    <small>${pct}%</small>
                  </td>
                  <td>🏅 ${st.badgesCount || 0}</td>
                  <td><small class="text-muted">${st.lastActive || '-'}</small></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Вкладка налаштувань ---
  renderSettingsTab(content) {
    content.innerHTML = `
      <div class="admin-settings-card">
        <h3>Зміна пароля вчителя</h3>
        <p>Введіть новий пароль для захисту входу в панель вчителя:</p>
        
        <div class="form-group" style="max-width: 400px; margin-top: 15px;">
          <label>Новий пароль:</label>
          <input type="text" id="new-teacher-pwd" class="form-control" value="${this.getSavedPassword()}" />
        </div>

        <div style="margin-top: 15px;">
          <button class="btn btn-primary" onclick="window.teacherAdmin.saveNewPassword()">Зберегти пароль</button>
        </div>
      </div>
    `;
  }

  saveNewPassword() {
    const input = document.getElementById('new-teacher-pwd');
    if (input && input.value.trim()) {
      this.setPassword(input.value.trim());
      alert('Пароль успішно оновлено!');
    }
  }

  handleLogout() {
    this.logout();
    const cont = document.getElementById('admin-container');
    if (cont) this.renderLoginForm(cont);
  }

  // --- Модальне вікно додавання/редагування завдань ---
  openAddLessonModal() {
    const nextNum = this.lessonsManager.getAllLessons().length + 1;
    this.openLessonModal({
      id: Date.now(),
      num: nextNum,
      blockId: 1,
      title: "Новий практичний урок",
      badge: "Практика",
      type: "turtle",
      xp: 80,
      theory: "### Теорія уроку\nОпиши головні поняття...",
      task: "Опиши завдання для учня...",
      initialCode: "import turtle\n# Напиши свій код тут\n",
      expectedOutput: "Очікуваний результат...",
      hints: [
        "Підказка 1: Зверни увагу на...",
        "Підказка 2: Скористайся командою...",
        "Підказка 3: Зразок коду..."
      ],
      sampleSolution: "import turtle\n# Зразок"
    }, false);
  }

  openEditLessonModal(lessonId) {
    const lesson = this.lessonsManager.getLessonById(lessonId);
    if (!lesson) return;
    this.openLessonModal(lesson, true);
  }

  openLessonModal(lesson, isEdit) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop active';
    modal.id = 'lesson-editor-modal';

    modal.innerHTML = `
      <div class="modal-card modal-large">
        <div class="modal-header">
          <h3>${isEdit ? '✏️ Редагування уроку' : '➕ Створення нового завдання'}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('lesson-editor-modal').remove()">×</button>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Назва уроку:</label>
              <input type="text" id="edit-lesson-title" class="form-control" value="${this.escapeHtml(lesson.title)}" />
            </div>
            <div class="form-group" style="width: 140px;">
              <label>Блок курсу:</label>
              <select id="edit-lesson-block" class="form-control">
                <option value="1" ${lesson.blockId == 1 ? 'selected' : ''}>Блок 1 (Алгоритми)</option>
                <option value="2" ${lesson.blockId == 2 ? 'selected' : ''}>Блок 2 (Обчислення)</option>
                <option value="3" ${lesson.blockId == 3 ? 'selected' : ''}>Блок 3 (Turtle)</option>
                <option value="4" ${lesson.blockId == 4 ? 'selected' : ''}>Блок 4 (Умови)</option>
                <option value="5" ${lesson.blockId == 5 ? 'selected' : ''}>Блок 5 (Цикли)</option>
              </select>
            </div>
            <div class="form-group" style="width: 120px;">
              <label>Тип:</label>
              <select id="edit-lesson-type" class="form-control">
                <option value="turtle" ${lesson.type === 'turtle' ? 'selected' : ''}>🐢 Turtle</option>
                <option value="console" ${lesson.type === 'console' ? 'selected' : ''}>💻 Console</option>
                <option value="interactive" ${lesson.type === 'interactive' ? 'selected' : ''}>⚡ Interactive</option>
              </select>
            </div>
            <div class="form-group" style="width: 90px;">
              <label>XP:</label>
              <input type="number" id="edit-lesson-xp" class="form-control" value="${lesson.xp || 75}" />
            </div>
          </div>

          <div class="form-group">
            <label>Теоретична довідка (Markdown/текст для бічної панелі):</label>
            <textarea id="edit-lesson-theory" class="form-control" rows="4">${this.escapeHtml(lesson.theory || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Завдання для учня (що саме треба зробити):</label>
            <textarea id="edit-lesson-task" class="form-control" rows="3">${this.escapeHtml(lesson.task || '')}</textarea>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Початковий код у редакторі (Python):</label>
              <textarea id="edit-lesson-code" class="form-control code-font" rows="5">${this.escapeHtml(lesson.initialCode || '')}</textarea>
            </div>
            <div class="form-group flex-1">
              <label>Очікуваний результат / Підказка для учня:</label>
              <textarea id="edit-lesson-expected" class="form-control code-font" rows="5">${this.escapeHtml(lesson.expectedOutput || '')}</textarea>
            </div>
          </div>

          <div class="form-group">
            <label>Три рівні підказок (по одній у рядок):</label>
            <input type="text" id="edit-lesson-hint-1" class="form-control" style="margin-bottom: 6px;" value="${this.escapeHtml(lesson.hints && lesson.hints[0] ? lesson.hints[0] : '')}" placeholder="Підказка 1: Ідея та напрямок розв'язку" />
            <input type="text" id="edit-lesson-hint-2" class="form-control" style="margin-bottom: 6px;" value="${this.escapeHtml(lesson.hints && lesson.hints[1] ? lesson.hints[1] : '')}" placeholder="Підказка 2: Необхідні команди Python" />
            <input type="text" id="edit-lesson-hint-3" class="form-control" value="${this.escapeHtml(lesson.hints && lesson.hints[2] ? lesson.hints[2] : '')}" placeholder="Підказка 3: Готовий зразок або шпаргалка" />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('lesson-editor-modal').remove()">Скасувати</button>
          <button class="btn btn-primary" onclick="window.teacherAdmin.saveLessonFromModal(${lesson.id}, ${isEdit})">💾 Зберегти зміни</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  saveLessonFromModal(lessonId, isEdit) {
    const title = document.getElementById('edit-lesson-title').value.trim();
    const blockId = Number(document.getElementById('edit-lesson-block').value);
    const type = document.getElementById('edit-lesson-type').value;
    const xp = Number(document.getElementById('edit-lesson-xp').value) || 50;
    const theory = document.getElementById('edit-lesson-theory').value;
    const task = document.getElementById('edit-lesson-task').value;
    const initialCode = document.getElementById('edit-lesson-code').value;
    const expectedOutput = document.getElementById('edit-lesson-expected').value;
    const hints = [
      document.getElementById('edit-lesson-hint-1').value.trim(),
      document.getElementById('edit-lesson-hint-2').value.trim(),
      document.getElementById('edit-lesson-hint-3').value.trim()
    ].filter(h => h.length > 0);

    const updatedData = {
      id: lessonId,
      title,
      blockId,
      type,
      xp,
      theory,
      task,
      initialCode,
      expectedOutput,
      hints
    };

    if (isEdit) {
      this.lessonsManager.updateLesson(lessonId, updatedData);
    } else {
      this.lessonsManager.addLesson(updatedData);
    }

    document.getElementById('lesson-editor-modal').remove();
    this.switchAdminTab('lessons');
    if (window.audioEffects) window.audioEffects.playSuccess();
  }

  deleteLesson(id) {
    if (confirm("Ви дійсно бажаєте видалити це завдання з курсу?")) {
      this.lessonsManager.deleteLesson(id);
      this.switchAdminTab('lessons');
    }
  }

  confirmResetLessons() {
    if (confirm("Скинути всі уроки до початкових 25 уроків за програмою? Усі зміни буде повернуто до стандарту.")) {
      this.lessonsManager.resetToDefaults();
      this.switchAdminTab('lessons');
      alert("Курс скинуто до базових 25 уроків!");
    }
  }

  exportLessonsJSON() {
    const data = JSON.stringify(this.lessonsManager.getAllLessons(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `python_course_25_lessons_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  triggerImportJSON() {
    const fileInput = document.getElementById('import-lessons-file');
    if (fileInput) fileInput.click();
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.lessonsManager.setAllLessons(imported);
          this.switchAdminTab('lessons');
          alert(`Успішно імпортовано ${imported.length} уроків!`);
        } else {
          alert('Помилка формату файлу: очікується масив уроків.');
        }
      } catch (err) {
        alert('Помилка розбору JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  exportRosterCSV() {
    const roster = this.gamification.getRoster();
    let csv = "ID,Ім'я,Клас,XP,Виконано уроків,Бейджі,Остання активність\n";
    roster.forEach(st => {
      csv += `"${st.id}","${st.name}","${st.grade}",${st.xp},${st.completedCount},${st.badgesCount},"${st.lastActive}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress_roster_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.TeacherAdmin = TeacherAdmin;

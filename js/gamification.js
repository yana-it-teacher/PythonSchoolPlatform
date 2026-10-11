/**
 * Система мотивації, гейміфікації, аудіоефектів та конфеті
 * Збереження профілю учня, рівнів, досвіду (XP), стріків та бейджів
 */

// Генератор синтезованих звуків через Web Audio API (без сторонніх аудіофайлів)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }

  playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }, delay);
  }

  playSuccess() {
    // Мажорний акорд (C-E-G-C5)
    this.playTone(523.25, 'triangle', 0.15, 0);     // C5
    this.playTone(659.25, 'triangle', 0.15, 80);    // E5
    this.playTone(783.99, 'triangle', 0.15, 160);   // G5
    this.playTone(1046.50, 'triangle', 0.35, 240);  // C6
  }

  playError() {
    this.playTone(220, 'sawtooth', 0.15, 0, 0.1);
    this.playTone(180, 'sawtooth', 0.25, 100, 0.1);
  }

  playClick() {
    this.playTone(600, 'sine', 0.05, 0, 0.05);
  }

  playLevelUp() {
    // Святкова фанфара
    const notes = [440, 554, 659, 880, 784, 880];
    const delays = [0, 90, 180, 270, 420, 550];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.25, delays[i], 0.2);
    });
  }

  playBadge() {
    this.playTone(587.33, 'triangle', 0.15, 0);
    this.playTone(880.00, 'triangle', 0.35, 120);
  }
}

// Система частинок Confetti на HTML5 Canvas
class ConfettiEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
  }

  setup() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'confetti-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '99999';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  celebrate(count = 90) {
    this.setup();
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 1.5) * 12,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (!this.animId) {
      this.render();
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // гравітація
      p.rotation += p.rotSpeed;
      p.opacity -= 0.012;

      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation * Math.PI / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.render());
    } else {
      this.animId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Головний менеджер гейміфікації та профілів учнів
class GamificationManager {
  constructor() {
    this.storageKey = 'python_school_student_v2';
    this.studentsListKey = 'python_school_students_roster_v2';

    this.ranks = [
      { level: 1, xpReq: 0, title: "Юний дослідник", icon: "🌱" },
      { level: 2, xpReq: 100, title: "Друг Черепашки", icon: "🐢" },
      { level: 3, xpReq: 250, title: "Володар змінних", icon: "📦" },
      { level: 4, xpReq: 450, title: "Майстер обчислень", icon: "🧮" },
      { level: 5, xpReq: 700, title: "Художник Turtle", icon: "🎨" },
      { level: 6, xpReq: 1050, title: "Знавець умов", icon: "🔀" },
      { level: 7, xpReq: 1450, title: "Повелитель циклів", icon: "🔄" },
      { level: 8, xpReq: 1900, title: "Архітектор коду", icon: "🏰" },
      { level: 9, xpReq: 2450, title: "Магістр Python", icon: "🧙‍♂️" },
      { level: 10, xpReq: 3100, title: "Легенда Кодингу", icon: "👑" }
    ];

    this.allBadges = [
      { id: 'first_code', title: 'Перша команда', desc: 'Виконати свій перший урок з print()', icon: '🚀', xp: 50 },
      { id: 'turtle_start', title: 'Оживити Черепашку', desc: 'Намалювати свою першу лінію в Turtle', icon: '🐢', xp: 75 },
      { id: 'math_whiz', title: 'Юний математик', desc: 'Завершити завдання з калькулятором (Блок 2)', icon: '🧮', xp: 100 },
      { id: 'olympic', title: 'Олімпійський рекорд', desc: 'Намалювати олімпійські кільця (Урок 15)', icon: '🏅', xp: 120 },
      { id: 'logic_master', title: 'Майстер логіки', desc: 'Опанувати розгалуження if-else (Блок 4)', icon: '🧠', xp: 100 },
      { id: 'loop_rider', title: 'Володар циклів', desc: 'Створити програму з циклом for (Блок 5)', icon: '🔄', xp: 100 },
      { id: 'syntax_hero', title: 'Синтаксичний ас', desc: 'Набрати 100+ балів у тренажері синтаксису', icon: '⚡', xp: 80 },
      { id: 'streak_5', title: 'Ударна серія', desc: 'Набрати 5 правильних відповідей поспіль', icon: '🔥', xp: 60 },
      { id: 'star_sky', title: 'Зоряний навігатор', desc: 'Створити генератор зоряного неба', icon: '✨', xp: 90 },
      { id: 'perfectionist', title: 'Відмінник', desc: 'Завершити практичну роботу без жодної помилки', icon: '💎', xp: 100 },
      { id: 'halfway', title: 'Екватор курсу', desc: 'Виконати 12 уроків', icon: '⛰️', xp: 150 },
      { id: 'course_grad', title: 'Випускник PythonJunior', desc: 'Пройти всі 25 уроків курсу 5 класу!', icon: '🎓', xp: 300 },
      // Досягнення 6 класу
      { id: 'cyber_drone', title: 'Кібер-пілот', desc: 'Завершити Епізод 1: розгалуження та сенсори дрона', icon: '🛸', xp: 120 },
      { id: 'base_auto', title: 'Автоматизатор бази', desc: 'Завершити Епізод 2: цикли for та накопичення (s += a)', icon: '🏗️', xp: 120 },
      { id: 'time_loop', title: 'Володар петлі часу', desc: 'Опанувати цикл while та захист від помилок', icon: '⏳', xp: 130 },
      { id: 'matrix_arch', title: 'Архітектор матриці', desc: 'Створити 2D-карту за допомогою вкладених циклів', icon: '🔲', xp: 140 },
      { id: 'grade6_grad', title: 'Герой Коду Пригод', desc: 'Пройти всі 19 місій курсу 6 класу!', icon: '👑', xp: 350 }
    ];

    this.loadProfile();
  }

  loadProfile() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        this.profile = JSON.parse(raw);
      } catch (e) {
        this.initDefaultProfile();
      }
    } else {
      this.initDefaultProfile();
    }

    // Забезпечуємо цілісність полів
    if (!this.profile.completedLessons) this.profile.completedLessons = [];
    if (!this.profile.badges) this.profile.badges = [];
    if (!this.profile.streak) this.profile.streak = 1;
    if (!this.profile.gems) this.profile.gems = 10;
    if (this.profile.xp === undefined) this.profile.xp = 0;
    if (!this.profile.avatar) this.profile.avatar = '🐢';
  }

  initDefaultProfile(name = "Учень", grade = "5-А") {
    this.profile = {
      id: 'student_' + Date.now(),
      name: name,
      grade: grade,
      avatar: '🐢',
      xp: 0,
      gems: 20,
      streak: 1,
      lastActive: new Date().toISOString().split('T')[0],
      completedLessons: [],
      savedDrafts: {},
      badges: []
    };
    this.saveProfile();
    this.registerInRoster();
  }

  saveProfile() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    this.registerInRoster();
    this.updateHeaderUI();
  }

  registerInRoster() {
    let roster = [];
    const raw = localStorage.getItem(this.studentsListKey);
    if (raw) {
      try { roster = JSON.parse(raw); } catch (e) {}
    }
    const idx = roster.findIndex(s => s.id === this.profile.id);
    const summary = {
      id: this.profile.id,
      name: this.profile.name,
      grade: this.profile.grade,
      avatar: this.profile.avatar,
      xp: this.profile.xp,
      completedCount: this.profile.completedLessons.length,
      badgesCount: this.profile.badges.length,
      lastActive: new Date().toLocaleDateString('uk-UA')
    };
    if (idx >= 0) {
      roster[idx] = summary;
    } else {
      roster.push(summary);
    }
    localStorage.setItem(this.studentsListKey, JSON.stringify(roster));
  }

  getRoster() {
    const raw = localStorage.getItem(this.studentsListKey);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return [this.profile];
  }

  switchProfile(studentName, studentGrade = "5-А", avatar = "🐢") {
    this.profile.name = studentName.trim() || "Учень";
    this.profile.grade = studentGrade;
    this.profile.avatar = avatar;
    this.saveProfile();
  }

  addXP(amount, reason = "") {
    const prevRank = this.getCurrentRank();
    this.profile.xp += amount;
    this.profile.gems += Math.floor(amount / 10);
    this.saveProfile();

    const newRank = this.getCurrentRank();
    if (newRank.level > prevRank.level) {
      this.celebrateLevelUp(newRank);
    }

    this.showFloatingXP(amount, reason);
  }

  getCurrentRank() {
    let curr = this.ranks[0];
    for (let r of this.ranks) {
      if (this.profile.xp >= r.xpReq) {
        curr = r;
      } else {
        break;
      }
    }
    return curr;
  }

  getNextRank() {
    const curr = this.getCurrentRank();
    const nextIdx = this.ranks.findIndex(r => r.level === curr.level) + 1;
    return this.ranks[nextIdx] || null;
  }

  markLessonComplete(lessonId, xpReward) {
    if (!this.profile.completedLessons.includes(lessonId)) {
      this.profile.completedLessons.push(lessonId);
      this.addXP(xpReward, `Урок ${lessonId} виконано!`);

      // Перевірка досягнень
      this.checkAchievementsAfterLesson(lessonId);
      this.saveProfile();
      return true;
    }
    return false;
  }

  isLessonComplete(lessonId) {
    return this.profile.completedLessons.includes(lessonId);
  }

  checkAchievementsAfterLesson(lessonId) {
    // Досягнення 5 класу
    if (lessonId === 1 || lessonId === 3) this.unlockBadge('first_code');
    if (lessonId === 5) this.unlockBadge('turtle_start');
    if (lessonId === 10) this.unlockBadge('math_whiz');
    if (lessonId === 15) this.unlockBadge('olympic');
    if (lessonId === 20) this.unlockBadge('logic_master');
    if (lessonId === 21) this.unlockBadge('loop_rider');
    if (lessonId === 22) this.unlockBadge('star_sky');
    const grade5Done = this.profile.completedLessons.filter(id => id <= 25).length;
    if (grade5Done >= 12) this.unlockBadge('halfway');
    if (grade5Done >= 25) this.unlockBadge('course_grad');

    // Досягнення 6 класу
    if (lessonId === 106) this.unlockBadge('cyber_drone');
    if (lessonId === 109) this.unlockBadge('base_auto');
    if (lessonId === 115) this.unlockBadge('time_loop');
    if (lessonId === 117 || lessonId === 118) this.unlockBadge('matrix_arch');
    const grade6Done = this.profile.completedLessons.filter(id => id >= 101 && id <= 119).length;
    if (grade6Done >= 19) this.unlockBadge('grade6_grad');
  }

  unlockBadge(badgeId) {
    if (this.profile.badges.includes(badgeId)) return;
    const badge = this.allBadges.find(b => b.id === badgeId);
    if (!badge) return;

    this.profile.badges.push(badgeId);
    this.addXP(badge.xp, `Досягнення: ${badge.title}`);
    this.saveProfile();

    if (window.audioEffects) window.audioEffects.playBadge();
    if (window.confettiEffect) window.confettiEffect.celebrate(60);

    this.showBadgeModal(badge);
  }

  celebrateLevelUp(rank) {
    if (window.audioEffects) window.audioEffects.playLevelUp();
    if (window.confettiEffect) window.confettiEffect.celebrate(100);

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop active';
    modal.innerHTML = `
      <div class="modal-card celebration-modal">
        <div class="level-badge-large">${rank.icon}</div>
        <h2>НОВИЙ РІВЕНЬ ДОСЯГНУТО!</h2>
        <h3 class="rank-name">${rank.title} (Рівень ${rank.level})</h3>
        <p>Вітаємо! Твої знання мови Python зростають з кожним кодом! Продовжуй у тому ж дусі!</p>
        <button class="btn btn-primary btn-large" onclick="this.closest('.modal-backdrop').remove()">
          🚀 Вперед до наступного рівня!
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showBadgeModal(badge) {
    const toast = document.createElement('div');
    toast.className = 'badge-unlock-toast';
    toast.innerHTML = `
      <div class="badge-toast-icon">${badge.icon}</div>
      <div>
        <div class="badge-toast-label">НОВЕ ДОСЯГНЕННЯ РОЗБЛОКОВАНО!</div>
        <div class="badge-toast-title">${badge.title} (+${badge.xp} XP)</div>
        <div class="badge-toast-desc">${badge.desc}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  showFloatingXP(amount, reason) {
    const el = document.createElement('div');
    el.className = 'floating-xp-pill';
    el.innerHTML = `+${amount} XP <small>${reason}</small>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  updateHeaderUI() {
    const nameEl = document.getElementById('header-student-name');
    const avatarEl = document.getElementById('header-student-avatar');
    const xpEl = document.getElementById('header-xp-val');
    const gemsEl = document.getElementById('header-gems-val');
    const levelEl = document.getElementById('header-level-val');
    const levelTitleEl = document.getElementById('header-level-title');
    const progressBar = document.getElementById('header-xp-progress');

    const currRank = this.getCurrentRank();
    const nextRank = this.getNextRank();

    if (nameEl) nameEl.textContent = `${this.profile.name} (${this.profile.grade})`;
    if (avatarEl) avatarEl.textContent = this.profile.avatar;
    if (xpEl) xpEl.textContent = `${this.profile.xp} XP`;
    if (gemsEl) gemsEl.textContent = this.profile.gems;
    if (levelEl) levelEl.textContent = `Рівень ${currRank.level}`;
    if (levelTitleEl) levelTitleEl.textContent = currRank.title;

    if (progressBar) {
      if (nextRank) {
        const span = nextRank.xpReq - currRank.xpReq;
        const currentInSpan = this.profile.xp - currRank.xpReq;
        const pct = Math.min(100, Math.max(5, Math.round((currentInSpan / span) * 100)));
        progressBar.style.width = pct + '%';
      } else {
        progressBar.style.width = '100%';
      }
    }
  }
}

window.SoundFX = SoundFX;
window.ConfettiEngine = ConfettiEngine;
window.GamificationManager = GamificationManager;

window.audioEffects = new SoundFX();
window.confettiEffect = new ConfettiEngine();

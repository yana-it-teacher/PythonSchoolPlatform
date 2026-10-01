/**
 * Інтерактивний рушій Turtle Graphics на HTML5 Canvas
 * Підтримує повний набір команд шкільного курсу, анімацію, координатну сітку
 */

class TurtleGraphics {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Віртуальні координати: (0,0) - центр полотна
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.showGrid = false;
    this.animationSpeed = 3; // 1 (повільно) - 5 (миттєво)
    this.isRunning = false;
    this.queue = [];
    this.actionsLog = []; // Для валідації виконання завдання

    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.angle = 0; // 0 градусів = вправо (схід), 90 = вгору (північ)
    this.isPenDown = true;
    this.penColor = '#1e293b';
    this.penWidth = 2;
    this.fillColor = '#3b82f6';
    this.isFilling = false;
    this.fillPolygon = [];
    this.visible = true;
    this.speed = 3;
    this.queue = [];
    this.actionsLog = [];
    this.isRunning = false;

    // Створюємо буферний шар для малювання, щоб черепашка не затирала лінії при перемальовуванні
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.width;
      this.offscreenCanvas.height = this.height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    this.offscreenCtx.fillStyle = '#ffffff';
    this.offscreenCtx.fillRect(0, 0, this.width, this.height);
    
    this.redraw();
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.redraw();
    return this.showGrid;
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';

    // Сітка 50x50
    const step = 50;
    for (let x = this.centerX % step; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
      const val = x - this.centerX;
      if (val !== 0) ctx.fillText(val, x + 2, this.centerY + 12);
    }

    for (let y = this.centerY % step; y < this.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      const val = this.centerY - y;
      if (val !== 0) ctx.fillText(val, this.centerX + 4, y - 2);
    }

    // Головні осі X та Y
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.centerY);
    ctx.lineTo(this.width, this.centerY);
    ctx.moveTo(this.centerX, 0);
    ctx.lineTo(this.centerX, this.height);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('(0,0)', this.centerX + 5, this.centerY - 5);
    ctx.fillText('+X', this.width - 25, this.centerY - 5);
    ctx.fillText('+Y', this.centerX + 5, 15);

    ctx.restore();
  }

  drawTurtleIcon() {
    if (!this.visible) return;
    const ctx = this.ctx;
    const screenX = this.centerX + this.x;
    const screenY = this.centerY - this.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    // У Canvas кут іде за годинниковою стрілкою від осі X, у Turtle - проти
    ctx.rotate(-this.angle * Math.PI / 180);

    // Малюємо милу черепашку
    // Тіло (панцир)
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 1.5;

    // Лапки
    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.ellipse(4, -8, 4, 2, 0.4, 0, Math.PI * 2);
    ctx.ellipse(4, 8, 4, 2, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-6, -7, 3, 2, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-6, 7, 3, 2, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Хвостик
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-14, 0);
    ctx.stroke();

    // Голова
    ctx.beginPath();
    ctx.arc(10, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Оченята
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(11, -1.8, 1, 0, Math.PI * 2);
    ctx.arc(11, 1.8, 1, 0, Math.PI * 2);
    ctx.fill();

    // Панцир
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Візерунок на панцирі
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.moveTo(0, -4);
    ctx.lineTo(0, 4);
    ctx.stroke();

    ctx.restore();
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    if (this.showGrid) {
      this.drawGrid();
    }

    this.drawTurtleIcon();
  }

  // --- Команди Черепашки (додавання в чергу) ---

  forward(distance) {
    this.queue.push({ type: 'forward', distance: Number(distance) });
    this.actionsLog.push({ type: 'forward', val: distance });
  }

  backward(distance) {
    this.forward(-Number(distance));
  }

  left(angle) {
    this.queue.push({ type: 'turn', angle: Number(angle) });
    this.actionsLog.push({ type: 'turn', val: angle, dir: 'left' });
  }

  right(angle) {
    this.queue.push({ type: 'turn', angle: -Number(angle) });
    this.actionsLog.push({ type: 'turn', val: angle, dir: 'right' });
  }

  goto(x, y) {
    this.queue.push({ type: 'goto', x: Number(x), y: Number(y) });
    this.actionsLog.push({ type: 'goto', x: Number(x), y: Number(y) });
  }

  penup() {
    this.queue.push({ type: 'pen', down: false });
    this.actionsLog.push({ type: 'penup' });
  }

  pendown() {
    this.queue.push({ type: 'pen', down: true });
    this.actionsLog.push({ type: 'pendown' });
  }

  pencolor(color) {
    this.queue.push({ type: 'pencolor', color: String(color) });
    this.actionsLog.push({ type: 'pencolor', val: color });
  }

  fillcolor(color) {
    this.queue.push({ type: 'fillcolor', color: String(color) });
    this.actionsLog.push({ type: 'fillcolor', val: color });
  }

  color(color) {
    this.pencolor(color);
    this.fillcolor(color);
  }

  width(w) {
    this.queue.push({ type: 'width', width: Number(w) });
    this.actionsLog.push({ type: 'width', val: w });
  }

  begin_fill() {
    this.queue.push({ type: 'begin_fill' });
    this.actionsLog.push({ type: 'begin_fill' });
  }

  end_fill() {
    this.queue.push({ type: 'end_fill' });
    this.actionsLog.push({ type: 'end_fill' });
  }

  circle(radius) {
    this.queue.push({ type: 'circle', radius: Number(radius) });
    this.actionsLog.push({ type: 'circle', val: radius });
  }

  dot(size = 5, color = null) {
    this.queue.push({ type: 'dot', size: Number(size), color });
    this.actionsLog.push({ type: 'dot', size, color });
  }

  write(text, font = "Arial 12px normal") {
    this.queue.push({ type: 'write', text: String(text), font });
    this.actionsLog.push({ type: 'write', text });
  }

  speed(s) {
    this.queue.push({ type: 'speed', speed: Number(s) });
  }

  hideturtle() {
    this.queue.push({ type: 'visibility', visible: false });
  }

  showturtle() {
    this.queue.push({ type: 'visibility', visible: true });
  }

  clear() {
    this.queue.push({ type: 'clear' });
  }

  // --- Виконання черги анімацій ---
  async executeQueue(onComplete) {
    this.isRunning = true;
    
    // Якщо швидкість максимальна (0 у Python або 5 у налаштуваннях), виконуємо миттєво
    if (this.animationSpeed === 5) {
      while (this.queue.length > 0 && this.isRunning) {
        const item = this.queue.shift();
        this.applyActionDirect(item);
      }
      this.redraw();
      this.isRunning = false;
      if (onComplete) onComplete();
      return;
    }

    const processNext = () => {
      if (!this.isRunning || this.queue.length === 0) {
        this.isRunning = false;
        this.redraw();
        if (onComplete) onComplete();
        return;
      }

      const item = this.queue.shift();
      this.applyActionDirect(item);
      this.redraw();

      const delay = Math.max(10, (6 - this.animationSpeed) * 35);
      setTimeout(processNext, delay);
    };

    processNext();
  }

  stop() {
    this.isRunning = false;
    this.queue = [];
  }

  applyActionDirect(item) {
    const ctx = this.offscreenCtx;

    switch (item.type) {
      case 'forward': {
        const rad = this.angle * Math.PI / 180;
        const newX = this.x + item.distance * Math.cos(rad);
        const newY = this.y + item.distance * Math.sin(rad);

        if (this.isPenDown) {
          ctx.strokeStyle = this.penColor;
          ctx.lineWidth = this.penWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(this.centerX + this.x, this.centerY - this.y);
          ctx.lineTo(this.centerX + newX, this.centerY - newY);
          ctx.stroke();

          if (this.isFilling) {
            this.fillPolygon.push({ x: this.centerX + newX, y: this.centerY - newY });
          }
        }

        this.x = newX;
        this.y = newY;
        break;
      }

      case 'turn': {
        this.angle = (this.angle + item.angle) % 360;
        break;
      }

      case 'goto': {
        if (this.isPenDown) {
          ctx.strokeStyle = this.penColor;
          ctx.lineWidth = this.penWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(this.centerX + this.x, this.centerY - this.y);
          ctx.lineTo(this.centerX + item.x, this.centerY - item.y);
          ctx.stroke();

          if (this.isFilling) {
            this.fillPolygon.push({ x: this.centerX + item.x, y: this.centerY - item.y });
          }
        }
        this.x = item.x;
        this.y = item.y;
        break;
      }

      case 'pen':
        this.isPenDown = item.down;
        break;

      case 'pencolor':
        this.penColor = item.color;
        break;

      case 'fillcolor':
        this.fillColor = item.color;
        break;

      case 'width':
        this.penWidth = Math.max(1, item.width);
        break;

      case 'begin_fill':
        this.isFilling = true;
        this.fillPolygon = [{ x: this.centerX + this.x, y: this.centerY - this.y }];
        break;

      case 'end_fill':
        if (this.isFilling && this.fillPolygon.length > 2) {
          ctx.save();
          ctx.fillStyle = this.fillColor;
          ctx.beginPath();
          ctx.moveTo(this.fillPolygon[0].x, this.fillPolygon[0].y);
          for (let i = 1; i < this.fillPolygon.length; i++) {
            ctx.lineTo(this.fillPolygon[i].x, this.fillPolygon[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        this.isFilling = false;
        this.fillPolygon = [];
        break;

      case 'circle': {
        const r = item.radius;
        // У Python Turtle коло малюється зліва від поточного напрямку
        const cx = this.centerX + this.x - r * Math.sin(this.angle * Math.PI / 180);
        const cy = this.centerY - this.y - r * Math.cos(this.angle * Math.PI / 180);

        if (this.isPenDown) {
          ctx.strokeStyle = this.penColor;
          ctx.lineWidth = this.penWidth;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.abs(r), 0, Math.PI * 2);
          ctx.stroke();

          if (this.isFilling) {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
          }
        }
        break;
      }

      case 'dot': {
        const dotColor = item.color || this.penColor;
        ctx.save();
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(this.centerX + this.x, this.centerY - this.y, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'write': {
        ctx.save();
        ctx.fillStyle = this.penColor;
        ctx.font = typeof item.font === 'string' ? item.font : '14px sans-serif';
        ctx.fillText(item.text, this.centerX + this.x, this.centerY - this.y);
        ctx.restore();
        break;
      }

      case 'speed':
        if (item.speed === 0) this.animationSpeed = 5;
        else this.animationSpeed = Math.min(5, Math.max(1, item.speed));
        break;

      case 'visibility':
        this.visible = item.visible;
        break;

      case 'clear':
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);
        break;
    }
  }

  exportImage() {
    return this.canvas.toDataURL('image/png');
  }
}

window.TurtleGraphics = TurtleGraphics;

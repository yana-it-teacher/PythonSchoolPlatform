/**
 * Вбудований безпечний інтерпретатор Python для навчальних завдань 5 та 6 класів
 * Підтримує:
 * - print, input, f-strings, змінні та типи даних
 * - turtle графіка (HTML5 Canvas)
 * - повне розгалуження: if, ланцюжки elif, else, вкладені if
 * - цикли: for var in range(...), цикл while з безпечним лічильником ітерацій
 * - оператори переривання: break, continue
 * - накопичення: +=, -=, *=, /=
 * - логічні зв'язки: and, or, not
 * - випадкові числа: random.randint, random.choice
 */

class PythonEngine {
  constructor(turtleInstance, consoleCallback, inputCallback) {
    this.turtle = turtleInstance;
    this.printToConsole = consoleCallback;
    this.promptInput = inputCallback;
    this.variables = {};
    this.stopped = false;
  }

  setTurtle(turtle) {
    this.turtle = turtle;
  }

  stop() {
    this.stopped = true;
    if (this.turtle) this.turtle.stop();
  }

  async run(code) {
    this.stopped = false;
    this.variables = {};
    if (this.turtle) this.turtle.reset();

    const lines = code.split('\n');

    // Попередня валідація типових помилок школярів
    const syntaxErr = this.checkBasicSyntax(lines);
    if (syntaxErr) {
      this.printToConsole(`❌ ${syntaxErr}`, 'error');
      return { success: false, error: syntaxErr };
    }

    try {
      await this.executeBlock(lines, 0, 0, this.variables);
      
      // Якщо в коді була черепашка - запускаємо анімацію накопиченої черги
      if (this.turtle && this.turtle.queue.length > 0) {
        await new Promise((resolve) => {
          this.turtle.executeQueue(resolve);
        });
      }

      return { success: true, variables: this.variables };
    } catch (err) {
      this.printToConsole(`❌ Помилка виконання: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  }

  checkBasicSyntax(lines) {
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      const lineNum = i + 1;

      if (!trimmed || trimmed.startsWith('#')) continue;

      // Перевірка на велику літеру Print
      if (/^Print\s*\(/.test(trimmed)) {
        return `Рядок ${lineNum}: У Python команда 'print' пишеться лише маленькими літерами! Заміни 'Print' на 'print'.`;
      }

      // Перевірка двокрапки в if, elif, else, for, while
      if (/^(if|elif|for|while)\b/.test(trimmed) && !trimmed.endsWith(':')) {
        return `Рядок ${lineNum}: Пропущено двокрапку ':' в кінці рядка '${trimmed}'. У Python після умов та циклів завжди ставиться ':'`;
      }
      if (/^else\b/.test(trimmed) && trimmed !== 'else:') {
        return `Рядок ${lineNum}: Після 'else' має бути лише двокрапка ':' (наприклад, 'else:').`;
      }

      // Перевірка непарних лапок
      const doubleQuotes = (trimmed.match(/"/g) || []).length;
      const singleQuotes = (trimmed.match(/'/g) || []).length;
      if (doubleQuotes % 2 !== 0 && singleQuotes % 2 !== 0) {
        return `Рядок ${lineNum}: Незакриті лапки в рядку. Переконайся, що кожна лапка має пару.`;
      }
    }
    return null;
  }

  getIndent(line) {
    let count = 0;
    for (let char of line) {
      if (char === ' ') count++;
      else if (char === '\t') count += 4;
      else break;
    }
    return count;
  }

  async executeBlock(lines, startIndex, targetIndent, scope) {
    let i = startIndex;

    while (i < lines.length) {
      if (this.stopped) return { nextIndex: i, flow: 'stop' };

      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      const indent = this.getIndent(raw);
      if (indent < targetIndent) {
        return { nextIndex: i, flow: 'normal' };
      }

      // 0. Оператори break та continue
      if (trimmed === 'break') {
        return { nextIndex: i + 1, flow: 'break' };
      }
      if (trimmed === 'continue') {
        return { nextIndex: i + 1, flow: 'continue' };
      }

      // 1. Цикл for var in range(...)
      const forMatch = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+range\((.*)\)\s*:$/);
      if (forMatch) {
        const varName = forMatch[1];
        const rangeArgsStr = forMatch[2];
        const rangeArgs = rangeArgsStr.split(',').map(s => this.evaluateExpression(s.trim(), scope));
        
        let start = 0, stop = 0, step = 1;
        if (rangeArgs.length === 1) {
          stop = Number(rangeArgs[0]);
        } else if (rangeArgs.length === 2) {
          start = Number(rangeArgs[0]);
          stop = Number(rangeArgs[1]);
        } else if (rangeArgs.length === 3) {
          start = Number(rangeArgs[0]);
          stop = Number(rangeArgs[1]);
          step = Number(rangeArgs[2]);
        }

        // Знаходимо рядки тіла циклу
        const bodyStart = i + 1;
        let bodyEnd = bodyStart;
        while (bodyEnd < lines.length) {
          const bodyRaw = lines[bodyEnd];
          const bodyTrimmed = bodyRaw.trim();
          if (!bodyTrimmed || bodyTrimmed.startsWith('#')) {
            bodyEnd++;
            continue;
          }
          if (this.getIndent(bodyRaw) <= indent) break;
          bodyEnd++;
        }

        const bodyLines = lines.slice(bodyStart, bodyEnd);
        const childIndent = bodyLines.length > 0 ? this.getIndent(bodyLines[0]) : indent + 4;

        for (let val = start; (step > 0 ? val < stop : val > stop); val += step) {
          if (this.stopped) break;
          scope[varName] = val;
          const res = await this.executeBlock(bodyLines, 0, childIndent, scope);
          if (res.flow === 'break') break;
          if (res.flow === 'stop') return res;
        }

        i = bodyEnd;
        continue;
      }

      // 2. Цикл while умова:
      const whileMatch = trimmed.match(/^while\s+(.*):$/);
      if (whileMatch) {
        const condExpr = whileMatch[1];

        // Знаходимо рядки тіла циклу
        const bodyStart = i + 1;
        let bodyEnd = bodyStart;
        while (bodyEnd < lines.length) {
          const bodyRaw = lines[bodyEnd];
          const bodyTrimmed = bodyRaw.trim();
          if (!bodyTrimmed || bodyTrimmed.startsWith('#')) {
            bodyEnd++;
            continue;
          }
          if (this.getIndent(bodyRaw) <= indent) break;
          bodyEnd++;
        }

        const bodyLines = lines.slice(bodyStart, bodyEnd);
        const childIndent = bodyLines.length > 0 ? this.getIndent(bodyLines[0]) : indent + 4;

        // Захист від нескінченних циклів
        let loopIterations = 0;
        const MAX_LOOP = 5000;

        while (Boolean(this.evaluateCondition(condExpr, scope))) {
          if (this.stopped) break;
          loopIterations++;
          if (loopIterations > MAX_LOOP) {
            throw new Error(`Можливе зациклення! Цикл while перевищив ліміт у ${MAX_LOOP} ітерацій. Перевір умову виходу з циклу.`);
          }

          const res = await this.executeBlock(bodyLines, 0, childIndent, scope);
          if (res.flow === 'break') break;
          if (res.flow === 'stop') return res;
        }

        i = bodyEnd;
        continue;
      }

      // 3. Умовний блок if / elif / else
      const ifMatch = trimmed.match(/^if\s+(.*):$/);
      if (ifMatch) {
        // Збираємо весь каскад: if ... [elif ...] ... [else ...]
        const branches = [];
        branches.push({ type: 'if', cond: ifMatch[1], lineIndex: i });

        let scanIdx = i + 1;
        let currentBranchLines = [];
        let branchStartIdx = scanIdx;

        while (scanIdx < lines.length) {
          const r = lines[scanIdx];
          const t = r.trim();
          if (!t || t.startsWith('#')) {
            scanIdx++;
            continue;
          }

          const lineInd = this.getIndent(r);
          if (lineInd === indent) {
            if (t.startsWith('elif ') && t.endsWith(':')) {
              // Зберігаємо попередній блок
              branches[branches.length - 1].lines = lines.slice(branchStartIdx, scanIdx);
              branches.push({ type: 'elif', cond: t.slice(5, -1).trim(), lineIndex: scanIdx });
              branchStartIdx = scanIdx + 1;
              scanIdx++;
              continue;
            } else if (t === 'else:') {
              branches[branches.length - 1].lines = lines.slice(branchStartIdx, scanIdx);
              branches.push({ type: 'else', cond: 'True', lineIndex: scanIdx });
              branchStartIdx = scanIdx + 1;
              scanIdx++;
              continue;
            } else {
              break; // Звичайна команда того самого рівня
            }
          } else if (lineInd < indent) {
            break; // Вихід на вищий рівень
          }
          scanIdx++;
        }

        branches[branches.length - 1].lines = lines.slice(branchStartIdx, scanIdx);

        // Виконуємо першу гілку, чия умова є істинною
        let executedAny = false;
        for (let branch of branches) {
          let condValue = false;
          if (branch.type === 'else') {
            condValue = !executedAny;
          } else {
            condValue = Boolean(this.evaluateCondition(branch.cond, scope));
          }

          if (condValue && !executedAny) {
            executedAny = true;
            const bLines = branch.lines || [];
            const childIndent = bLines.length > 0 ? this.getIndent(bLines[0]) : indent + 4;
            const res = await this.executeBlock(bLines, 0, childIndent, scope);
            if (res.flow === 'break' || res.flow === 'continue' || res.flow === 'stop') {
              return res;
            }
          }
        }

        i = scanIdx;
        continue;
      }

      // 4. Звичайна інструкція
      await this.executeStatement(trimmed, scope);
      i++;
    }

    return { nextIndex: i, flow: 'normal' };
  }

  async executeStatement(line, scope) {
    if (this.stopped) return;

    // Ігноруємо import
    if (line.startsWith('import ') || line.startsWith('from ')) {
      return;
    }

    // Присвоєння зі скороченим оператором: score += 1
    const augMatch = line.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.*)$/);
    if (augMatch) {
      const varName = augMatch[1];
      const op = augMatch[2];
      const expr = augMatch[3];
      const val = this.evaluateExpression(expr, scope);
      const curr = scope[varName] !== undefined ? scope[varName] : 0;
      if (op === '+=') scope[varName] = curr + val;
      else if (op === '-=') scope[varName] = curr - val;
      else if (op === '*=') scope[varName] = curr * val;
      else if (op === '/=') scope[varName] = curr / val;
      return;
    }

    // Присвоєння: var_name = expression
    const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.*)$/);
    if (assignMatch) {
      const varName = assignMatch[1];
      const expr = assignMatch[2];

      // Якщо вираз містить input(...)
      if (/input\s*\(/.test(expr)) {
        const val = await this.handleInputExpression(expr, scope);
        scope[varName] = val;
        return;
      }

      const val = this.evaluateExpression(expr, scope);
      scope[varName] = val;
      return;
    }

    // Виклик print(...)
    if (line.startsWith('print(') && line.endsWith(')')) {
      const inner = line.slice(6, -1);
      const output = this.evaluatePrintArgs(inner, scope);
      this.printToConsole(output, 'stdout');
      return;
    }

    // Виклик команди Turtle: turtle.forward(100), forward(100) тощо
    if (this.turtle && (/^(turtle\.)?(forward|fd|backward|bk|left|lt|right|rt|goto|penup|up|pendown|down|pencolor|fillcolor|color|begin_fill|end_fill|circle|dot|write|width|speed|clear|reset|hideturtle|showturtle)\s*\(/.test(line))) {
      this.executeTurtleCommand(line, scope);
      return;
    }

    // Одиночний виклик input()
    if (/input\s*\(/.test(line)) {
      await this.handleInputExpression(line, scope);
      return;
    }

    // Загальний вираз
    this.evaluateExpression(line, scope);
  }

  async handleInputExpression(expr, scope) {
    const promptMatch = expr.match(/input\s*\(\s*(f?["'].*?["']|.*?)\s*\)/);
    let promptText = "Введіть дані:";
    if (promptMatch && promptMatch[1]) {
      promptText = this.evaluateExpression(promptMatch[1], scope);
    }

    const userInput = await this.promptInput(promptText);

    // Якщо всередині int(input(...))
    if (/^int\s*\(.*input.*?\)$/.test(expr)) {
      const num = parseInt(userInput, 10);
      return isNaN(num) ? 0 : num;
    }
    if (/^float\s*\(.*input.*?\)$/.test(expr)) {
      const num = parseFloat(userInput);
      return isNaN(num) ? 0.0 : num;
    }

    return String(userInput);
  }

  executeTurtleCommand(line, scope) {
    const clean = line.replace(/^turtle\./, '');
    const match = clean.match(/^([a-zA-Z_]\w*)\s*\((.*)\)$/);
    if (!match) return;

    const cmd = match[1];
    const argsStr = match[2];
    const rawArgs = this.splitArgs(argsStr).map(a => this.evaluateExpression(a.trim(), scope));

    switch (cmd) {
      case 'forward':
      case 'fd':
        this.turtle.forward(rawArgs[0] || 0);
        break;
      case 'backward':
      case 'bk':
        this.turtle.backward(rawArgs[0] || 0);
        break;
      case 'left':
      case 'lt':
        this.turtle.left(rawArgs[0] || 0);
        break;
      case 'right':
      case 'rt':
        this.turtle.right(rawArgs[0] || 0);
        break;
      case 'goto':
      case 'setposition':
        this.turtle.goto(rawArgs[0] || 0, rawArgs[1] || 0);
        break;
      case 'penup':
      case 'up':
        this.turtle.penup();
        break;
      case 'pendown':
      case 'down':
        this.turtle.pendown();
        break;
      case 'pencolor':
        this.turtle.pencolor(rawArgs[0]);
        break;
      case 'fillcolor':
        this.turtle.fillcolor(rawArgs[0]);
        break;
      case 'color':
        this.turtle.color(rawArgs[0]);
        break;
      case 'begin_fill':
        this.turtle.begin_fill();
        break;
      case 'end_fill':
        this.turtle.end_fill();
        break;
      case 'circle':
        this.turtle.circle(rawArgs[0] || 10);
        break;
      case 'dot':
        this.turtle.dot(rawArgs[0] || 5, rawArgs[1]);
        break;
      case 'write':
        this.turtle.write(rawArgs[0] || "");
        break;
      case 'width':
      case 'pensize':
        this.turtle.width(rawArgs[0] || 2);
        break;
      case 'speed':
        this.turtle.speed(rawArgs[0] || 3);
        break;
      case 'clear':
        this.turtle.clear();
        break;
      case 'reset':
        this.turtle.reset();
        break;
      case 'hideturtle':
        this.turtle.hideturtle();
        break;
      case 'showturtle':
        this.turtle.showturtle();
        break;
    }
  }

  evaluatePrintArgs(inner, scope) {
    if (!inner.trim()) return "";

    const args = this.splitArgs(inner);
    let sep = ' ';
    let result = [];

    for (let arg of args) {
      const trimmed = arg.trim();
      if (trimmed.startsWith('sep=')) {
        sep = this.evaluateExpression(trimmed.slice(4), scope);
      } else if (trimmed.startsWith('end=')) {
        // end ігноруємо або підтримуємо
      } else {
        result.push(this.evaluateExpression(trimmed, scope));
      }
    }

    return result.join(sep);
  }

  splitArgs(str) {
    const results = [];
    let current = '';
    let inDouble = false;
    let inSingle = false;
    let parenDepth = 0;

    for (let char of str) {
      if (char === '"' && !inSingle) inDouble = !inDouble;
      else if (char === "'" && !inDouble) inSingle = !inSingle;
      else if (char === '(' && !inDouble && !inSingle) parenDepth++;
      else if (char === ')' && !inDouble && !inSingle) parenDepth--;

      if (char === ',' && !inDouble && !inSingle && parenDepth === 0) {
        results.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) results.push(current);
    return results;
  }

  evaluateCondition(condStr, scope) {
    // Обробка логічних and, or, not
    let processed = condStr
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!');

    return this.evaluateExpression(processed, scope);
  }

  evaluateExpression(expr, scope) {
    let clean = expr.trim();
    if (!clean) return "";

    // 1. f-string: f"Текст {var}"
    if (/^f["']/.test(clean)) {
      const content = clean.slice(2, -1);
      return content.replace(/\{([^}]+)\}/g, (match, p1) => {
        return this.evaluateExpression(p1, scope);
      });
    }

    // 2. Рядковий літерал "текст" або 'текст'
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      let raw = clean.slice(1, -1);
      return raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    }

    // 3. Дублювання рядка: "*" * 15 або var * 15
    const repeatMatch = clean.match(/^((?:["'].*?["'])|[a-zA-Z_]\w*)\s*\*\s*(\d+|[a-zA-Z_]\w*)$/);
    if (repeatMatch) {
      const left = this.evaluateExpression(repeatMatch[1], scope);
      const right = this.evaluateExpression(repeatMatch[2], scope);
      if (typeof left === 'string' && typeof right === 'number') {
        return left.repeat(Math.max(0, right));
      }
    }

    // 4. random.randint(a, b)
    const randMatch = clean.match(/^random\.randint\((.*?),(.*?)\)$/);
    if (randMatch) {
      const min = Number(this.evaluateExpression(randMatch[1], scope));
      const max = Number(this.evaluateExpression(randMatch[2], scope));
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // random.choice(list)
    const choiceMatch = clean.match(/^random\.choice\((.*)\)$/);
    if (choiceMatch) {
      const listVal = this.evaluateExpression(choiceMatch[1], scope);
      if (Array.isArray(listVal) && listVal.length > 0) {
        return listVal[Math.floor(Math.random() * listVal.length)];
      }
    }

    // 5. Цілочисельне ділення // та остача %
    if (clean.includes('//')) {
      const parts = clean.split('//');
      const a = this.evaluateExpression(parts[0], scope);
      const b = this.evaluateExpression(parts[1], scope);
      return Math.floor(Number(a) / Number(b));
    }

    // 6. Безпечне обчислення з підстановкою змінних scope
    try {
      const keys = Object.keys(scope);
      const values = Object.values(scope);
      
      let jsExpr = clean
        .replace(/==/g, '===')
        .replace(/!=/g, '!==')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');

      const funcContext = {
        int: (v) => parseInt(v, 10),
        float: (v) => parseFloat(v),
        str: (v) => String(v),
        len: (v) => (v ? v.length : 0),
        abs: (v) => Math.abs(v),
        round: (v) => Math.round(v)
      };

      const allKeys = [...keys, ...Object.keys(funcContext)];
      const allVals = [...values, ...Object.values(funcContext)];

      const fn = new Function(...allKeys, `return (${jsExpr});`);
      return fn(...allVals);
    } catch (e) {
      if (scope[clean] !== undefined) return scope[clean];
      if (!isNaN(Number(clean))) return Number(clean);
      return clean;
    }
  }
}

window.PythonEngine = PythonEngine;

// remindLiza: weekly planner with a tiny browser database based on localStorage.

const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const START_HOUR = 9;
const HOURS = 12;
const GRID_MIN = HOURS * 60;
const SNAP = 15;
const HOUR_PX = 58;
const DEFAULT_DUR = 60;
const STORAGE_KEY = 'remindLiza:v1';

const taskList = document.getElementById('taskList');
const form = document.getElementById('taskForm');
const input = document.getElementById('taskInput');
const calHead = document.getElementById('calHead');
const calGrid = document.getElementById('calGrid');
const timeGutter = document.getElementById('timeGutter');
const weekLabel = document.getElementById('weekLabel');
const dialog = document.getElementById('doneDialog');
const dialogTaskName = document.getElementById('dialogTaskName');
const resetBtn = document.getElementById('resetBtn');

let id = 0;
let taskToComplete = null;
const dayCols = [];

const DEFAULT_TASKS = [
  { id: 'task-1', text: 'Оплатить счета', type: 'backlog' },
  { id: 'task-2', text: 'Купить корм', type: 'backlog' },
  { id: 'task-3', text: 'Ответить на письмо', type: 'backlog' },
  { id: 'task-4', text: 'Созвон с дизайнером', type: 'event', day: 0, start: 120, dur: 60 },
  { id: 'task-5', text: 'Записаться к врачу', type: 'event', day: 2, start: 360, dur: 30 },
  { id: 'task-6', text: 'Планёрка', type: 'event', day: 3, start: 30, dur: 45 }
];

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: DEFAULT_TASKS };
    const db = JSON.parse(raw);
    if (!db || !Array.isArray(db.tasks)) return { tasks: DEFAULT_TASKS };
    return db;
  } catch (error) {
    console.warn('Cannot load local database, using defaults.', error);
    return { tasks: DEFAULT_TASKS };
  }
}

function saveDb() {
  const tasks = [...document.querySelectorAll('.task')].map(task => {
    const data = {
      id: task.dataset.id,
      text: task.querySelector('.text').textContent,
      type: task.classList.contains('event') ? 'event' : 'backlog'
    };

    if (data.type === 'event') {
      data.day = Number(task.parentElement.dataset.day);
      data.start = Number(task.dataset.start);
      data.dur = Number(task.dataset.dur || DEFAULT_DUR);
    }

    return data;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks }, null, 2));
}

function resetDb() {
  if (!confirm('Очистить сохранённые задачи и вернуть стартовый пример?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderTasks(loadDb().tasks);
}

const now = new Date();
const todayIdx = (now.getDay() + 6) % 7;
const monday = new Date(now);
monday.setDate(now.getDate() - todayIdx);

function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(x.getUTCFullYear(), 0, 4));
  const fd = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fd + 3);
  return 1 + Math.round((x - firstThu) / (7 * 86400000));
}

weekLabel.textContent = isoWeek(now) + ' нед.';

for (let h = START_HOUR; h <= START_HOUR + HOURS; h++) {
  const lbl = document.createElement('div');
  lbl.className = 'hr';
  lbl.style.top = minToPx((h - START_HOUR) * 60) + 'px';
  lbl.textContent = h + ':00';
  timeGutter.appendChild(lbl);
}

DAYS.forEach((dow, i) => {
  const date = new Date(monday);
  date.setDate(monday.getDate() + i);

  const head = document.createElement('div');
  head.className = 'day-head' + (i === todayIdx ? ' today' : '');
  head.innerHTML = `<span class="dow">${dow}</span><span class="dnum">${date.getDate()}</span>`;
  calHead.appendChild(head);

  const col = document.createElement('div');
  col.className = 'day-col' + (i === todayIdx ? ' today' : '');
  col.dataset.day = i;
  calGrid.appendChild(col);
  dayCols.push(col);
});

(function drawNow() {
  const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
  if (mins < 0 || mins > GRID_MIN) return;
  const top = minToPx(mins);

  const line = document.createElement('div');
  line.className = 'now-line';
  line.style.top = top + 'px';
  calGrid.appendChild(line);

  const strong = document.createElement('div');
  strong.className = 'now-strong';
  strong.style.top = top + 'px';
  dayCols[todayIdx].appendChild(strong);

  const t = document.createElement('div');
  t.className = 'now-time';
  t.style.top = top + 'px';
  t.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  timeGutter.appendChild(t);
})();

function pad(n) { return String(n).padStart(2, '0'); }
function snap(m) { return Math.round(m / SNAP) * SNAP; }
function minToPx(m) { return m / 60 * HOUR_PX; }
function pxToMin(px) { return snap(px / HOUR_PX * 60); }
function fmt(absMin) { return Math.floor(absMin / 60) + ':' + pad(absMin % 60); }

function syncId(taskId) {
  const numeric = Number(String(taskId).replace('task-', ''));
  if (Number.isFinite(numeric)) id = Math.max(id, numeric);
}

function nextId() {
  id += 1;
  return `task-${id}`;
}

function placeEvent(task) {
  const start = Number(task.dataset.start);
  const dur = Number(task.dataset.dur);
  task.style.top = minToPx(start) + 'px';
  task.style.height = minToPx(dur) + 'px';
  const base = START_HOUR * 60;
  task.querySelector('.when').textContent = fmt(base + start) + ' – ' + fmt(base + start + dur);
}

function becomeEvent(task) {
  task.classList.add('event');
  if (!task.dataset.dur) task.dataset.dur = DEFAULT_DUR;
}

function becomeTask(task) {
  task.classList.remove('event');
  task.style.top = '';
  task.style.height = '';
  task.dataset.start = '';
  task.dataset.dur = '';
}

function createTask(text, taskId = nextId()) {
  syncId(taskId);

  const task = document.createElement('div');
  task.className = 'task';
  task.dataset.id = taskId;
  task.innerHTML = `
    <button class="check" title="Завершить" type="button">✓</button>
    <span class="text"></span>
    <span class="when"></span>
    <span class="resize" title="Изменить длительность"></span>
  `;
  task.querySelector('.text').textContent = text;

  task.querySelector('.check').addEventListener('pointerdown', e => e.stopPropagation());
  task.querySelector('.check').addEventListener('click', e => {
    e.stopPropagation();
    taskToComplete = task;
    dialogTaskName.textContent = task.querySelector('.text').textContent;
    dialog.showModal();
  });

  task.addEventListener('pointerdown', e => startDrag(e, task));
  return task;
}

function renderTasks(tasks) {
  taskList.replaceChildren();
  dayCols.forEach(col => col.querySelectorAll('.task').forEach(task => task.remove()));
  id = 0;

  tasks.forEach(item => {
    const task = createTask(item.text, item.id);

    if (item.type === 'event') {
      becomeEvent(task);
      task.dataset.start = Number(item.start || 0);
      task.dataset.dur = Number(item.dur || DEFAULT_DUR);
      const day = Math.max(0, Math.min(6, Number(item.day || 0)));
      dayCols[day].appendChild(task);
      placeEvent(task);
    } else {
      taskList.appendChild(task);
    }
  });

  saveDb();
}

function dayColAt(x, y) {
  for (const col of dayCols) {
    const r = col.getBoundingClientRect();
    if (x >= r.left && x < r.right && y >= r.top - 40 && y <= r.bottom + 40) return col;
  }
  return null;
}

function overBacklog(x, y) {
  const r = taskList.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function startDrag(e, task) {
  if (e.button !== undefined && e.button !== 0) return;
  const isResize = e.target.classList.contains('resize');
  const startX = e.clientX;
  const startY = e.clientY;
  const wasEvent = task.classList.contains('event');
  const rect = task.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  let moved = false;

  function move(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    document.body.classList.add('dragging-active');
    task.classList.add('dragging');

    if (isResize && task.classList.contains('event')) {
      const col = task.parentElement;
      const topPx = parseFloat(task.style.top) || 0;
      let dur = pxToMin((ev.clientY - col.getBoundingClientRect().top) - topPx);
      dur = Math.max(SNAP, Math.min(GRID_MIN - Number(task.dataset.start), dur));
      task.dataset.dur = dur;
      placeEvent(task);
      saveDb();
      return;
    }

    const col = dayColAt(ev.clientX, ev.clientY);
    if (col) {
      if (!task.classList.contains('event')) becomeEvent(task);
      if (task.parentElement !== col) col.appendChild(task);
      const grab = wasEvent ? offsetY : 14;
      let start = pxToMin((ev.clientY - grab) - col.getBoundingClientRect().top);
      start = Math.max(0, Math.min(GRID_MIN - Number(task.dataset.dur), start));
      task.dataset.start = start;
      placeEvent(task);
      saveDb();
    } else if (overBacklog(ev.clientX, ev.clientY)) {
      if (task.classList.contains('event')) becomeTask(task);
      taskList.appendChild(task);
      saveDb();
    }
  }

  function up() {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.body.classList.remove('dragging-active');
    task.classList.remove('dragging');

    if (moved) saveDb();

    if (!moved && task.classList.contains('event')) {
      taskToComplete = task;
      dialogTaskName.textContent = task.querySelector('.text').textContent;
      dialog.showModal();
    }
  }

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  taskList.appendChild(createTask(text));
  input.value = '';
  input.focus();
  saveDb();
});

document.getElementById('yesBtn').addEventListener('click', () => {
  if (taskToComplete) taskToComplete.remove();
  taskToComplete = null;
  saveDb();
  dialog.close();
});

document.getElementById('noBtn').addEventListener('click', () => {
  taskToComplete = null;
  dialog.close();
});

resetBtn.addEventListener('click', resetDb);

renderTasks(loadDb().tasks);
document.querySelector('.cal-body').scrollTop = 0;

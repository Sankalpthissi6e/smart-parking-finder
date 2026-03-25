/**
 * app.js
 * Smart Parking Finder — UI logic, grid generation, animation
 */

// ── State ──────────────────────────────────────────────────────
let grid = [];          // 2D array: 0=free,1=occupied,2=vip,3=user
let gridSize = 10;
let userPos = null;     // { row, col }
let currentAlgo = 'bfs';
let animationFrames = []; // list of grid snapshots for step mode
let currentStep = 0;
let autoTimer = null;
let resultData = null;  // last search result

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  syncSliders();
  generateGrid();
});

function syncSliders() {
  const gs = document.getElementById('grid-size');
  const oc = document.getElementById('occupancy');
  const vp = document.getElementById('vip-count');

  gs.addEventListener('input', () => {
    document.getElementById('grid-size-val').textContent = `${gs.value}×${gs.value}`;
  });
  oc.addEventListener('input', () => {
    document.getElementById('occupancy-val').textContent = `${oc.value}%`;
  });
  vp.addEventListener('input', () => {
    document.getElementById('vip-val').textContent = `${vp.value} VIP`;
  });
}

// ── Algorithm toggle ──────────────────────────────────────────
function setAlgo(algo) {
  currentAlgo = algo;
  document.getElementById('btn-bfs').classList.toggle('active', algo === 'bfs');
  document.getElementById('btn-dijkstra').classList.toggle('active', algo === 'dijkstra');
  document.getElementById('algo-label').textContent = algo === 'bfs' ? 'BFS MODE' : 'DIJKSTRA MODE';
  // Re-run search if user already placed
  if (userPos) runSearch();
}

// ── Grid Generation ───────────────────────────────────────────
function generateGrid() {
  clearAutoPlay();
  userPos = null;
  resultData = null;
  animationFrames = [];
  currentStep = 0;

  gridSize = parseInt(document.getElementById('grid-size').value);
  const occupancyPct = parseInt(document.getElementById('occupancy').value) / 100;
  const vipCount = parseInt(document.getElementById('vip-count').value);

  const total = gridSize * gridSize;
  const occupiedCount = Math.floor(total * occupancyPct);

  // Create flat index pool
  const cells = Array.from({ length: total }, (_, i) => i);
  shuffle(cells);

  // Assign occupied
  const occupiedSet = new Set(cells.slice(0, occupiedCount));

  // Assign VIP from free cells
  const freeCells = cells.slice(occupiedCount);
  const vipSet = new Set(freeCells.slice(0, vipCount));

  grid = [];
  for (let r = 0; r < gridSize; r++) {
    grid[r] = [];
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      if (occupiedSet.has(idx))  grid[r][c] = 1;
      else if (vipSet.has(idx))  grid[r][c] = 2;
      else                        grid[r][c] = 0;
    }
  }

  updateFreeCount();
  renderGrid();
  resetResultPanel();
  document.getElementById('step-controls').style.display = 'none';
  document.getElementById('coords-display').textContent = 'SELECT START';
}

// ── Render Grid ───────────────────────────────────────────────
function renderGrid(overlay = null) {
  const container = document.getElementById('parking-grid');
  const parentW   = container.parentElement.offsetWidth - 32;
  const parentH   = container.parentElement.offsetHeight - 32;
  const cellPx    = Math.max(28, Math.min(56, Math.floor(Math.min(parentW, parentH) / gridSize) - 3));

  container.style.gridTemplateColumns = `repeat(${gridSize}, ${cellPx}px)`;
  container.innerHTML = '';

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.width  = `${cellPx}px`;
      cell.style.height = `${cellPx}px`;
      cell.dataset.row  = r;
      cell.dataset.col  = c;

      // Determine display class
      let cls = getCellClass(r, c, overlay);
      cell.classList.add(cls);

      cell.addEventListener('click', () => onCellClick(r, c));
      cell.addEventListener('mouseenter', () => {
        document.getElementById('coords-display').textContent = `[${r},${c}] — ${getCellLabel(r,c)}`;
      });

      container.appendChild(cell);
    }
  }
}

function getCellClass(r, c, overlay) {
  if (overlay) {
    if (overlay.target && overlay.target.row === r && overlay.target.col === c) return 'target';
    if (userPos && userPos.row === r && userPos.col === c) return 'user';
    if (overlay.path && overlay.path.some(([pr,pc]) => pr === r && pc === c)) return 'path';
    if (overlay.visited && overlay.visited.has(`${r},${c}`)) return 'visited';
  }
  if (userPos && userPos.row === r && userPos.col === c) return 'user';
  if (grid[r][c] === 1) return 'occupied';
  if (grid[r][c] === 2) return 'vip';
  return 'free';
}

function getCellLabel(r, c) {
  if (userPos && userPos.row === r && userPos.col === c) return 'YOUR POSITION';
  const t = grid[r][c];
  if (t === 1) return 'OCCUPIED';
  if (t === 2) return 'VIP FREE';
  return 'FREE';
}

// ── Cell Click ────────────────────────────────────────────────
function onCellClick(r, c) {
  if (grid[r][c] === 1) return; // can't start on occupied

  clearAutoPlay();
  userPos = { row: r, col: c };
  document.getElementById('coords-display').textContent = `START [${r},${c}]`;
  renderGrid();
  runSearch();
}

// ── Search ────────────────────────────────────────────────────
function runSearch() {
  if (!userPos) return;

  const result = currentAlgo === 'bfs'
    ? bfs(grid, userPos.row, userPos.col)
    : dijkstra(grid, userPos.row, userPos.col);

  resultData = result;
  buildAnimationFrames(result);
  showFinalResult(result);
  renderWithOverlay(animationFrames[animationFrames.length - 1]);
  updateStepControls();
}

function buildAnimationFrames(result) {
  animationFrames = [];
  currentStep = 0;

  const visitedSet = new Set();

  // Each step: show visited cells up to that point
  for (let i = 0; i < result.visitedSteps.length; i++) {
    const { row, col } = result.visitedSteps[i];
    visitedSet.add(`${row},${col}`);

    animationFrames.push({
      visited: new Set(visitedSet),
      path: null,
      target: null
    });
  }

  // Final frames: show path segments progressively
  if (result.path && result.path.length > 0) {
    for (let i = 1; i <= result.path.length; i++) {
      animationFrames.push({
        visited: new Set(visitedSet),
        path: result.path.slice(0, i),
        target: i === result.path.length ? result.target : null
      });
    }
  }
}

function renderWithOverlay(frame) {
  if (!frame) { renderGrid(); return; }
  renderGrid(frame);
}

// ── Step Controls ─────────────────────────────────────────────
function updateStepControls() {
  const ctrl = document.getElementById('step-controls');
  ctrl.style.display = animationFrames.length > 0 ? 'flex' : 'none';
  currentStep = animationFrames.length - 1;
  updateStepCounter();
}

function stepForward() {
  if (currentStep < animationFrames.length - 1) {
    currentStep++;
    renderWithOverlay(animationFrames[currentStep]);
    updateStepCounter();
  }
}

function stepBack() {
  if (currentStep > 0) {
    currentStep--;
    renderWithOverlay(animationFrames[currentStep]);
    updateStepCounter();
  }
}

function autoPlay() {
  clearAutoPlay();
  currentStep = 0;
  renderWithOverlay(animationFrames[0]);
  updateStepCounter();

  autoTimer = setInterval(() => {
    if (currentStep >= animationFrames.length - 1) {
      clearAutoPlay();
      return;
    }
    currentStep++;
    renderWithOverlay(animationFrames[currentStep]);
    updateStepCounter();
  }, 60);
}

function clearAutoPlay() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
}

function updateStepCounter() {
  document.getElementById('step-counter').textContent =
    `${currentStep + 1} / ${animationFrames.length}`;
}

// ── Result Panel ──────────────────────────────────────────────
function showFinalResult(result) {
  const out = document.getElementById('result-output');
  out.innerHTML = '';

  if (!result.target) {
    out.innerHTML = `<div class="no-path-msg">⚠ NO PATH FOUND<br/><small>All slots blocked or grid full</small></div>`;
    return;
  }

  const pathLen = result.path.length - 1; // hops
  const isVIP   = grid[result.target.row][result.target.col] === 2;
  const visitedCount = result.visitedSteps.length;

  const rows = [
    ['STATUS',     'PATH FOUND', 'success'],
    ['ALGORITHM',  currentAlgo.toUpperCase(), ''],
    ['START',      `[${userPos.row}, ${userPos.col}]`, ''],
    ['TARGET',     `[${result.target.row}, ${result.target.col}]`, isVIP ? 'warn' : 'success'],
    ['SLOT TYPE',  isVIP ? '★ VIP PRIORITY' : 'REGULAR', isVIP ? 'warn' : ''],
    ['HOPS',       `${pathLen}`, ''],
    ['NODES VISITED', `${visitedCount}`, ''],
    ...(result.totalCost !== undefined ? [['TOTAL COST', `${result.totalCost}`, '']] : []),
  ];

  rows.forEach(([key, val, cls]) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="log-key">${key}</span> <span class="log-val ${cls}">${val}</span>`;
    out.appendChild(div);
  });

  // Path trace
  const pathDiv = document.createElement('div');
  pathDiv.className = 'log-path';
  pathDiv.innerHTML = `PATH TRACE<br/>` +
    result.path.map(([r,c]) => `[${r},${c}]`).join(' → ');
  out.appendChild(pathDiv);
}

function resetResultPanel() {
  const out = document.getElementById('result-output');
  out.innerHTML = `<div class="result-idle"><div class="idle-icon">◎</div><div>Generate a map and<br/>click your position</div></div>`;
}

// ── Helpers ───────────────────────────────────────────────────
function updateFreeCount() {
  let free = 0;
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (grid[r][c] === 0 || grid[r][c] === 2) free++;
  document.getElementById('free-count').textContent = `${free} FREE SLOTS`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

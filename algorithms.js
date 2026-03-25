/**
 * algorithms.js
 * BFS and Dijkstra implementations for Smart Parking Finder
 * 
 * Grid Cell Types:
 *   0 = free (regular)
 *   1 = occupied
 *   2 = VIP slot (priority, weight = 0 in Dijkstra)
 *   3 = user start
 */

const DIRS = [
  [-1, 0, 'N'], [1, 0, 'S'], [0, -1, 'W'], [0, 1, 'E'],
  [-1,-1,'NW'], [-1, 1,'NE'], [1,-1,'SW'], [1, 1,'SE']
];

// ─────────────────────────────────────────────
// BFS — finds nearest free slot (unweighted)
// Returns: { path, visited, target, steps }
// ─────────────────────────────────────────────
function bfs(grid, startRow, startCol) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent  = Array.from({ length: rows }, () => Array(cols).fill(null));
  const steps   = []; // animation frames: list of {visited, path, target}

  const queue = [[startRow, startCol]];
  visited[startRow][startCol] = true;

  let targetRow = -1, targetCol = -1;

  while (queue.length > 0) {
    const [r, c] = queue.shift();

    steps.push({ type: 'visit', row: r, col: c });

    const cellType = grid[r][c];

    // Found a free or VIP slot (not the start)
    if ((cellType === 0 || cellType === 2) && !(r === startRow && c === startCol)) {
      targetRow = r;
      targetCol = c;
      break;
    }

    // Explore 4-directional neighbors (BFS = no diagonals by default)
    for (const [dr, dc] of DIRS.slice(0, 4)) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      if (grid[nr][nc] === 1) continue; // occupied = wall

      visited[nr][nc] = true;
      parent[nr][nc] = [r, c];
      queue.push([nr, nc]);
    }
  }

  if (targetRow === -1) return { path: [], visited: steps, target: null, steps };

  // Reconstruct path
  const path = reconstructPath(parent, targetRow, targetCol);
  return {
    path,
    visitedSteps: steps,
    target: { row: targetRow, col: targetCol }
  };
}

// ─────────────────────────────────────────────
// DIJKSTRA — weighted, VIP slots cost less
// Weights: free=10, VIP=1 (always prefer VIP)
// ─────────────────────────────────────────────
function dijkstra(grid, startRow, startCol) {
  const rows = grid.length;
  const cols = grid[0].length;

  const INF = Infinity;
  const dist   = Array.from({ length: rows }, () => Array(cols).fill(INF));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
  const steps  = [];

  dist[startRow][startCol] = 0;

  // Min-heap: [cost, row, col]
  const pq = new MinHeap();
  pq.push([0, startRow, startCol]);

  let targetRow = -1, targetCol = -1;
  let targetDist = INF;

  while (!pq.isEmpty()) {
    const [cost, r, c] = pq.pop();

    if (cost > dist[r][c]) continue; // stale entry

    steps.push({ type: 'visit', row: r, col: c, cost });

    const cellType = grid[r][c];

    if ((cellType === 0 || cellType === 2) && !(r === startRow && c === startCol)) {
      if (cost < targetDist) {
        targetDist = cost;
        targetRow = r;
        targetCol = c;
        // In Dijkstra we can stop early once we pop the target
        break;
      }
    }

    // 8-directional for Dijkstra (diagonal costs sqrt(2) ≈ 14 vs 10)
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 1) continue; // occupied

      const diagonal = dr !== 0 && dc !== 0;
      const moveCost = diagonal ? 14 : 10;

      // VIP destination bonus: arriving at VIP costs almost nothing extra
      const destCost = grid[nr][nc] === 2 ? 1 : moveCost;
      const newCost  = dist[r][c] + destCost;

      if (newCost < dist[nr][nc]) {
        dist[nr][nc] = newCost;
        parent[nr][nc] = [r, c];
        pq.push([newCost, nr, nc]);
      }
    }
  }

  if (targetRow === -1) return { path: [], visitedSteps: steps, target: null };

  const path = reconstructPath(parent, targetRow, targetCol);
  return {
    path,
    visitedSteps: steps,
    target: { row: targetRow, col: targetCol },
    totalCost: targetDist
  };
}

// ─────────────────────────────────────────────
// Reconstruct path from parent array
// ─────────────────────────────────────────────
function reconstructPath(parent, targetRow, targetCol) {
  const path = [];
  let cur = [targetRow, targetCol];
  while (cur !== null) {
    path.unshift(cur);
    cur = parent[cur[0]][cur[1]];
  }
  return path;
}

// ─────────────────────────────────────────────
// Minimal Binary Min-Heap for Dijkstra
// ─────────────────────────────────────────────
class MinHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty() { return this.heap.length === 0; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent][0] <= this.heap[i][0]) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
      if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

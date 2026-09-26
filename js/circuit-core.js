/* Continuous, resumable C4 circuit tracing. Coordinates are 4 x 4 board units. */
(function (root) {
  const SIZE = 4;
  const point = cell => ({ x: cell % SIZE + 0.5, y: Math.floor(cell / SIZE) + 0.5 });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function makeCircuitRoute(random = Math.random, level = 0) {
    const patterns = [
      [0, 1, 2, 3, 7, 11, 10, 9, 8, 12],
      [0, 4, 8, 9, 10, 11, 15],
      [0, 1, 2, 6, 10, 14, 15],
      [0, 4, 5, 6, 7, 11, 15],
    ];
    const pick = max => Math.min(max - 1, Math.max(0, Math.floor(random() * max)));
    const pool = level >= 2 ? [patterns[0], [0,4,8,12,13,14,10,6,7,11], [0,1,2,6,10,9,8,12,13,14,15]] : patterns;
    const route = pool[pick(pool.length)], turn = pick(4), mirror = pick(2);
    return Object.freeze(route.map(cell => {
      let x = cell % SIZE, y = Math.floor(cell / SIZE);
      if (mirror) x = SIZE - 1 - x;
      for (let i = 0; i < turn; i++) [x, y] = [SIZE - 1 - y, x];
      return y * SIZE + x;
    }));
  }
  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
  }
  class CircuitTrace {
    constructor(route = makeCircuitRoute()) {
      if (!Array.isArray(route) || route.length < 2 || new Set(route).size !== route.length ||
          route.some((cell, i) => !Number.isInteger(cell) || cell < 0 || cell >= 16 ||
            (i && Math.abs(cell % SIZE - route[i - 1] % SIZE) + Math.abs(Math.floor(cell / SIZE) - Math.floor(route[i - 1] / SIZE)) !== 1))) {
        throw new TypeError('Circuit route must contain distinct adjacent board cells.');
      }
      this.route = Object.freeze([...route]);
      this.index = 0;
      this.position = point(this.route[0]);
      this.complete = false;
    }
    get currentCell() { return this.route[this.index]; }
    get nextCell() { return this.route[this.index + 1] ?? null; }
    get progress() { return this.index / (this.route.length - 1); }
    canGrab(x, y) {
      return !this.complete && Number.isFinite(x) && Number.isFinite(y) &&
        distance(this.position, { x, y }) <= 0.65;
    }
    // Validate every part of the swept segment: a low frame rate cannot skip a wall.
    moveTo(x, y) {
      if (this.complete || !Number.isFinite(x) || !Number.isFinite(y)) return { moved: false, blocked: false, completed: false };
      const from = { ...this.position }, length = distance(from, { x, y });
      const steps = Math.max(1, Math.ceil(length / 0.04));
      let moved = false;
      for (let step = 1; step <= steps; step++) {
        const p = { x: from.x + (x - from.x) * step / steps, y: from.y + (y - from.y) * step / steps };
        const a = point(this.currentCell), b = point(this.nextCell);
        if (p.x < 0 || p.y < 0 || p.x > SIZE || p.y > SIZE || distanceToSegment(p, a, b) > 0.34) {
          return { moved, blocked: true, completed: false };
        }
        this.position = p;
        moved = true;
        if (distance(p, b) <= 0.18) {
          this.index++;
          if (this.index === this.route.length - 1) {
            this.complete = true;
            this.position = point(this.currentCell);
            return { moved: true, blocked: false, completed: true };
          }
        }
      }
      return { moved, blocked: false, completed: false };
    }
    // Deliberate adjacent-node taps and arrow keys are an accessible alternative.
    stepTo(cell) {
      if (this.complete || cell !== this.nextCell) return false;
      this.index++;
      this.position = point(cell);
      this.complete = this.index === this.route.length - 1;
      return true;
    }
  }
  const api = { makeCircuitRoute, CircuitTrace };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.Defuse || (root.Defuse = {}), api);
})(typeof window !== 'undefined' ? window : null);

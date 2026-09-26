Defuse.modules.circuit = {
  title: "电路寻路",
  english: "BRIDGE THE CIRCUIT",
  instruction: "拖动探针沿铜线走；碰边停住，松手可接着拖。",
  banter: "顺着走就行。这不是沙二中门，别硬穿。",
  mount(ctx) {
    const trace = new Defuse.CircuitTrace(ctx.round?.difficulty?.level ? Defuse.makeCircuitRoute(Math.random, ctx.round.difficulty.level) : undefined);
    const center = cell => [cell % 4 * 100 + 50, Math.floor(cell / 4) * 100 + 50];
    const path = trace.route.map((cell, i) => (i ? "L" : "M") + center(cell).join(" ")).join(" ");
    ctx.root.innerHTML = '<div class="circuit-unit"><div class="circuit-board"><div class="circuit-silkscreen" aria-hidden="true"><span>C4 / BYPASS</span><span>TP–04</span></div><i class="circuit-screw circuit-screw-tl" aria-hidden="true"></i><i class="circuit-screw circuit-screw-tr" aria-hidden="true"></i><i class="circuit-screw circuit-screw-bl" aria-hidden="true"></i><i class="circuit-screw circuit-screw-br" aria-hidden="true"></i><svg class="circuit-traces" viewBox="0 0 400 400" aria-hidden="true"><path class="circuit-channel-edge" d="' + path + '"/><path class="circuit-channel" d="' + path + '"/><path class="circuit-copper" d="' + path + '"/><path class="circuit-powered" d=""/><circle class="circuit-terminal-node" cx="' + center(trace.route.at(-1))[0] + '" cy="' + center(trace.route.at(-1))[1] + '" r="21"/><circle class="circuit-terminal-core" cx="' + center(trace.route.at(-1))[0] + '" cy="' + center(trace.route.at(-1))[1] + '" r="7"/><circle class="circuit-probe-ring" r="29"/><circle class="circuit-probe" r="13"/></svg><div class="circuit-cells" role="group" aria-label="四乘四电路板；可拖动探针、点击下一格或用方向键移动">' + Array.from({ length: 16 }, (_, cell) => {
      const start = cell === trace.currentCell, end = cell === trace.route.at(-1), onRoute = trace.route.includes(cell);
      const component = cell % 3 === 0 ? 'chip' : cell % 3 === 1 ? 'resistor' : 'insulator';
      return '<button type="button" class="circuit-cell' + (onRoute ? ' is-route' : ' is-wall') + (start ? ' is-start' : end ? ' is-end' : '') + '" data-circuit-cell="' + cell + '" tabindex="' + (start ? 0 : -1) + '" aria-label="' + (Math.floor(cell / 4) + 1) + '行' + (cell % 4 + 1) + '列，' + (start ? '探针起点' : end ? '电路出口' : onRoute ? '线路节点' : '断路区域') + '">' + (start || end ? '<span class="circuit-terminal"><i></i><em>' + (start ? '入 / IN' : '出 / OUT') + '</em></span>' : onRoute ? '<i class="circuit-via"></i>' : '<b class="circuit-component circuit-component-' + component + '" aria-hidden="true"></b>') + '</button>';
    }).join('') + '</div></div><p class="circuit-status" aria-live="polite"><span>沿铜线推探针 · 松手可续</span><b data-circuit-progress>0%</b></p></div>';
    const board = ctx.root.querySelector('.circuit-board'), cells = ctx.root.querySelector('.circuit-cells');
    const buttons = [...cells.children], status = ctx.root.querySelector('.circuit-status span');
    const meter = ctx.root.querySelector('[data-circuit-progress]');
    const probe = ctx.root.querySelector('.circuit-probe'), ring = ctx.root.querySelector('.circuit-probe-ring');
    const powered = ctx.root.querySelector('.circuit-powered');
    let pointer = null, dragging = false, candidate = null, anchor = null, offset = null, completed = false;
    const ready = () => !completed && !document.hidden && ctx.active() && ctx.canSee(cells);
    function draw() {
      for (const node of [probe, ring]) {
        node.setAttribute('cx', trace.position.x * 100);
        node.setAttribute('cy', trace.position.y * 100);
      }
      powered.setAttribute('d', trace.route.slice(0, trace.index + 1).map((cell, i) => (i ? 'L' : 'M') + center(cell).join(' ')).join(' ') + ' L' + trace.position.x * 100 + ' ' + trace.position.y * 100);
      buttons.forEach((button, cell) => {
        button.classList.toggle('is-current', cell === trace.currentCell);
        button.classList.toggle('is-done', trace.route.indexOf(cell) >= 0 && trace.route.indexOf(cell) <= trace.index);
        button.tabIndex = cell === trace.currentCell ? 0 : -1;
        if (cell === trace.currentCell) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      meter.textContent = Math.round(trace.progress * 100) + '%';
    }
    function stop() {
      const held = pointer;
      pointer = null; dragging = false; candidate = null; anchor = null;
      board.classList.remove('is-dragging');
      if (held !== null && board.hasPointerCapture?.(held)) board.releasePointerCapture(held);
    }
    function finish() {
      if (!trace.complete || !ready()) return;
      completed = true;
      stop();
      board.classList.add('is-complete');
      status.textContent = '线路接通，接着拆！';
      ctx.complete('通了！线路接通，继续拆包。');
    }
    function feedback(blocked) {
      board.classList.toggle('is-blocked', blocked);
      status.textContent = blocked ? '碰到绝缘层 · 沿铜线转弯' : '线路接通 ' + trace.index + ' / ' + (trace.route.length - 1) + ' · 松手可续';
      ctx.action('正在接通检修线路', trace.progress * 100);
      draw();
      finish();
    }
    function boardPoint(event) {
      const r = board.getBoundingClientRect();
      return { x: (event.clientX - r.left) / r.width * 4, y: (event.clientY - r.top) / r.height * 4 };
    }
    ctx.listen(board, 'pointerdown', event => {
      if (pointer !== null || !event.isPrimary || event.button !== 0 || !ready()) return;
      const point = boardPoint(event), cell = event.target.closest('[data-circuit-cell]');
      candidate = cell ? Number(cell.dataset.circuitCell) : null;
      dragging = trace.canGrab(point.x, point.y);
      if (!dragging && candidate !== trace.nextCell) { candidate = null; return; }
      event.preventDefault();
      pointer = event.pointerId; anchor = { x: event.clientX, y: event.clientY };
      offset = { x: trace.position.x - point.x, y: trace.position.y - point.y };
      board.setPointerCapture?.(pointer);
      board.classList.toggle('is-dragging', dragging);
      board.classList.remove('is-blocked');
      if (dragging) ctx.action('正在沿亮线移动探针', trace.progress * 100);
    });
    ctx.listen(board, 'pointermove', event => {
      if (event.pointerId !== pointer) return;
      if (!ready()) { stop(); return; }
      if (Math.hypot(event.clientX - anchor.x, event.clientY - anchor.y) > 7) candidate = null;
      if (!dragging) return;
      event.preventDefault();
      const point = boardPoint(event), oldIndex = trace.index;
      const result = trace.moveTo(point.x + offset.x, point.y + offset.y);
      if (trace.index !== oldIndex) ctx.sound('tap', { volume: 0.16 });
      feedback(result.blocked);
    });
    ctx.listen(board, 'pointerup', event => {
      if (event.pointerId !== pointer) return;
      if (ready() && candidate === trace.nextCell && trace.stepTo(candidate)) {
        ctx.sound('tap', { volume: 0.16 });
        feedback(false);
      }
      stop();
    });
    ctx.listen(board, 'pointercancel', stop);
    ctx.listen(board, 'lostpointercapture', stop);
    // Keyboard activation dispatches click without a pointing-device gesture.
    ctx.listen(cells, 'click', event => {
      if (event.detail !== 0 || !ready()) return;
      const cell = event.target.closest('[data-circuit-cell]');
      if (cell && trace.stepTo(Number(cell.dataset.circuitCell))) feedback(false);
    });
    ctx.listen(cells, 'keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (!ready()) return;
      const cell = trace.currentCell, dx = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
      const x = cell % 4 + dx, y = Math.floor(cell / 4) + dy;
      if (x >= 0 && x < 4 && y >= 0 && y < 4 && trace.stepTo(y * 4 + x)) {
        ctx.sound('tap', { volume: 0.16 }); feedback(false);
        if (!completed) buttons[trace.currentCell].focus({ preventScroll: true });
      }
    });
    for (const type of ['defuse-threat-start', 'defuse-orientation-block']) ctx.listen(document, type, stop);
    ctx.listen(window, 'blur', stop);
    ctx.listen(document, 'visibilitychange', () => { if (document.hidden) stop(); });
    ctx.frame(() => { if (pointer !== null && !ready()) stop(); });
    ctx.action('沿亮线接通电路');
    draw();
  },
};

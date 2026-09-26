Defuse.modules.smoke = {
  title: "封烟强拆",
  english: "NO VISION. NO PROBLEM.",
  instruction: "先记住亮格，起烟后点回同一位置。",
  banter: "烟给包上。先记包位，等烟起了再拆。",
  mount(ctx) {
    const count = ctx.round.difficulty?.smokeTargets || 1;
    const preview = ctx.round.difficulty?.smokePreview || 1500;
    const order = Defuse.shuffle(Array.from({length:9},(_,i)=>i)).slice(0,count);
    const target = order[0];
    const marks = ['①','②','③'], sequence = marks.slice(0,count).join(' → ');
    let matched = 0;
    let covered = false;
    ctx.root.innerHTML = `<div class="smoke-unit"><div class="smoke-status"><span class="led"></span><b id="smoke-prompt">记住黄色目标 · 1.5 秒</b></div><div class="smoke-field"><div class="smoke-grid">${Array.from({ length: 9 }, (_, i) => `<button class="smoke-cell ${i === target ? "target-cell" : ""}" data-cell="${i}" aria-label="位置 ${Math.floor(i / 3) + 1} 行 ${(i % 3) + 1} 列" disabled>${i === target ? Defuse.icon("target") : "<span>+</span>"}</button>`).join("")}</div><div class="smoke-cloud" aria-hidden="true"></div><span class="site-mark" aria-hidden="true">B</span></div><p class="instruction-tag" id="smoke-note">先看清，起烟后才能操作。</p></div>`;
    if (Defuse.assets.smoke)
      ctx.root
        .querySelector(".smoke-cloud")
        .append(Defuse.assetImage(Defuse.assets.smoke, "smoke-texture"));
    const grid = ctx.root.querySelector(".smoke-grid");
    ctx.root.querySelector('#smoke-prompt').textContent = count > 1 ? `记住 ${sequence} · ${preview / 1000} 秒` : `记住黄色目标 · ${preview / 1000} 秒`;
    for (const [i, id] of order.entries()) {
      const cell = grid.children[id]; cell.classList.add('target-cell');
      if (count > 1) cell.textContent = marks[i];
    }
    let revealTime = 0, lastFrame = performance.now();
    ctx.frame((now) => {
      const delta = Math.min(100, Math.max(0, now - lastFrame));
      lastFrame = now;
      if (covered) return;
      if (!ctx.active() || !ctx.canSee(grid)) {
        // An off-screen grid or a flash is not a fair memory preview.
        // The bomb keeps ticking, but the next clear look gets the full 1.5s.
        revealTime = 0;
        return;
      }
      revealTime += delta;
      if (revealTime < preview) return;
      covered = true;
      ctx.action("烟中定位 · 凭记忆点击");
      ctx.sound("smoke");
      ctx.root.querySelector(".smoke-field").classList.add("covered");
      ctx.root.querySelectorAll(".smoke-cell").forEach((el) => {
        el.disabled = false;
        el.innerHTML = "<span>+</span>";
        el.classList.remove("target-cell");
      });
      ctx.root.querySelector("#smoke-prompt").textContent =
        count > 1 ? `视野受阻 · 按 ${sequence} 顺序点击` : "视野受阻 · 按记忆点击";
      ctx.root.querySelector("#smoke-note").textContent =
        count > 1 ? `按刚才的 ${sequence} 顺序点。` : "烟里也得拆。点回刚才的黄色位置。";
      ctx.banter(count > 1 ? "烟起来了！按刚才的顺序，一个一个点。" : Defuse.supportComms?.("smokeCovered", ctx.round) || Defuse.coconutLine("smokeCovered"), Defuse.supportId?.(ctx.round) || "coconut");
    });
    ctx.listen(ctx.root, "click", (e) => {
      const cell = e.target.closest("[data-cell]");
      if (!cell || cell.disabled || !covered || !ctx.active()) return;
      if (Number(cell.dataset.cell) === order[matched]) {
        cell.classList.remove("incorrect");
        cell.classList.add("target-cell");
        cell.disabled = true;
        matched++;
        if (matched < count) {
          cell.textContent = '✓';
          ctx.root.querySelector('#smoke-note').textContent = `${marks[matched-1]} 找到了，接着点 ${marks[matched]}。`;
          ctx.sound('tap'); return;
        }
        ctx.root.querySelector(".smoke-field").classList.remove("covered");
        ctx.complete("Nice，烟里真给你摸到了。");
      } else {
        cell.classList.add("incorrect");
        // A future sequence cell clicked too early must remain available.
        cell.disabled = !order.slice(matched).includes(Number(cell.dataset.cell));
        const cleared = Array.isArray(ctx.round.enemyGuardIds) && ctx.round.enemyGuardIds.every(id => ctx.round.defeatedEnemyIds.includes(id));
        ctx.error(cleared ? "敌人清完了，别慌。包不在这格，记住的位置再找。" : "摸错了，包不在那。想想刚才的亮格。", { cause: "smoke-position" });
      }
    });
  },
};

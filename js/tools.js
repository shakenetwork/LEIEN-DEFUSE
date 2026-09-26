Defuse.modules.tools = {
  title: "谁有钳谁拆",
  english: "EQUIPMENT CHECK",
  instruction: "找到真正的拆弹钳，点它。",
  banter: "有钳没？钳给你了，先捡钳再拆。",
  mount(ctx) {
    const advanced = (ctx.round?.difficulty?.level || 0) > 0;
    const tools = Defuse.shuffle([
      { id: "pliers", label: "拆弹钳" },
      { id: "wrench", label: "扳手" },
      { id: "screwdriver", label: "螺丝刀" },
      advanced ? { id: "broken", label: "断口钳", icon: "pliers" } : { id: "rice", label: "电饭锅" },
      { id: "mouse", label: "电竞鼠标" },
      { id: "knife", label: "小刀" },
    ]);
    ctx.root.innerHTML = `<div class="tools-unit"><div class="inventory-heading"><span>队友丢下的装备</span><span>6 ITEMS</span></div><div class="tools-grid">${tools.map((t, i) => `<button class="tool-card" data-tool="${t.id}" aria-label="选择${t.label}"><small>0${i + 1}</small><span class="tool-graphic">${Defuse.icon(t.icon || t.id)}</span><b>${t.label}</b></button>`).join("")}</div><p class="instruction-tag">${advanced ? "找完好的拆弹钳 · 别拿断口钳" : "拆弹钳已混入背包 · 别拿错了"}</p></div>`;
    for (const t of tools)
      if (Defuse.assets.tools[t.id]) {
        const slot = ctx.root.querySelector(
            `[data-tool="${t.id}"] .tool-graphic`,
          ),
          img = Defuse.assetImage(Defuse.assets.tools[t.id], "tool-image");
        img.onload = () => slot.classList.add("has-image");
        slot.append(img);
      }
    let solved = false;
    function choose(card) {
      if (solved || document.hidden || !card || card.disabled || !ctx.active()) return;
      const id = card.dataset.tool;
      ctx.sound("tap");
      if (id === "pliers") {
        solved = true;
        card.classList.add("correct");
        ctx.complete("对，就是这把钳。接着拆，来枪别硬顶。");
      } else {
        card.classList.add("incorrect");
        card.disabled = true;
        ctx.error(
          id === "rice"
            ? "你拿电饭锅来拆弹？准备开席吗？"
            : "这玩意像能拆包的吗？工具识别有待提高。",
        );
      }
    }
    // Commit on a matching press/release; mobile browsers may omit a compatibility click after dragging.
    // A drag away, cancellation, second finger or interrupted module never selects equipment.
    let press = null;
    const clearPress = () => { press = null; };
    ctx.listen(ctx.root, "pointerdown", (e) => {
      if (press || !e.isPrimary || e.button !== 0 || !ctx.active()) return;
      const card = e.target.closest("[data-tool]");
      if (!card || card.disabled) return;
      press = { id: e.pointerId, card, x: e.clientX, y: e.clientY };
    });
    ctx.listen(window, "pointermove", (e) => {
      if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) clearPress();
    });
    ctx.listen(window, "pointerup", (e) => {
      if (!press || press.id !== e.pointerId) return;
      const held = press;
      clearPress();
      const card = e.target.closest?.("[data-tool]");
      if (card !== held.card || Math.hypot(e.clientX - held.x, e.clientY - held.y) > 14) return;
      e.preventDefault();
      choose(card);
    });
    ctx.listen(window, "pointercancel", clearPress);
    ctx.listen(window, "blur", clearPress);
    ctx.listen(document, "visibilitychange", () => { if (document.hidden) clearPress(); });
    for (const type of ["defuse-threat-start", "defuse-orientation-block"]) ctx.listen(document, type, clearPress);
    ctx.listen(ctx.root, "click", (e) => {
      if (e.detail > 0) { e.preventDefault(); return; }
      choose(e.target.closest("[data-tool]"));
    });
  },
};

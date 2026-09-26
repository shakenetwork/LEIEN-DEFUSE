Defuse.modules.wires = {
  title: "剪线抉择",
  english: "CUT THE WIRE",
  instruction: "先看设备状态，再按黄色规则剪线。",
  banter: "B 洞我架着。你按黄字剪，别听他乱报。",
  mount(ctx) {
    const colors = [
        { id: "red", name: "红", color: "#da6253" },
        { id: "blue", name: "蓝", color: "#5795c2" },
        { id: "yellow", name: "黄", color: "#dfbc56" },
        { id: "green", name: "绿", color: "#75a686" },
      ],
      rule = ctx.wireRule || (ctx.round.wireRule ||= Defuse.makeWireRule(Math.random, { advanced: true, level: ctx.round.difficulty?.level || 0 })),
      answer = colors.find((c) => c.id === rule.answer);
    if (!ctx.wireRule) {
      const order = ctx.round.wireOrder ||= Defuse.shuffle(colors.map(c => c.id));
      colors.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    ctx.root.innerHTML = `<div class="wire-unit"><div class="instruction-tag">检修标签：剪断 <strong>${answer.name}色</strong> 线路</div><p class="module-aside">别信那个 2-14 的。认准上面的标签。</p><div class="wire-bank">${colors.map((c, i) => `<button class="wire" data-wire="${c.id}" aria-label="剪断${c.name}色电线" style="--wire:${c.color}"><span class="wire-terminal">0${i + 1}</span><span class="wire-span"><i></i><i></i><b>✂</b></span><span class="wire-name">${c.name}</span></button>`).join("")}</div><div class="wire-legend"><span>4 CHANNELS</span><span>SELECT ONE TO CUT</span></div></div>`;
    ctx.listen(ctx.root, "click", (e) => {
      const wire = e.target.closest("[data-wire]");
      if (!wire || wire.disabled || !ctx.active()) return;
      wire.classList.add("cut");
      wire.disabled = true;
      ctx.sound("tap");
      if (wire.dataset.wire === answer.id) {
        wire.classList.add("correct");
        ctx.complete("线剪对了。接着拆，留神道具。");
      } else {
        wire.classList.add("incorrect");
        ctx.error("别听他瞎报，按黄色规则来！");
      }
    });
    ctx.root.querySelector(".instruction-tag").textContent = rule.text;
    const status = ctx.root.querySelector(".module-aside");
    status.classList.add("wire-status");
    status.dataset.kind = rule.type;
    if (rule.type === "light") {
      status.dataset.lit = String(rule.value);
      status.innerHTML = `<span class="signal-housing" aria-hidden="true"><i class="signal-lens"></i></span><span class="signal-copy"><small>红色指示灯</small><strong>${rule.value ? "亮" : "灭"}</strong></span><span class="signal-state" aria-hidden="true">${rule.value ? "● ON" : "○ OFF"}</span>`;
      status.setAttribute("aria-label", rule.label);
    } else if (rule.type === "dual") {
      status.dataset.lit = String(rule.lit);
      status.innerHTML = `<span class="signal-housing" aria-hidden="true"><i class="signal-lens"></i></span><span class="signal-copy"><small>红灯${rule.lit ? "亮" : "灭"}</small><strong class="serial-number">LE-${7350 + rule.value}</strong></span>`;
      status.setAttribute("aria-label", rule.label);
    } else {
      status.innerHTML = `<span class="serial-label">设备序列号</span><strong class="serial-number">LE-${7350 + rule.value}</strong>`;
    }
  },
};

/* Homepage presentation is independent of the shuffled round roster. */
Defuse.enemyPortrait = (id) => `<img class="agent-portrait" src="${Defuse.enemyImage(id)}" alt="${Defuse.escapeHtml(Defuse.cast[id].name)}的手绘形象" width="960" height="960" draggable="false">`;
Defuse.enemyShowcase = {
  markup() {
    return (Defuse.enemyShowcaseIds || Defuse.enemyIds).map((id, index) => {
      const member = Defuse.cast[id], profile = Defuse.enemyProfiles[id];
      return `<div class="enemy-slide ${index === 0 ? "is-active" : ""}" data-enemy="${id}" role="group" aria-label="${Defuse.escapeHtml(member.name)}" aria-hidden="${index !== 0}"><div class="hero-agent">${Defuse.enemyPortrait(id)}</div><div class="scene-tag"><span class="agent-name">${Defuse.escapeHtml(member.name)}<small>${Defuse.escapeHtml(profile.homeRole)}</small></span><b>「${Defuse.escapeHtml(profile.homeLine)}」</b></div></div>`;
    }).join("") + `<div class="enemy-pagination" aria-hidden="true">${(Defuse.enemyShowcaseIds || Defuse.enemyIds).map((id, index) => `<i data-enemy-dot="${id}" class="${index === 0 ? "is-active" : ""}"></i>`).join("")}</div>`;
  },
  picker() {
    return '<div class="enemy-picker" role="group" aria-label="查看敌方探员">' + (Defuse.enemyShowcaseIds || Defuse.enemyIds).map((id, i) => `<button type="button" data-enemy-pick="${id}" aria-label="查看${Defuse.escapeHtml(Defuse.cast[id].name)}" aria-pressed="${i === 0}">${Defuse.enemyPortrait(id)}</button>`).join('') + `</div><div class="enemy-pager" role="group" aria-label="切换敌方探员"><button type="button" data-enemy-step="-1" aria-label="上一位探员">‹</button><span data-enemy-position>01 / ${String((Defuse.enemyShowcaseIds || Defuse.enemyIds).length).padStart(2, "0")}</span><button type="button" data-enemy-step="1" aria-label="下一位探员">›</button></div>`;
  },
  mount(root) {
    const scene = root.querySelector("[data-enemy-showcase]");
    if (!scene) return { dispose() {} };
    const slides = [...scene.querySelectorAll(".enemy-slide")];
    const dots = [...scene.querySelectorAll("[data-enemy-dot]")];
    const picks = [...root.querySelectorAll("[data-enemy-pick]")];
    const button = root.querySelector("[data-enemy-pause]");
    const controller = new AbortController(), signal = controller.signal;
    let index = 0, timer = 0, disposed = false, paused = false, inView = true;
    const show = (next) => {
      index = next;
      slides.forEach((slide, i) => {
        slide.classList.toggle("is-active", i === index);
        slide.setAttribute("aria-hidden", String(i !== index));
        dots[i].classList.toggle("is-active", i === index);
        picks[i]?.setAttribute("aria-pressed", String(i === index));
      });
      scene.dataset.currentEnemy = slides[index].dataset.enemy;
      const position = root.querySelector("[data-enemy-position]");
      if (position) {
        position.textContent = String(index + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
        position.setAttribute("aria-label", "第" + (index + 1) + "位，共" + slides.length + "位：" + Defuse.cast[slides[index].dataset.enemy].name);
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      if (disposed || paused || document.hidden || !inView || document.querySelector("#instructions")?.open) return;
      timer = setTimeout(() => {
        if (disposed || !scene.isConnected) return;
        const next = (index + 1) % slides.length;
        const image = slides[next].querySelector("img");
        // Retain the previous card if the next local image has not decoded.
        if (!image.complete || !image.naturalWidth) { schedule(); return; }
        show(next);
        schedule();
      }, 4800);
    };
    show(0);
    picks.forEach((pick, i) => pick.addEventListener("click", () => { show(i); schedule(); }, { signal }));
    root.querySelectorAll("[data-enemy-step]").forEach(step => step.addEventListener("click", () => {
      show((index + Number(step.dataset.enemyStep) + slides.length) % slides.length);
      schedule();
    }, { signal }));
    button.addEventListener("click", () => {
      paused = !paused;
      button.setAttribute("aria-pressed", String(paused));
      button.setAttribute("aria-label", paused ? "继续自动轮换探员" : "暂停自动轮换探员");
      button.title = paused ? "继续轮换" : "暂停轮换";
      button.querySelector("span").textContent = "";
      schedule();
    }, { signal });
    document.addEventListener("visibilitychange", schedule, { signal });
    root.querySelector(".show-training")?.addEventListener("click", () => clearTimeout(timer), { signal });
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      schedule();
    });
    observer.observe(scene);
    schedule();
    return {
      dispose() { disposed = true; clearTimeout(timer); controller.abort(); observer.disconnect(); },
    };
  },
};

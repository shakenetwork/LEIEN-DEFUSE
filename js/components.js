Defuse.icons = {
  sound:
    '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 6 6m0-6-6 6"/>',
  pliers:
    '<path d="m8 3 4 7 4-7 2 5-5 6 5 8-3 1-4-7-4 7-3-1 5-8-5-6 2-5Z"/><circle cx="11" cy="12" r="1"/>',
  wrench:
    '<path d="m15 3-4 4 2 4 4 1 4-4c2 6-3 10-8 8l-7 7-4-4 7-7C7 6 10 2 15 3Z"/>',
  screwdriver: '<path d="m18 2 4 4-3 4-3-1-7 7m-3-3 5 5-7 5-3-3 5-7Z"/>',
  rice: '<path d="M4 9h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9Zm-1 0h18M7 5h10l3 4M10 3h4M3 13H1m22 0h-2"/><circle cx="12" cy="16" r="2"/>',
  mouse:
    '<rect x="5" y="2" width="14" height="21" rx="7"/><path d="M12 2v8M5 10h14"/>',
  knife: '<path d="M21 2c0 7-4 12-10 14l-3-3L21 2ZM8 13l-6 6 3 3 6-6"/>',
  shield:
    '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m7 12 3 3 7-7"/>',
  cross: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrowUpRight: '<path d="M6 18 18 6M6 6h12v12"/>',
  arrowDownRight: '<path d="m6 6 12 12M6 18h12V6"/>',
  arrowRight: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  turnBack: '<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  deleteBack: '<path d="M9 5h12v14H9l-7-7 7-7Zm3 4 6 6m0-6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',
};
Defuse.icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${Defuse.icons[name] || ""}</svg>`;
Defuse.killWeapon = (weapon) => `<svg class="kill-weapon-icon" viewBox="0 0 80 24" aria-hidden="true"><path d="M2 8h14l5-4h25v3h28v3H48v4H36l-5 8-7-2 2-7h-7l-3 4H4l4-6H2z"/></svg><span>${Defuse.escapeHtml(weapon)}</span> <i class="kill-marker" aria-hidden="true">⌖</i>`;
Defuse.device = () =>
  `<div class="device-art" aria-label="带数字屏、电线和按键的玩具 C4 装置" role="img"><div class="charge-pack"><span></span><span></span><span></span><span></span></div><div class="pack-band band-top"></div><div class="pack-band band-bottom"></div><svg class="cables" viewBox="0 0 360 330" fill="none" aria-hidden="true"><path d="M75 60C8 30 17 160 76 129S147 74 224 109 337 29 293 54L268 90" stroke="#a9a491"/><path d="M86 55C45 10 41 23 58 106S162 132 227 95 329 30 288 167" stroke="#b94c39"/><path d="M122 70C138 9 301 6 307 57S213 85 265 147" stroke="#c7a841"/></svg><div class="c4-unit"><span class="screw s1"></span><span class="screw s2"></span><span class="screw s3"></span><span class="screw s4"></span><div class="unit-top"><span>C4 / FIELD UNIT</span><span class="led"></span></div><div class="lcd"><small>ARMED <span>●</span></small><b>00:40<span>.00</span></b><div>LOCKED <span>STANDBY</span></div></div><div class="unit-bottom"><div class="fake-keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((n) => `<span>${n}</span>`).join("")}</div><div class="battery"><span>+</span><b>LEIEN</b><small>9V</small><span>−</span></div></div><div class="unit-sticker">⚠ DO NOT PANIC <span>（尽量）</span></div></div><span class="pack-label">PROPERTY OF CT<br>HANDLE WITH DOUBT</span></div>`;
Defuse.applyAssets = (root = document) => {
  if (Defuse.assets.bomb)
    root.querySelectorAll(".device-art").forEach((el) => {
      const img = Defuse.assetImage(Defuse.assets.bomb, "replacement-bomb");
      img.onload = () => el.classList.add("has-replacement");
      el.append(img);
    });
};

/* Player identity is separate from the product's LEIEN / DEFUSE brand. */
Defuse.player = { name: "回防队员", specialty: "补枪手", image: "assets/factions/ct.svg" };
// Profile names are untrusted text, including in template-generated markup.
Defuse.escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
Defuse.playerName = () => `<b data-player-name>${Defuse.escapeHtml(Defuse.player.name)}</b>`;
Defuse.playerImage = (className = "") => `<img data-player-avatar class="${className}" src="${Defuse.escapeHtml(Defuse.player.image)}" alt="${Defuse.escapeHtml(Defuse.player.name)}的头像" referrerpolicy="no-referrer" draggable="false">`;
Defuse.playerAddress = () => ["你", "回防队员"].includes(Defuse.player.name) ? "兄弟" : Defuse.player.name;
Defuse.personalize = (text) => String(text).replaceAll("{player}", Defuse.playerAddress());
// Four on-site NPCs plus the independent visitor make the five-player squad.
Defuse.teamIds = ["lead", "goggles", "rookie", "coconut"];
Defuse.matchPlan = { mode: "fake" };
Defuse.rollMatchPlan = () => {
  const roll = Math.random();
  Defuse.matchPlan =
    roll < 0.5
      ? {
          mode: "rush",
          label: "RUSH / 强上 B",
          plant: "给闪！一波进 B，别堵洞口！包下了就退，架他回防。",
          handoff: "只剩你和椰子C了。接着拆，来枪先躲；他只能救你一次。",
          scene: "包下了，别一个一个送。等他来拆。",
          ctDown: true,
          coconutDown: false,
        }
      : {
            mode: "fake",
            label: "FAKE / 假打转点",
            plant: "A 点给点动静，包跟我转 B。静步，别让他听见！",
          handoff: "下包的倒了，你接手拆。雷恩先别指挥，有情况我报。",
          scene: "他们往 A 回了。走，B 点下包！",
          ctDown: false,
          coconutDown: false,
          };
  return Defuse.matchPlan;
};
Defuse.planLabel = () => Defuse.matchPlan?.label || "FAKE / 假打转点";
Defuse.cast = {
  planter: {
    name: "克拉斯沃特",
    specialty: "突破手",
    role: "T / 突破手",
    image: "assets/agents/planter-display.webp",
    line: "B 包下了。退回洞里，等他来拆，别送。",
  },
  opponent: {
    name: "精英穆哈里克先生",
    specialty: "指挥",
    role: "T / 指挥",
    image: "assets/agents/elite-muharik-display.webp",
    line: "敢摸包？我就等你这一下。",
  },
  rebel: {
    name: "地面叛军",
    specialty: "道具手",
    role: "T / 道具手",
    image: "assets/agents/ground-rebel-display.webp",
    line: "你倒了我补。别让他把包拆了。",
  },
  sallie: {
    name: "出逃的萨莉",
    specialty: "自由人",
    role: "T / 自由人",
    image: "assets/agents/sallie-display.webp",
    line: "别盯着包，我从侧面绕。听到脚步再开枪。",
  },
  daryl: {
    name: "残酷的达里尔爵士",
    specialty: "补枪手",
    role: "T / 补枪手",
    image: "assets/agents/daryl-display.webp",
    line: "我留颗闪。听他拆了再拉。",
  },
  solman: {
    name: "精锐捕兽者索尔曼", specialty: "自由人", role: "T / 自由人",
    image: "assets/agents/solman-display.webp", line: "包在那儿。你急，我不急。",
  },
  vypa: {
    name: "薇帕姐", specialty: "突破手", role: "T / 突破手",
    image: "assets/agents/vypa-display.webp", line: "跟紧我！进点再散，别挤成一排。",
  },
  ricksaw: {
    name: "海军上尉里克索尔", specialty: "王牌步枪手", role: "CT / 回防核心",
    image: "assets/agents/ricksaw-display.webp", line: "你先缩着，我来清。清完你拆。",
  },
  romanov: {
    name: "罗曼诺夫", specialty: "核心步枪手", role: "T / 核心补枪",
    image: "assets/agents/romanov-display.webp", line: "你们给闪。剩下的，我来。",
  },
  goggles: {
    name: "马尔库斯·戴劳",
    specialty: "道具手",
    role: "CT / 道具手",
    image: "assets/agents/goggles.webp",
    line: "狗洞我看着。你有钳，你拆。",
  },
  lead: {
    name: "CSGO雷恩",
    specialty: "指挥",
    nickname: "小脑指挥 🤡",
    position: "自由人",
    role: "CT / 指挥（自由人）",
    image: "assets/agents/player-leien.jpg",
    avatar: true,
    line: "等一下，我绕后……哎，先别跟我。",
  },
  commander: {
    name: "爱娃特工",
    specialty: "场外战术指挥",
    role: "CT / 战术指挥",
    image: "assets/agents/lead.webp",
    offsite: true,
    line: "你先拆，有情况我报。来枪别硬扛。",
  },
  rookie: {
    name: "迈克·赛弗斯",
    specialty: "狙击手",
    role: "CT / 狙击手",
    image: "assets/agents/rookie.webp",
    line: "有钳吧？枪线别硬吃，活着把包拆了。",
  },
  coconut: {
    name: "椰子C",
    specialty: "突破手",
    role: "CT / 突破手",
    image: "assets/agents/coconut-c.jpg",
    avatar: true,
    line: "你拆你拆！……哎，我真没催。",
  },
};
// Homepage-only nicknames never replace the squad's in-round roles or dialogue.
Defuse.homeTitles = {
  lead: { position: "自由人", title: Defuse.cast.lead.nickname, targetId: "leien-hidden-role" },
  coconut: { position: "突破手", title: "我是龙🐉", targetId: "coconut-hidden-role" },
};
Defuse.homeTitleLabel = (who, revealed = false) => {
  const title = Defuse.homeTitles[who];
  return `${Defuse.cast[who].name}（${title.position}）${revealed ? `，${title.title}，点击隐藏称号` : "，点击揭晓隐藏称号"}`;
};
Defuse.castSpecialty = (who) => {
  const member = Defuse.cast[who];
  return Defuse.escapeHtml(member.specialty) + (member.position ? `<em class="role-secondary">（${Defuse.escapeHtml(member.position)}）</em>` : "");
};
Defuse.portrait = (who, className = "") =>
  `<img class="agent-portrait ${Defuse.cast[who].avatar ? "profile-portrait" : ""} ${className}" src="${Defuse.cast[who].image}" alt="${Defuse.cast[who].name}${Defuse.cast[who].avatar ? "的头像" : "的手绘表情"}" draggable="false">`;
Defuse.playerAvatar = () =>
  `<span class="player-avatar">${Defuse.playerImage()}</span>`;
Defuse.coconutLines = {
  password: [
    "这把换密码了！按住擦纸条，别背上把的！",
    "{player}，看上面那张纸！擦干净再输，别蒙啊！",
  ],
  hold: [
    "有钳，按住五秒！来枪记得躲，别贪！",
    "按住拆啊！没枪别松，有枪先躲，我比你还急！",
  ],
  wires: [
    "看黄字！看准再剪，别跟着雷恩点！",
    "先看状态，再看规则！别问我，我也在看！",
  ],
  tools: [
    "钳子钳子！还逛上商店了？快找！",
    "找拆弹钳啊！电饭锅留着下把做饭！",
  ],
  smoke: [
    "记亮的那格！起烟了点回去，别乱点！",
    "就刚才那格！别问我哪格，我光顾着催了！",
  ],
  twenty: [
    "不到二十秒了！你拆你的，我急我的！",
    "{player}，看表看表！别磨了，接着拆！",
  ],
  ten: [
    "十秒十秒！别聊天了，先拆！",
    "十秒了！快快快，别看别处！",
  ],
  five: ["五秒！别看我，看包！", "快快快！有话下把再说！"],
  holdRelease: [
    "松了？五秒重算！安全了就赶紧接着拆！",
    "这进度不存的啊！躲完回来，重新按满五秒！",
  ],
  holdPressure: [
    "按住按住！没事别松，来枪先躲啊！",
    "进度在走！别自己骗自己假拆，注意躲枪！",
  ],
  smokeCovered: [
    "烟起来了！刚才哪格亮的，点回去！",
    "看不见就凭刚才记的，别在烟里乱点！",
  ],
  lastChance: ["就一次机会了！我不催了，你看准！"],
  dodge: ["躲过去了！快回来拆，别在那买房！"],
  backflash: ["背到了！回来拆，时间没停！"],
  victory: [
    "Nice！哎哟，给我吓的。",
    "好拆好拆！刚才我都以为没了。",
  ],
  timeout: ["哎，就差一点！下把早点摸包。"],
  eliminated: ["我的我的，催过头了。下把先躲，活着再拆。"],
  errors: ["完了，真点炸了。下把我少催两句，你看准。"],
  "blind-password": ["不是，真盲输啊？下把先擦纸条，我等你！"],
};
Defuse.coconutLine = (event) => {
  const lines = Defuse.coconutLines[event] || ["先看包，别分心。"];
  return Defuse.personalize(lines[Math.floor(Math.random() * lines.length)]);
};
Defuse.isTeammateDead = (who, round) => !Defuse.cast[who]?.offsite && !!round?.deadTeammates?.includes(who);
// Dead players may guide the current action, but cannot promise live cover.
Defuse.deadComms = {
  circuit: "我倒了。路线一直亮着，顺着拖，松手也能接着来。",
  fake: "我倒了！你摸一下就松，等他露头再点，别急着开枪。",
  password: "我倒了，你自己来。先擦上面纸条，输这把的密码。",
  hold: "我倒了！有钳按住五秒，来枪先躲，别贪。",
  wires: "我倒了。看设备状态，按黄字规则剪，别猜。",
  tools: "我倒了，钳还在那堆东西里。看准再拿。",
  smoke: "我倒了！记住亮格，烟起来再点回去。",
};
Defuse.radioLine = (text, who, round) => {
  text = Defuse.personalize(text);
  if (!Defuse.isTeammateDead(who, round)) return text;
  const promisesLiveCover = /我架|架着|我们架|帮你架|我看着|帮你看着|我看狗洞|我看白车|我看B|B 洞我看着|狗洞我看着|烟给包上|给包烟了|B 门烟封了/;
  return promisesLiveCover.test(text)
    ? Defuse.deadComms[round.moduleId] || "我倒了！盯住包点，来枪躲，来火跑。"
    : text;
};
// Misleading comic calls are never delivered alone: Ava's answer is part of
// the same radio update, so a threat or a screen change cannot strand a lie.
Defuse.leienCalls = {
  circuit: [["能不能直接拉过去？……哦，不行啊。", "别听他的。顺着亮线走，碰边停住，松手可以接着拖。"]],
  fake: [["我摸了！他肯定以为我真拆……他来了！", "松手架枪。等他露头再打，不用硬按着包。"]],
  password: [
    ["还是上把那串吧？我记得是……", "别听雷恩，这把换了。按住擦净纸条，看清七位数字再输。"],
    ["第一位像七？哎，没看清，你别跟着输。", "别听他猜。擦清纸条，看准七位再输。盲输错了直接炸。"],
  ],
  hold: [
    ["点一下骗枪，再接着拆！进度……应该给存吧？", "别听雷恩。松手就清零，得连续按住五秒。来枪先躲，别硬拆。"],
    ["别松！他这枪线我研究过，感觉能扛……", "别听他赌。来枪先躲，安全了再按；这点血扛不住。"],
  ],
  wires: [
    ["红的吧？我看电影都剪红的……", "别听雷恩的。看状态，照黄色规则剪。"],
    ["要不全剪了？……别别，我开玩笑的。", "别听他的。规则只对应一根，看准了再剪。"],
  ],
  tools: [
    ["电饭锅！把包扣里面，爆了也……等下别真点！", "别听雷恩的，拿拆弹钳。看钳口。"],
    ["这怎么还有鼠标？拿这个能拆吗？", "别听他的。要找拆弹钳，看图形，别跟着点。"],
  ],
  smoke: [
    ["点中间！我刚才好像看的就是中间！", "别听雷恩。刚才哪格亮，就点回那个位置，不一定在中间。"],
    ["我记住了，左边！不对右……你先点着！", "别听他乱报。回想黄色亮格，按你记住的位置点。"],
  ],
};
Defuse.leienExchange = (id, random = Math.random) => {
  const calls = Defuse.leienCalls[id];
  if (!calls) return null;
  const [mislead, text] = calls[Math.min(calls.length - 1, Math.max(0, Math.floor(random() * calls.length)))];
  return { who: "commander", text, mislead };
};
// Original dialogue using Chinese Dust II callouts; not recordings or copied player quotes.
Defuse.comms = {
  circuit: [
    { who: "commander", text: "沿亮线拖到终点，碰边停住，松手能接着走。" },
    { who: "goggles", text: "顺着走就行。这不是沙二中门，别硬穿。" },
    { who: "rookie", text: "线一直亮着。到拐角再转。" },
  ],
  fake: [
    { who: "commander", text: "摸一下就松！骗他出来，别把自己骗进去了。露头再打。" },
    { who: "lead", text: "摸一下就松，等他！别自己先开枪。" },
    { who: "goggles", text: "给个拆包声，松手架住。他探头再开枪。" },
  ],
  password: [
    { who: "commander", text: "这把密码换了。按住上面纸条擦净，看清七位数字再输；盲输错了直接炸。" },
    { who: "lead", text: "这不是上把那串。先擦纸条，别输旧的！" },
    {
      who: "goggles",
      text: "密码在上面那张纸。按住擦干净，别拿旧的试。",
    },
    {
      who: "rookie",
      text: "看纸条，先把灰擦掉。七位数，一位一位看清。",
    },
  ],
  hold: [
    { who: "commander", text: "有钳，连续按满五秒。来枪先躲，松手归零，安全了再拆。" },
    { who: "lead", text: "稳住！我说你稳住，不是硬扛啊。来枪先躲！" },
    { who: "goggles", text: "狗洞我看着，你拆。来枪还是得躲，别硬顶。" },
    { who: "lead", text: "先拆吧，没枪就按住。有枪记得躲。" },
  ],
  wires: [
    { who: "commander", text: "先看设备状态，再看黄字规则。只剪对应那根，别猜颜色。" },
    { who: "lead", text: "我想说全剪……行，我闭麦。你看规则。" },
    { who: "goggles", text: "先别急着报颜色，规则看完再剪。" },
    { who: "rookie", text: "都少说两句，让他看规则。" },
  ],
  tools: [
    { who: "commander", text: "先找拆弹钳，认准钳口。拿对了再接着拆。" },
    { who: "lead", text: "拿钳子！这电饭锅谁塞进来的？" },
    { who: "rookie", text: "钳在这堆装备里。刀先别捡，包要炸了。" },
    { who: "goggles", text: "有钳才拆得快，认准钳子。" },
  ],
  smoke: [
    { who: "commander", text: "记住亮的那格。等烟起来，点回同一个位置。" },
    { who: "lead", text: "刚才亮哪儿你记一下，我没看清。" },
    { who: "goggles", text: "包位记住，烟起来就看不见了。别乱点。" },
    { who: "rookie", text: "盯住亮格。起烟了也在原位，别跟着烟找。" },
  ],
};
Defuse.coconutLines.circuit = ["线没断，你别自己拐丢了。慢点转，来得及。"];
Defuse.coconutLines.fake = ["摸了就松！他比你急，等他出来再点！"];
Defuse.coconutLines.suppression = ['两边都在拉，先压住这一波！'];
Defuse.coconutLines.listen = ['停，先别拆！听脚步，人在往这边摸。'];
Defuse.comms.listen = [{ who: "commander", text: "先看脚步从哪来，架住。露头再打。" }];
Defuse.leienCalls.suppression = [['我看 B 门……哎，洞里也出来了！', '两边一起压。按住划过 C4，十五个就能继续拆。']];
Defuse.comms.suppression = [{who:'commander',text:'B 门和洞口一起拉了！划中十五个 C4，把枪线压回去再拆。'}];
Defuse.deadComms.suppression = '我倒了！两条枪线都得压，划过一整排，别只点一个。';
for (const id of Defuse.MODULE_IDS)
  Defuse.comms[id].push({ who: "coconut", text: Defuse.coconutLines[id][0] });
Defuse.moduleOpening = (id, round, plan = Defuse.matchPlan, random = Math.random) => {
  if (round?.rescueCleared) return { who: "ricksaw", text: Defuse.supportComms(id, round) };
  if (id === "hold" && round?.hasDefuseKit === false)
    return { who: "commander", text: "钳子捡不到了。得按满十秒，别松，看着时间。" };
  const lines = Defuse.comms[id] || [];
  const guidance = lines.find(line => line.who === "commander");
  if (id === "password" || id === "circuit" || id === "fake" || round?.index === 0) {
    const alive = Defuse.teamIds.filter(who => !Defuse.isTeammateDead(who, round));
    const status = !alive.length ? "只剩你了。我继续报点。" : round?.index === 0 && plan?.mode === "rush" && alive.length === 1 ? `场上只剩你和${Defuse.cast[alive[0]].name}。` : "";
    return { who: "commander", text: status + (id === "password" ? Defuse.passwordGuidance(round) : guidance?.text || Defuse.cast.commander.line) };
  }
  return Defuse.leienExchange(id, random) || { who: "commander", text: Defuse.cast.commander.line };
};
Defuse.coconutReaction = (result) =>
  `<div class="friend-reaction">${Defuse.portrait("coconut")}<div><span>椰子C <small>友方 / 赛后开麦</small></span><p>${Defuse.escapeHtml(Defuse.coconutLine(result.success ? "victory" : result.reason))}</p></div></div>`;
Defuse.supportReaction = (result) => {
  const who = Defuse.supportId(result);
  const dead = Defuse.isTeammateDead(who, result);
  return `<div class="friend-reaction${dead ? " friend-dead" : ""}" data-support="${who}">${Defuse.portrait(who)}<div><span>${Defuse.escapeHtml(Defuse.cast[who].name)} <small>${dead ? "阵亡频道 / 赛后开麦" : "友方 / 赛后开麦"}</small></span><p>${Defuse.escapeHtml(Defuse.supportComms(result.success ? "victory" : result.reason, result))}</p></div></div>`;
};
Defuse.teamMark = (side) =>
  `<span class="faction-mark ${side === "CT" ? "ct" : "t"}-mark"><img src="assets/factions/${side === "CT" ? "ct" : "t"}.svg" alt="${side === "CT" ? "CT 反恐精英" : "T 恐怖分子"}阵营徽记"></span>`;

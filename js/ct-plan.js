/* Original squad dialogue. Ava observes off-site and never joins the live roster. */
(() => {
  const onsite = Object.freeze(["lead", "goggles", "rookie", "coconut"]);
  const actors = [...onsite, "player"];
  const validSupport = (id) => onsite.includes(id) || id === "ricksaw";
  Defuse.roundTeamIds = round => round?.opening === "rush-defense" ? (round.rushProof?.ctIds || round.rushCTIds || ["lead", "goggles", "coconut"]) : round?.opening === "rescue" ? ["lead", "goggles", "coconut", "ricksaw"] : [...onsite];
  const unit = (random) => {
    const value = Number((typeof random === "function" ? random : Math.random)());
    return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
  };
  const makeBag = (ids) => {
    let bag = [], last = null;
    return (random) => {
      if (!bag.length) {
        bag = [...ids];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(unit(random) * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag.at(-1) === last) {
          const other = bag.findIndex((id) => id !== last);
          [bag[other], bag[bag.length - 1]] = [bag.at(-1), bag[other]];
        }
      }
      last = bag.pop();
      return last;
    };
  };
  const drawSupport = makeBag(onsite), drawActor = makeBag(actors);
  const profiles = {
    lead: {
      weapon: "M4A1-S", kill: "下包的掉了！哎，这枪还行。", down: "我想绕一下……掉了！别跟我走！",
      handoff: "你有钳吧？行，你拆。我不指挥了。",
      twenty: "二十秒。还来得及，接着拆。", ten: "十秒！我不说了。", five: "五秒了！快！",
      lastChance: "就这一次了。看准啊，别听我瞎报。", victory: "好拆！刚才我都不敢说话了。", timeout: "哎，差一点。刚才话太多了，我的。", eliminated: "我的，刚才不该喊你硬拆。", errors: "哎，点错了。下把看清再点。", "blind-password": "真按上把输了？这把换了啊。先擦纸条。",
    },
    goggles: {
      weapon: "M4A1-S", kill: "下包的补了。可以进，还有人。", down: "烟给了……我倒了。这边别直接拉。",
      handoff: "你拆，烟先留着。包上着火了再扔。",
      twenty: "二十秒，别硬吃伤害。", ten: "十秒了，留意来枪。", five: "五秒，赶紧拆。",
      lastChance: "只剩一次。规则看清了再点。", victory: "好拆！这分拿了。", timeout: "差几秒。下把得早点摸包。", eliminated: "被补了。没事，下把来枪先躲。", errors: "点快了吧。下把先看一眼。", "blind-password": "纸条没看全就输了？先擦干净啊。",
    },
    rookie: {
      weapon: "AWP", kill: "下包的收了。别追，人还没清。", down: "被补了。B 门枪线，别直走。",
      handoff: "有钳就拆。来枪躲，别贪。",
      twenty: "二十秒。接着拆。", ten: "十秒。看包。", five: "五秒，抓紧。",
      lastChance: "最后一次。看准。", victory: "好拆。", timeout: "晚了。下把早点动。", eliminated: "没躲开。下把来。", errors: "点错了。下把看准。", "blind-password": "别猜。先擦，再输。",
    },
    coconut: {
      weapon: "M4A4", kill: "掉了掉了！进，快进！", down: "我先拉！……掉了！别跟，他还架着！",
      handoff: "你有钳，快拆！行行行，我不说了。",
      twenty: "二十秒了！拆啊，拆啊！", ten: "十秒十秒！先别说话！", five: "五秒！别看我，看包！",
      lastChance: "就一次了！行，我闭麦。", victory: "Nice！好拆好拆！", timeout: "啊？就差这么一点！下把早点拆。", eliminated: "我的我的，我刚才太吵了。", errors: "哎呀，点错了！没事没事，下把来。", "blind-password": "不是，真盲输啊？先擦纸条嘛！",
    },
    ricksaw: {
      weapon: "M4A1-S", kill: "清了。别追，看包。", down: "先缩回去，别接这条枪线。",
      handoff: "清了。钳给你，拆吧。",
      circuit: "顺着亮线走，别穿过去。", wires: "先看状态，再按黄字剪。", hold: "有钳，按满五秒。别松。",
      holdRelease: "松了就重算。再按满五秒。", holdPressure: "没人了，继续按。",
      twenty: "二十秒，够。", ten: "十秒，拆。", five: "最后五秒，别分心。",
      lastChance: "最后一次。看规则。", victory: "好拆，Nice。", timeout: "人清了，拆晚了。下把早点。", errors: "没人打你，别急着点。下把再来。", eliminated: "别硬接啊。下把先躲。",
    },
    player: { weapon: "M4A1-S", kill: "补掉了。还有守包的，先把包拆了。" },
  };

  // Normalization also supports older saved/test plans without CT fields.
  Defuse.ctPlan = (plan = Defuse.matchPlan) => {
    plan = plan || {};
    if (plan.opening === "rescue") return {
      supportId: "ricksaw", deadTeammates: ["lead", "goggles", "coconut"], actorId: "lead", weapon: "AK-47",
      killLine: "B 点有人架！别直走，缩回来！", handoff: "里克索尔在回了。先躲，别硬接。",
      handoffTitle: "撑住，支援正在赶到。", supportLine: profiles.ricksaw.handoff,
    };
    if (plan.opening === "direct" && plan.variation === "entry-whiff") {
      const supportId = onsite.includes(plan.supportId) ? plan.supportId : "coconut";
      const actorId = onsite.includes(plan.whiffActorId) && plan.whiffActorId !== supportId ? plan.whiffActorId : onsite.find(id => id !== supportId);
      const lines = { lead: "一梭子没打中……我掉了！B 门那人还在！", goggles: "枪空了，我掉了！B 门没清，先别直走。", rookie: "空了。被补掉了，B 门还架着。", coconut: "我拉了！……空了空了，我没了！先别跟！" };
      return { supportId, actorId, deadTeammates: [actorId], weapon: "AK-47", killLine: lines[actorId],
        handoffTitle: "进点的掉了，枪线还在。", handoff: `${Defuse.cast[actorId].name}没换到人。${Defuse.cast[supportId].name}还在，来枪先收身。`, supportLine: "我架着，你先摸包。有枪就缩，别硬顶。" };
    }
    const rush = plan.mode === "rush";
    const supportId = onsite.includes(plan.supportId) ? plan.supportId : "coconut";
    const deadTeammates = rush || plan.opening === "flash" ? onsite.filter((id) => id !== supportId) : [];
    const eligible = rush ? deadTeammates : actors;
    const actorId = eligible.includes(plan.ctActorId) ? plan.ctActorId : eligible.includes("lead") ? "lead" : eligible[0];
    const supportName = Defuse.cast[supportId].name;
    const actorName = actorId === "player" ? Defuse.player.name : Defuse.cast[actorId].name;
    return {
      supportId, deadTeammates, actorId,
      weapon: rush ? "AK-47" : profiles[actorId].weapon,
      killLine: profiles[actorId][rush ? "down" : "kill"],
      handoff: (plan.opening === "flash"
        ? `只剩你和${supportName}了。等队友闪爆再进，清完你拆。`
        : rush
        ? `只剩你和${supportName}了。来枪先躲，队友只能挡一次。`
        : `${actorId === "player" ? "好补枪" : `${actorName}把下包的补了`}。${supportName}跟你进，来枪先躲，再回来拆。`) + (plan.variation === "deagle" ? " 这把拿沙鹰，等露头再点。" : ""),
      handoffTitle: rush ? `你和${supportName}，接管拆包。` : "下包的已掉，你来拆包。",
      supportLine: profiles[supportId].handoff,
    };
  };

  Defuse.rollCTPlan = (plan = Defuse.matchPlan, random = Math.random) => {
    const supportId = drawSupport(random);
    const rush = plan?.mode === "rush";
    const deadTeammates = rush ? onsite.filter((id) => id !== supportId) : [];
    const ctActorId = rush ? deadTeammates[Math.floor(unit(random) * deadTeammates.length)] : drawActor(random);
    const next = { ...plan, supportId, deadTeammates, ctActorId, ctDown: rush, coconutDown: deadTeammates.includes("coconut") };
    next.handoff = Defuse.ctPlan(next).handoff;
    return next;
  };

  Defuse.supportId = (round) => validSupport(round?.supportId) ? round.supportId : Defuse.ctPlan().supportId;
  Defuse.supportName = (round) => Defuse.cast[Defuse.supportId(round)].name;
  Defuse.ctActorName = (plan) => {
    const id = Defuse.ctPlan(plan).actorId;
    return id === "player" ? Defuse.player.name : Defuse.cast[id].name;
  };
  Defuse.ctActorPortrait = (plan) => {
    const id = Defuse.ctPlan(plan).actorId;
    return id === "player" ? Defuse.playerImage("agent-portrait profile-portrait") : Defuse.portrait(id);
  };
  Defuse.ctActorSpecialty = (plan) => {
    const id = Defuse.ctPlan(plan).actorId;
    return id === "player" ? `你 · ${Defuse.escapeHtml(Defuse.player.specialty)}` : Defuse.castSpecialty(id);
  };

  // Plain text only: renderers escape it before inserting HTML. Threat facts
  // always take precedence over a character's comic or impatient delivery.
  Defuse.supportComms = (kind, round, params = {}) => {
    const id = Defuse.supportId(round), p = profiles[id];
    const dead = !!round?.deadTeammates?.includes(id);
    if (round?.hasDefuseKit === false && ["hold", "holdRelease", "holdPressure"].includes(kind))
      return kind === "holdRelease" ? "松了进度就没了！没钳子，要重新按满十秒。" : "钳子没了，连续按住十秒！看好倒计时，别自己松手。";
    const tone = (lines) => lines[Math.max(0, onsite.indexOf(id))];
    if (kind === "handoff") return dead ? "我倒了，你自己接着拆。危险先处理，别硬顶。" : p.handoff;
    if (Object.hasOwn(p, kind)) return p[kind];
    if (kind === "warning-shots") {
      const danger = params.bodyguardAvailable === false || params.lethal || dead
        ? "这轮不躲就倒，别硬拆！" : "快躲！这轮只能替你挡一次，别硬拆！";
      return `${params.direction || "包点"}来枪了！${danger}${params.pairedGrenade ? "还有雷，一起躲！" : ""}`;
    }
    if (kind === "warning-grenade") return tone(["包上有雷！先躲，别硬吃！", "雷往包上来了，赶紧躲！", "包上有雷。躲。", "雷雷雷！先躲啊，别硬拆！"]);
    if (kind === "warning-fire") return tone(["烧了烧了！先跑，有烟就灭火！", "火铺包了。先跑，烟留到包上灭火。", "脚下火。快跑，或投烟灭火。", "烧起来了！跑跑跑！有烟就灭火！"]);
    if (kind === "warning-flash") return `${params.direction || "包点"}来闪！${tone(["背闪！别看它！", "先背闪，别丢视野。", "背闪。", "背闪背闪！别直勾勾看着！"])}`;
    if (kind === "bodyguard") return tone(["我掉了！下一轮得自己躲，别硬拆！", "我替你挡了，没救了。下轮自己躲，别硬扛。", "我倒了。下轮一定躲。", "我挡了！……我掉了！下轮一定躲，别跟我一起没！"]);
    if (kind === "evade-shots" || kind === "dodge") return tone(["躲开了，回来拆！我先不说了。", "安全了，赶紧回包，时间没停。", "躲开了。回包。", "躲过去了！快回来拆，别在那买房！"]);
    if (kind === "evade-fire") return tone(["人跑出来了！别往火里返，丢烟灭火再拆。", "先别回火里。有烟就灭火，没烟等火灭。", "火没灭。投烟，或等。", "出来了出来了！火还在啊，有烟就扔！"]);
    if (kind === "evade-flash" || kind === "backflash") return tone(["背到了，没白！回去拆。", "闪躲过了，回来接着拆。", "闪过了。接着拆。", "背到了！回来拆，时间没停！"]);
    if (kind === "smoke-wrong") return tone(["摸错了！这次真别听我，想想刚才亮哪格。", "位置错了。认刚才的亮格，不要乱点。", "错了。回想亮格。", "摸错了！就刚才亮的那格，别乱点！"]);
    if (kind === "duel-win") {
      const fact = params.guardsCleared ? "守包的全清了，包还没拆！" : "空出五秒，快拆！";
      return `${params.enemyName || "对面"}掉了！${tone(["好枪！", "补得好。", "好枪。", "好枪好枪！"])}${fact}`;
    }
    if (kind === "flashed") return tone(["白了白了！先别点，等一下。", "全白了，等视野回来，先别乱点。", "白了。等。", "白白白！先别乱点啊！"]);
    if (kind === "password") return Defuse.passwordGuidance(round);
    const moduleLines = {
      circuit: ["这线绕得……行，顺着亮线走。", "顺着走就行。这不是沙二中门，别硬穿。", "沿亮线走。松手也能继续。", "别硬拐！到路口再转，线又不会跑！"],
      fake: ["摸一下就松，架他！他要出来了。", "摸一下包，松手等他露头。", "摸包。松手。等探头。", "摸了就松！他比你急，等他出来再点！"],
      password: ["这把真别背我的旧密码。按住擦纸条，看清再输。", "纸条在上面。按住擦清，再输本局密码。", "擦纸条。看清七位数再输。", "这把换密码了！按住擦纸条，别背上把的！"],
      hold: ["按住五秒，松了不存啊。来枪就躲，别信我说能扛。", "连续按满五秒。来枪先躲，活着再拆。", "按住五秒。来枪躲，别贪。", "有钳按住五秒！有枪先躲，我比你还急！"],
      wires: ["我想说红线……算了，看黄字规则，别听我的。", "看设备状态，照黄字规则剪。", "看规则。只剪对应那根。", "看黄字！看准再剪，别跟着雷恩点！"],
      tools: ["拿钳子。电饭锅……别问，真不是我带的。", "找钳子，认准钳口。", "拿钳。别捡刀。", "钳子钳子！电饭锅留着下把做饭！"],
      smoke: ["记好亮的那格，别问我，我没看清。", "记好亮格，烟里点回原位。", "记位置。烟起后点回去。", "记亮的那格！起烟了点回去，别乱点！"],
      holdRelease: ["松了啊？得重新按五秒，先看有没有枪。", "进度清零了。安全后重新按满五秒。", "松了归零。安全了重来。", "松了？五秒重算！安全了赶紧接着拆！"],
      holdPressure: ["没枪先按住，来枪可别听我瞎赌。", "进度在走，注意来枪预警。", "按住。留意枪线。", "按住按住！没事别松，有枪先躲啊！"],
      smokeCovered: ["起烟了。刚才那格你记住了吧？", "起烟了，点回刚才亮的位置。", "按记的位置点。", "烟起来了！刚才哪格亮的，点回去！"],
    };
    return moduleLines[kind] ? tone(moduleLines[kind]) : tone(["看规则，别跟着我瞎急。", "别急，先拆。", "冷静。看清再动。", "你拆你的！看准啊！"]);
  };

  const rollEnemyPlan = Defuse.rollMatchPlan;
  let openingBag = [];
  Defuse.rollMatchPlan = (random = Math.random) => {
    // Four-round bags mix both openings without long runs of either one.
    if (!openingBag.length) {
      openingBag = ["direct", "direct", "flash", "flash"];
      for (let i = openingBag.length - 1; i > 0; i--) {
        const j = Math.floor(unit(random) * (i + 1));
        [openingBag[i], openingBag[j]] = [openingBag[j], openingBag[i]];
      }
    }
    const normalOpening = openingBag.pop();
    // Rare authored rescue is independent of normal difficulty and enemy identity.
    const rare = unit(random);
    const opening = rare < .05 ? "rush-defense" : rare < .15 ? "rescue" : normalOpening;
    Defuse.matchPlan = { ...Defuse.rollCTPlan(rollEnemyPlan(random), random), opening, difficulty: Defuse.streakDifficulty(Defuse.rankings?.stats?.streak || 0) };
    Object.assign(Defuse.matchPlan, Defuse.rollRoundVariation(Defuse.matchPlan, random));
    if (opening === "rush-defense") {
      const normal = Defuse.matchPlan.retakeGuardIds;
      // Conditional 10% of Romanov's 5% openings: about 0.5% of all rounds.
      const rushEncounter = unit(random) < .1;
      Object.assign(Defuse.matchPlan, {
        enemyId: "romanov", mode: "rush", label: "HOLD B / 拦住这波",
        rushEnemyIds: ["romanov", normal[0], normal[1]],
        rushOpeningEnemyId: normal[2], rushCTIds: ["lead", "goggles", rushEncounter ? "ricksaw" : "coconut"], rushEncounter,
        bombPlanted: false, deadTeammates: [], ctDown: false, coconutDown: false,
        handoff: "包还没下！背闪，守住 B 点。最后那把 AK 是罗曼诺夫。",
      });
      return Defuse.matchPlan;
    }
    if (opening === "rescue") Object.assign(Defuse.matchPlan, { supportId: "ricksaw", mode: "rush", label: "LAST STAND / 绝境回防", ctDown: true, plant: Defuse.enemyProfiles[Defuse.matchPlan.enemyId].plant.rush, scene: Defuse.enemyProfiles[Defuse.matchPlan.enemyId].planted.rush });
    const ct = Defuse.ctPlan();
    Defuse.matchPlan.deadTeammates = [...ct.deadTeammates];
    Defuse.matchPlan.handoff = ct.handoff;
    Defuse.matchPlan.coconutDown = ct.deadTeammates.includes("coconut");
    if (Defuse.matchPlan.variation === "entry-whiff") Defuse.matchPlan.ctDown = true;
    return Defuse.matchPlan;
  };
})();

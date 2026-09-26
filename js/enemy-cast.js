/* Original personalities for this minigame, not official agent biographies.
   Round selection owns its own bag: the home carousel must never draw from it. */
(() => {
  const ids = Object.freeze(["planter", "opponent", "rebel", "sallie", "daryl", "solman", "vypa"]);
  Defuse.enemyIds = ids;
  // Gallery membership is independent of the normal opponent draw bag.
  Defuse.enemyShowcaseIds = Object.freeze([...ids, "romanov"]);
  Defuse.enemyProfiles = {
    romanov: {
      homeRole: "核心步枪手 · 稀有", homeLine: "你们给闪。剩下的，我来。",
      styleLine: "跟在队友后面补枪。5% 几率遇到他的 B 点进攻。",
      kicker: "最后一把 AK", headPosition: "50% 9%",
      loss: { eliminated: "清了。闪给得好，进吧。", bomb: "我来拿这分。" },
    },
    planter: {
      homeRole: "突破手",
      homeLine: "给闪！我先进，你们跟上。",
      styleLine: "抢身位，强上 B；包下就退，等你来拆。",
      rushChance: 0.7,
      kicker: "正面强攻",
      headPosition: "55% 12%",
      plant: {
        rush: "给闪！跟我进 B，别堵洞口！我下包，你们架回防。",
        fake: "A 大闹点动静，包跟我转 B。小声点，别把人叫回来！",
      },
      planted: {
        rush: "包下了！退回洞里，别一个个出去送。",
        fake: "他们还在 A，B 包下了。先藏好，等他摸包！",
      },
      loss: {
        eliminated: "人没了，包还在。这分拿下！",
        bomb: "Nice，包炸了！下把还打 B？",
      },
    },
    opponent: {
      homeRole: "指挥",
      homeLine: "别急，让他先摸包。我等这一下。",
      styleLine: "听到拆包声才拉，偏爱和队友一起补枪。",
      rushChance: 0.45,
      kicker: "听拆反打",
      headPosition: "60% 8%",
      plant: {
        rush: "先给烟，再闪进 B。我下包，交叉枪线架起来，别贪。",
        fake: "A 点烟闪给够，骗他回防。我带包转 B，没见人别开枪。",
      },
      planted: {
        rush: "包下了，架交叉。别主动送，听到拆包再一起拉。",
        fake: "他们回错点了。包下好，留着道具，等他摸包。",
      },
      loss: {
        eliminated: "回防的倒了。稳住，等包响。",
        bomb: "包响了，这分拿了。别站原地。",
      },
    },
    rebel: {
      homeRole: "道具手",
      homeLine: "烟闪我给。包下别急，火留着拖时间。",
      styleLine: "烟闪掩护进点，留火守包；能拖一秒是一秒。",
      rushChance: 0.25,
      kicker: "藏位拖时间",
      headPosition: "60% 15%",
      plant: {
        rush: "洞口给烟，趁乱进 B。我把包下了，你们先藏好。",
        fake: "A 点闹一下就撤，别真打。我带包静步进 B，别漏脚步。",
      },
      planted: {
        rush: "包好了，散开藏。他不拆就别露，让他自己急。",
        fake: "B 包下了，没人听见。绕后那位先别动，听拆再拉。",
      },
      loss: {
        eliminated: "拆包的掉了。还有人吗？别乱拉。",
        bomb: "他来晚了。包响了，走。",
      },
    },
    sallie: {
      homeRole: "自由人",
      homeLine: "别盯包，我绕侧面。听到脚步再开枪。",
      styleLine: "经常绕侧面，听见拆包声才出来。",
      rushChance: 0.52,
      kicker: "侧翼游击",
      headPosition: "58% 10%",
      plant: {
        rush: "闪光跟上！我先拉侧面，你们别堵洞口，包下就散开。",
        fake: "A 打两枪就走，别真打。我带包转 B。",
      },
      planted: {
        rush: "包好了，别全挤在一起。你一拆我就从侧面拉出来。",
        fake: "他以为我们还在 A。别出声，听到拆包再一起动。",
      },
      loss: {
        eliminated: "补枪的掉了！我继续卡侧面，你们别追。",
        bomb: "Nice，包响了。刚才谁差点跑反了？",
      },
    },
    daryl: {
      homeRole: "补枪手",
      homeLine: "你先拉，我跟着。别拉太远，补不上枪。",
      styleLine: "贴近包点硬接，闪光一响就压出来。",
      rushChance: 0.36,
      kicker: "贴脸压枪",
      headPosition: "58% 8%",
      plant: {
        rush: "闪给出去，我贴近点！你们跟紧，别让我白冲。",
        fake: "假打 A，真进 B。别急着开火，等回防露头再收。",
      },
      planted: {
        rush: "包在脚下，别送。谁来拆，我贴脸把他赶走。",
        fake: "他们回错了。把闪留着，听到拆包再冲，别提前露。",
      },
      loss: {
        eliminated: "拆包的掉了。别追了，等包响。",
        bomb: "最后一秒还想摸包？太晚了。",
      },
    },
    solman: {
      homeRole: "自由人", homeLine: "包在那儿。你急，我不急。", styleLine: "留在侧翼卡回防，听拆再补枪。", rushChance: .38, kicker: "侧翼截击", headPosition: "50% 10%",
      plant: { rush: "你们进点，我卡回防。包下好了再说，别追。", fake: "A 大动静留够，包跟我去 B。脚步收一收。" },
      planted: { rush: "包下了。门外归我，谁都别主动送。", fake: "他们绕远了。散开架住，等他摸包。" },
      loss: { eliminated: "回防的没了。回位置，等包响。", bomb: "响了。走了走了，别留这儿。" },
    },
    vypa: {
      homeRole: "突破手", homeLine: "闪给到位！我开路，你们补枪。", styleLine: "第一身位拉开点内，队友跟进补枪。", rushChance: .74, kicker: "强势破点", headPosition: "52% 9%",
      plant: { rush: "闪给了就进！我拉近点，后面的跟上补枪！", fake: "A 点打两枪就走。别恋战，B 点有空档！" },
      planted: { rush: "包好了！别跟我挤，拉交叉，别白给回防。", fake: "B 拿下了。枪线架住，等他们自己来。" },
      loss: { eliminated: "摸包的掉了！别追，回去守包！", bomb: "Nice！这波进点，没白吃那颗闪。" },
    },
  };

  const validId = (id) => Defuse.enemyShowcaseIds.includes(id) ? id : "planter";
  Defuse.currentEnemyId = () => validId(Defuse.matchPlan?.enemyId);
  const displayImages = {
    planter: "assets/agents/planter-display.webp",
    opponent: "assets/agents/elite-muharik-display.webp",
    rebel: "assets/agents/ground-rebel-display.webp",
    sallie: "assets/agents/sallie-display.webp",
    daryl: "assets/agents/daryl-display.webp",
    solman: "assets/agents/solman-display.webp",
    vypa: "assets/agents/vypa-display.webp",
    romanov: "assets/agents/romanov-display.webp",
  };
  Defuse.enemyImage = (id) => displayImages[validId(id)];

  // A defensive clamp also keeps deterministic/replayed random sources safe.
  const unit = (random) => {
    const value = Number((typeof random === "function" ? random : Math.random)());
    return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
  };
  let bag = [];
  let lastId = null;
  Defuse.drawEnemy = (random = Math.random) => {
    if (!bag.length) {
      bag = [...ids];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(unit(random) * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // Draw from the end; never repeat the final enemy of the previous bag.
      if (bag[bag.length - 1] === lastId) {
        const other = bag.findIndex((id) => id !== lastId);
        [bag[other], bag[bag.length - 1]] = [bag[bag.length - 1], bag[other]];
      }
    }
    lastId = bag.pop();
    return lastId;
  };

  Defuse.rollMatchPlan = (random = Math.random) => {
    const enemyId = Defuse.drawEnemy(random);
    const profile = Defuse.enemyProfiles[enemyId];
    const mode = unit(random) < profile.rushChance ? "rush" : "fake";
    // The selection pool is not the number holding B; a team still has at most five.
    // Retakes face three survivors: near angle, trading angle and a rear guard.
    const partners = ids.filter(id => id !== enemyId);
    for (let i = partners.length - 1; i > 0; i--) {
      const j = Math.floor(unit(random) * (i + 1));
      [partners[i], partners[j]] = [partners[j], partners[i]];
    }
    Defuse.matchPlan = {
      enemyId,
      retakeGuardIds: [enemyId, ...partners.slice(0, 2)],
      siteGuardIds: [enemyId, ...partners.slice(0, 4)],
      rescueGuardIds: [enemyId, ...partners.slice(0, unit(random) < .5 ? 2 : 3)],
      mode,
      label: mode === "rush" ? "RUSH / 强上 B" : "FAKE / 假打转点",
      plant: profile.plant[mode],
      scene: profile.planted[mode],
      handoff: mode === "rush"
        ? "只剩你和椰子C了。接着拆，来枪先躲；他只能救你一次。"
        : "下包的倒了，你接手拆。雷恩先别指挥，有情况我报。",
      ctDown: mode === "rush",
      coconutDown: false,
    };
    return Defuse.matchPlan;
  };

  Defuse.guardIds = (plan = Defuse.matchPlan) => {
    if (plan?.opening === "rush-defense") {
      const chosen = Array.isArray(plan.rushEnemyIds) ? [...new Set(plan.rushEnemyIds)] : [];
      return chosen.length === 3 && chosen[0] === "romanov" && chosen.slice(1).every(id => ids.includes(id))
        ? [...chosen] : ["romanov", ...ids.slice(0, 2)];
    }
    const leadId = validId(plan?.enemyId);
    const ordered = [leadId, ...ids.filter((id) => id !== leadId)];
    if (plan?.opening === "rescue") {
      const chosen = [...new Set(plan.rescueGuardIds || [])];
      return [3, 4].includes(chosen.length) && chosen.every(id => ids.includes(id)) ? chosen : ordered.slice(0, 3);
    }
    if (plan?.opening === "flash") {
      const chosen = Array.isArray(plan.retakeGuardIds) ? [...new Set(plan.retakeGuardIds)] : [];
      return chosen.length === 3 && chosen[0] === leadId && chosen.every(id => ids.includes(id))
        ? [...chosen] : ordered.slice(0, 3);
    }
    // In the fake branch the opening planter is already killed in the intro.
    const chosen = [...new Set(plan?.siteGuardIds || [])];
    const squad = chosen.length === 5 && chosen[0] === leadId && chosen.every(id => ids.includes(id)) ? chosen : ordered.slice(0, 5);
    return plan?.mode === "fake" && plan?.variation !== "entry-whiff" ? squad.filter(id => id !== leadId) : squad;
  };

  // Results use the round snapshot, not the opening planter who may be dead.
  // Legacy result callers without a roster can use the active match plan.
  Defuse.resultEnemyId = (result = {}) => {
    const guards = Array.isArray(result.enemyGuardIds) ? result.enemyGuardIds : Defuse.guardIds();
    const defeated = Array.isArray(result.defeatedEnemyIds) ? result.defeatedEnemyIds : [];
    return guards.find((id) => Defuse.enemyShowcaseIds.includes(id) && !defeated.includes(id)) || null;
  };
})();

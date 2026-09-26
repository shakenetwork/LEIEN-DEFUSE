/* Plain-text post-round radio; callers label a newly fallen companion as 阵亡语音. */
(() => {
  const complaints = Object.freeze({
    lead: "靠，没摸到包，枪线把咱俩一起串了……我这思路也白想了。",
    goggles: "靠，包没摸到，咱俩被穿烟串了。烟封住了，人没藏住。",
    rookie: "靠，没摸到包。咱俩被穿烟一起带走了。",
    coconut: "靠，没摸到包，枪线把咱俩一起串了！我不催了……",
    ricksaw: "包没摸到，咱俩被穿烟带走了。这条枪线没躲开。",
  });
  const comfort = "没事，这把翻篇。烟挡视线不挡子弹，下把记准包位再摸。";

  Defuse.smokeDeathDialogue = (result) => {
    if (!result || result.success || result.reason !== "eliminated" || result.deathCause !== "smoke-crossfire") return [];

    // This event marker identifies the teammate killed by this same burst.
    // supportId alone can refer to someone who died much earlier in the round.
    const who = result.deathCompanionId;
    const companion = typeof who === "string" && Object.hasOwn(complaints, who);
    return [
      companion
        ? { who, text: complaints[who], tone: "complaint" }
        : { who: "commander", text: "刚才对面穿烟扫到你了，包还没摸到。", tone: "report" },
      { who: "commander", text: comfort, tone: "comfort" },
    ];
  };
})();

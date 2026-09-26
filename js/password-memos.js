/* Original scraps of player banter, not quotations attributed to real pros.
 * Historical allusions are documented in SOURCES.md. Never put decoy codes here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Defuse.passwordMemos = api.createDeck();
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const memos = Object.freeze([
    { id: "last-game", heading: "写给下一位冤种", margin: "B 点收", line: "说好打完这把就睡。", reply: "这话是昨晚写的。" },
    { id: "sticker", heading: "随包夹带", margin: "别给队长看", line: "贴纸比枪贵，枪比我的枪法靠谱。", reply: "这纸就别再贴贴纸了。" },
    { id: "team-flash", heading: "B 洞小账本", margin: "记着呢", line: "闪是我给的，白的是自己人。", reply: "这波助攻怎么没算？" },
    { id: "leien", heading: "雷恩说他有战术", margin: "后半句呢？", line: "他说绕后。绕着绕着，人到下一把了。", reply: "纸背面也没写后半句。" },
    { id: "demo", heading: "某人的练枪笔记", margin: "已学会", line: "看了半宿 donk 的 demo。", reply: "今天先把桌子拍明白了。" },
    { id: "coldzera", heading: "学不来的那一跳", margin: "老录像", line: "coldzera 跳狙上了墙。", reply: "我起跳，对面上了分。" },
    { id: "olof", heading: "这页有点烫", margin: "老录像", line: "olof 在火里拆出了涂鸦。", reply: "我这鞋底，怕是没那个命。" },
    { id: "eco", heading: "借条不算数", margin: "就我信了", line: "说好 eco，四个人都买了。", reply: "合着就我一个人过苦日子。" },
    { id: "chicken", heading: "包点观鸟记录", margin: "目击证人", line: "鸡看了我一眼，我空了一梭子。", reply: "它走位有点东西。" },
    { id: "crosshair", heading: "准星调好了", margin: "下把必行", line: "准星抄职业的，贴纸买同款的。", reply: "战绩这块，还是自己的。" },
    { id: "clutch", heading: "下班前的豪言", margin: "麦还开着", line: "残局我来！麦刚开，人没了。", reply: "这回字倒是留全了。" },
    { id: "dinner", heading: "伙食费备忘", margin: "别沾油", line: "枪可以掉，晚饭不能少。", reply: "赢了吃好的，输了也得吃。" },
    { id: "one-hp", heading: "B 门口捡的", margin: "大残？", line: "他喊了三遍大残。", reply: "我出去一看，那人比我还健康。" },
    { id: "smoke", heading: "烟里有字", margin: "人呢？", line: "烟封得挺好，就是把我封外面了。", reply: "站哪儿都像对面的人。" },
    { id: "my-bad", heading: "今天少说两句", margin: "又是我", line: "我的我的。", reply: "这四个字练得比急停还熟。" },
    { id: "knife", heading: "口袋里的废纸", margin: "还挺贵", line: "刀挺贵，刀人没成功过。", reply: "拿出来赶路倒是挺熟练。" },
  ].map(Object.freeze));
  function createDeck(random = Math.random) {
    let bag = [], last = "";
    return {
      get(round) {
        if (round.passwordMemo && memos.includes(round.passwordMemo)) return round.passwordMemo;
        if (!bag.length) {
          bag = [...memos];
          for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
            [bag[i], bag[j]] = [bag[j], bag[i]];
          }
          if (bag[bag.length - 1].id === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
        }
        round.passwordMemo = bag.pop();
        last = round.passwordMemo.id;
        return round.passwordMemo;
      },
    };
  }
  return { memos, createDeck };
});

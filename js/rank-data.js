/* Classic Counter-Strike competitive skill-group names and original icons.
 * This game's challenge rank is local progress, not the player's CS2 rank.
 * Sources and file hashes: RANK-SOURCES.md. */
(function (root, factory) {
  const ranks = factory();
  if (typeof module === "object" && module.exports) module.exports = ranks;
  else (root.Defuse = root.Defuse || {}).RANKS = ranks;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  return Object.freeze([
  {
    "id": 1,
    "name": "白银一级",
    "icon": "assets/ranks/rank-01.png"
  },
  {
    "id": 2,
    "name": "白银二级",
    "icon": "assets/ranks/rank-02.png"
  },
  {
    "id": 3,
    "name": "白银三级",
    "icon": "assets/ranks/rank-03.png"
  },
  {
    "id": 4,
    "name": "白银四级",
    "icon": "assets/ranks/rank-04.png"
  },
  {
    "id": 5,
    "name": "白银精英",
    "icon": "assets/ranks/rank-05.png"
  },
  {
    "id": 6,
    "name": "大师级白银精英",
    "icon": "assets/ranks/rank-06.png"
  },
  {
    "id": 7,
    "name": "黄金新星一级",
    "icon": "assets/ranks/rank-07.png"
  },
  {
    "id": 8,
    "name": "黄金新星二级",
    "icon": "assets/ranks/rank-08.png"
  },
  {
    "id": 9,
    "name": "黄金新星三级",
    "icon": "assets/ranks/rank-09.png"
  },
  {
    "id": 10,
    "name": "大师级黄金新星",
    "icon": "assets/ranks/rank-10.png"
  },
  {
    "id": 11,
    "name": "大师级守卫一级",
    "icon": "assets/ranks/rank-11.png"
  },
  {
    "id": 12,
    "name": "大师级守卫二级",
    "icon": "assets/ranks/rank-12.png"
  },
  {
    "id": 13,
    "name": "大师级守卫精英",
    "icon": "assets/ranks/rank-13.png"
  },
  {
    "id": 14,
    "name": "杰出的大师级守卫",
    "icon": "assets/ranks/rank-14.png"
  },
  {
    "id": 15,
    "name": "传奇之鹰",
    "icon": "assets/ranks/rank-15.png"
  },
  {
    "id": 16,
    "name": "大师级传奇之鹰",
    "icon": "assets/ranks/rank-16.png"
  },
  {
    "id": 17,
    "name": "无上之首席大师",
    "icon": "assets/ranks/rank-17.png"
  },
  {
    "id": 18,
    "name": "全球精英",
    "icon": "assets/ranks/rank-18.png"
  }
].map(Object.freeze));
});

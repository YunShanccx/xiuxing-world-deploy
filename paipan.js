/* 天机阁排盘引擎 — 与页面共用, Node 可测 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("lunar-javascript"));
  else root.Paipan = factory(root);
})(typeof self !== "undefined" ? self : this, function (L) {
  "use strict";

  var TG = "甲乙丙丁戊己庚辛壬癸";
  var DZ = "子丑寅卯辰巳午未申酉戌亥";
  var ELEM = ["木", "火", "土", "金", "水"]; // 五行序: 甲乙木 丙丁火 戊己土 庚辛金 壬癸水
  var TG_ELEM = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var DZ_ELEM = { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" };
  var HIDDEN = { 子: "癸", 丑: "己癸辛", 寅: "甲丙戊", 卯: "乙", 辰: "戊乙癸", 巳: "丙庚戊", 午: "丁己", 未: "己丁乙", 申: "庚壬戊", 酉: "辛", 戌: "戊辛丁", 亥: "壬甲" };
  var NAYIN = ["海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
    "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "砂中金", "山下火", "平地木", "壁上土", "金箔金",
    "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"];

  function idx(g) { return TG.indexOf(g[0]) * 0 + (TG.indexOf(g[0]) * 12 + DZ.indexOf(g[1])) % 60; } // 不用
  function gzIdx(g) { // 干支->0..59 (甲子=0)
    var t = TG.indexOf(g[0]), z = DZ.indexOf(g[1]);
    for (var i = 0; i < 60; i++) if (i % 10 === t && i % 12 === z) return i;
    return -1;
  }
  function nayin(g) { return NAYIN[Math.floor(gzIdx(g) / 2)]; }

  // 十神: 日主 vs 目标干
  function shiShen(dayGan, targetGan) {
    var de = TG_ELEM[dayGan], te = TG_ELEM[targetGan];
    var same = TG.indexOf(dayGan) % 2 === TG.indexOf(targetGan) % 2;
    var gen = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }; // 我生
    var ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };   // 我克
    if (te === de) return same ? "比肩" : "劫财";
    if (gen[de] === te) return same ? "食神" : "伤官";
    if (ke[de] === te) return same ? "偏财" : "正财";
    if (gen[te] === de) return same ? "偏印" : "正印";
    return same ? "七杀" : "正官";
  }

  // 五行强弱计数(按藏干加权)
  function wuXing(pillars) {
    var c = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.tg.forEach(function (g) { c[TG_ELEM[g]] += 1; });
    pillars.dz.forEach(function (z) {
      var h = HIDDEN[z];
      c[TG_ELEM[h[0]]] += 1;                 // 本气
      for (var i = 1; i < h.length; i++) c[TG_ELEM[h[i]]] += 0.5; // 中余气
    });
    return c;
  }

  // 身强弱评分(简化扶抑): 返回 {score, shen:"强|中|弱"}
  function wangShuai(dayGan, pillars) {
    var de = TG_ELEM[dayGan];
    var gen = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
    var ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
    function w(e) { // 生扶度
      if (e === de) return 1;
      if (gen[e] === de) return 1;   // 生我
      if (gen[de] === e) return -0.5; // 我生(泄)
      if (ke[de] === e) return -0.75; // 我克(耗)
      return -1;                     // 克我(制)
    }
    var s = 0;
    var ling = DZ_ELEM[pillars.dz[1]];
    s += w(ling) >= 1 ? (ling === de ? 1.5 : 2) : w(ling) * 2; // 月令加倍
    pillars.dz.forEach(function (z, i) {
      if (i === 1) return;
      s += w(DZ_ELEM[z]) * 0.75;
    });
    pillars.tg.forEach(function (g, i) {
      if (i === 2) return;
      s += w(TG_ELEM[g]) * 1;
    });
    var shen = s >= 1 ? "强" : (s <= -1 ? "弱" : "中");
    return { score: Math.round(s * 100) / 100, shen: shen };
  }

  // 用神(简化扶抑): 身弱->印+比劫(生我同我); 身强->食伤+财+官杀(我生我克克我); 中和->先比劫
  function yongShen(dayGan) {
    var de = TG_ELEM[dayGan];
    var gen = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
    var ke = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
    var rev = {}; ELEM.forEach(function (e) { rev[gen[e]] = e; }); // 我生->生我
    var revKe = {}; ELEM.forEach(function (e) { revKe[ke[e]] = e; });
    return { de: de, shengWo: rev[de], biJie: de, xie: gen[de], hao: ke[de], keWo: revKe[de] };
  }

  // 神煞
  function shenSha(dayGz, yearZ) {
    var d = dayGz[0], dz = dayGz[1];
    var out = [];
    var tianyi = { 甲: "丑未", 戊: "丑未", 己: "子申", 乙: "子申", 丙: "亥酉", 丁: "亥酉", 壬: "卯巳", 癸: "卯巳", 庚: "寅午", 辛: "寅午" };
    if (tianyi[d] && tianyi[d].indexOf(dz) >= 0) out.push("天乙贵人");
    var wc = { 申: "酉", 子: "酉", 辰: "酉", 寅: "卯", 午: "卯", 戌: "卯", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" };
    if (wc[yearZ] === dz || wc[dz] === dz && wc[dayGz[1]] === dz) { /* 咸池按年支/日支 */ }
    if (wc[yearZ] === dz) out.push("桃花");
    var ma = { 申: "寅", 子: "寅", 辰: "寅", 寅: "申", 午: "申", 戌: "申", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };
    if (ma[yearZ] === dz) out.push("驿马");
    var gai = { 申: "辰", 子: "辰", 辰: "辰", 寅: "戌", 午: "戌", 戌: "戌", 巳: "丑", 酉: "丑", 丑: "丑", 亥: "未", 卯: "未", 未: "未" };
    if (gai[yearZ] === dz) out.push("华盖");
    var wen = { 甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" };
    if (wen[d] === dz) out.push("文昌");
    var jiang = { 申: "子", 子: "子", 辰: "子", 寅: "午", 午: "午", 戌: "午", 巳: "酉", 酉: "酉", 丑: "酉", 亥: "卯", 卯: "卯", 未: "卯" };
    if (jiang[yearZ] === dz || jiang[dz] === dz) out.push("将星");
    var ren = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };
    if (ren[d] === dz) out.push("羊刃");
    // 空亡(旬空)
    var gi = gzIdx(dayGz);
    var xun = Math.floor(gi / 10);
    var kong = [["戌", "亥"], ["申", "酉"], ["午", "未"], ["辰", "巳"], ["寅", "卯"], ["子", "丑"]][xun];
    var all = [pillars0.dz[0], pillars0.dz[1], pillars0.dz[2], pillars0.dz[3]];
    if (all.indexOf(kong[0]) >= 0 || all.indexOf(kong[1]) >= 0) out.push("空亡(" + kong.join("") + ")");
    return out;
  }
  var pillars0 = null; // shenSha 内部引用, 由 paipan 设置

  // 五虎遁: 年干->正月天干
  function wuHu(yearGan) { return [2, 4, 6, 8, 0][TG.indexOf(yearGan) % 5]; }
  // 五鼠遁: 日干->子时天干
  function wuShu(dayGan) { return [0, 2, 4, 6, 8][TG.indexOf(dayGan) % 5]; }

  // 技能模板
  var SKILL = {
    "比肩": ["同行分身", "复制一个自己的影子并肩作战,分摊压力"],
    "劫财": ["夺宝奇兵", "从竞争者手中截取资源,代价是自身消耗"],
    "食神": ["万物滋养", "持续回血并把积累缓慢转化为收益"],
    "伤官": ["灯下判词", "精准挑错,命中后敌方规则护盾失效"],
    "正财": ["劈薪聚金", "用纪律处理现成资源,稳定产出"],
    "偏财": ["点石成金", "把成型的方法一次性炼成横财"],
    "正官": ["名分之缚", "获得名分与契约加持,同时被规则束缚"],
    "七杀": ["绝境反扑", "血量越低伤害越高,压力直接兑换成爆发"],
    "正印": ["青灯护体", "回血减伤,免疫正面质疑"],
    "偏印": ["青灯悟道", "参悟偏门学问,吸收非主流攻击转为己用"]
  };
  var POSITION = { "比肩": "战士", "劫财": "掠夺者", "食神": "辅助", "伤官": "法师", "正财": "射手", "偏财": "刺客", "正官": "坦克", "七杀": "刺客", "正印": "法师", "偏印": "法师" };

  function tenGodOfBranches(dayGan, z) {
    return HIDDEN[z].split("").map(function (g) { return shiShen(dayGan, g); });
  }

  // ============ 主入口 ============
  // input: {y,m,d,hh,mm, gender:"male"|"female", cal:"solar"|"lunar", leap:bool,
  //         school:{yearBound:"lichun"|"lunarnew", ziTime:"today"|"tomorrow", tz:"bjt"|"ts", lon:120,
  //                 monthRule:"jieqi"|"lunar"}}
  function paipan(input) {
    var sc = input.school || {};
    var lon = (typeof sc.lon === "number" ? sc.lon : 120);
    var yy = input.y, mm = input.m, dd = input.d, hh = input.hh, mi = input.mm;

    // 时区: 真太阳时 = 北京时间 - (120-经度)*4 分 (简化, 不加均时差)
    var tzNote = "";
    if (sc.tz === "ts") {
      var diff = Math.round((120 - lon) * 4);
      var t = hh * 60 + mi - diff;
      if (t < 0) t += 1440;
      if (t >= 1440) t -= 1440;
      hh = Math.floor(t / 60); mi = t % 60;
      tzNote = (diff === 0) ? "" : ("真太阳时修正 " + (diff > 0 ? "-" : "+") + Math.abs(diff) + "分");
    }

    // 日期对象
    var S = L.Solar, LU = L.Lunar;
    var solar, lunar;
    if (input.cal === "lunar") {
      lunar = input.leap ? LU.fromYmdHms(yy, mm, dd, hh, mi, 0, true) : LU.fromYmdHms(yy, mm, dd, hh, mi, 0);
      solar = lunar.getSolar();
    } else {
      solar = S.fromYmdHms(yy, mm, dd, hh, mi, 0);
      lunar = solar.getLunar();
    }

    var ec = lunar.getEightChar();
    var yearGz = (sc.yearBound === "lunarnew") ? lunar.getYearInGanZhi() : ec.getYear();
    var monthGz = ec.getMonth();
    var dayGz = ec.getDay();

    // 晚子时(23:00-23:59)
    var ziNote = "";
    if (hh >= 23) {
      if (sc.ziTime === "tomorrow") {
        var tmr = S.fromYmdHms(solar.getYear(), solar.getMonth(), solar.getDay() + 1, 0, 0, 0);
        dayGz = tmr.getLunar().getEightChar().getDay();
        ziNote = "晚子时:日柱取次日";
      } else {
        ziNote = "晚子时:日柱取当日";
      }
    }
    var dayGan = dayGz[0];
    var hourGz;
    if (hh >= 23) {
      var ziGanIdx = wuShu(sc.ziTime === "tomorrow" ? dayGan : dayGan); // 次日派dayGan已是次日
      hourGz = TG[ziGanIdx] + "子";
    } else {
      hourGz = ec.getTime();
    }

    // 月柱: 农历流派(按农历月配干支, 闰月沿用前月)
    var monthNote = "";
    if (sc.monthRule === "lunar") {
      var lm = lunar.getMonth();
      var isLeap = lunar.getMonth() < 0;
      var eff = Math.abs(lm);
      if (isLeap) { eff = eff - 1 === 0 ? 12 : eff - 1; monthNote = "农历月柱(闰月沿用前月)"; }
      else monthNote = "农历月柱";
      var branch = (eff + 1) % 12; // 1月->寅(2)
      var stem = (wuHu(yearGz[0]) + eff - 1) % 10;
      monthGz = TG[stem] + DZ[branch];
    }

    var pillars = {
      tg: [yearGz[0], monthGz[0], dayGan, hourGz[0]],
      dz: [yearGz[1], monthGz[1], dayGz[1], hourGz[1]]
    };
    pillars0 = pillars;
    var gz = [yearGz, monthGz, dayGz, hourGz];

    // 十神(天干 + 地支本气/藏干)
    var ssTg = pillars.tg.map(function (g) { return shiShen(dayGan, g); });
    ssTg[2] = "日主";
    var ssZz = pillars.dz.map(function (z) { return tenGodOfBranches(dayGan, z); });

    // 大运
    var yun = ec.getYun(input.gender === "male" ? 1 : 0);
    var daYun = yun.getDaYun().filter(function (d) { return d.getGanZhi(); }).slice(0, 8).map(function (d, i) {
      return {
        gz: d.getGanZhi(),
        startAge: yun.getStartYear() + i * 10,
        startYear: 1900 + 0 + (solar.getYear() + yun.getStartYear() + Math.round(yun.getStartMonth() / 12) - (solar.getYear() - 1900) - (solar.getYear() - 1900)) // placeholder, 下方修正
      };
    });
    // 修正起运年: 出生年+起运岁
    var baseYear = (input.cal === "lunar" ? lunar.getYear() : solar.getYear());
    daYun.forEach(function (d, i) {
      d.startAge = yun.getStartYear() + i * 10;
      d.startYear = baseYear + yun.getStartYear() + i * 10;
    });

    // 流年(立春界) 近8年
    var thisYear = (new Date()).getFullYear();
    var liuNian = [];
    for (var y = thisYear; y < thisYear + 8; y++) {
      var g = S.fromYmd(y, 6, 15).getLunar().getYearInGanZhiByLiChun();
      liuNian.push({ year: y, gz: g, ss: shiShen(dayGan, g[0]) });
    }

    // 神煞
    var ss = shenSha(dayGz, pillars.dz[0]);

    // 五行/旺衰/用神
    var wx = wuXing(pillars);
    var ws = wangShuai(dayGan, pillars);
    var ys = yongShen(dayGan);

    // 格局(月令本气, 简化)
    var monthMain = HIDDEN[pillars.dz[1]][0];
    var ge = shiShen(dayGan, monthMain);

    // 纳音
    var ny = gz.map(nayin);

    return {
      input: input,
      notes: [tzNote, ziNote, monthNote].filter(Boolean),
      solar: solar.toYmdHms(),
      lunar: lunar.toString(),
      pillars: pillars, gz: gz,
      shiShenTg: ssTg, shiShenZz: ssZheng(ssZz),
      nayin: ny,
      wuXing: wx, wangShuai: ws, yongShen: ys, ge: ge,
      qiYun: yun.getStartYear() + "年" + yun.getStartMonth() + "个月",
      daYun: daYun, liuNian: liuNian, shenSha: ss,
      dayGan: dayGan
    };
  }
  function ssZheng(zss) { return zss; }

  // 规则映射 -> 给模型的游戏字段
  function gameFields(p) {
    var dayGan = p.dayGan;
    var sk = SKILL[p.ge] || SKILL["食神"];
    var skills = p.gz.map(function (g, i) {
      var posName = ["年柱·先天", "月柱·社会", "日柱·自身", "时柱·成果"][i];
      var dom = p.shiShenTg[i] === "日主" ? p.shiShenZz[i][0] : p.shiShenTg[i];
      var s = SKILL[dom] || SKILL["食神"];
      return { pos: posName, name: s[0], desc: s[1], god: dom, gz: g };
    });
    var wx = p.wuXing;
    var panel = ELEM.map(function (e) {
      var v = Math.min(5, Math.round(wx[e] * 1.25 * 2) / 2);
      return { elem: e, val: Math.max(0.5, v), raw: wx[e] };
    });
    return {
      title: "守夜" + TG_ELEM[dayGan] + "客",
      position: POSITION[p.ge] || "法师",
      school: p.ge + "·" + (p.wangShuai.shen === "弱" ? "扶弱" : "抑强") + "流",
      skills: skills,
      panel: panel,
      yongShen: [p.yongShen.shengWo, p.yongShen.biJie],
      jiShen: [p.yongShen.keWo, p.yongShen.hao],
      mo: [{ name: "溺水者", god: "七杀", fix: "把焦虑写成方法论" }, { name: "镀金手", god: "偏财", fix: "止盈止损写死不改" }]
    };
  }

  return { paipan: paipan, gameFields: gameFields, shiShen: shiShen, TG: TG, DZ: DZ };
});

// fate.js —— 命格身份映射层: 八字盘 → 四象命格 / 人格原型 / 六项属性 / 天赋 / 盲区 / 修行方向 / 命格编号
// 纯函数、零随机、同输入必同输出。浏览器挂 global.Fate,node 下 module.exports。
// 输入: paipan.js 的输出 p (需含 gz/shiShenTg/shiShenZz/wuXing/wangShuai/ge/yongShen/shenSha)
(function (global) {
  "use strict";

  var ATTRS = ["洞察", "行动", "意志", "判断", "适应", "创造"];

  // ---- 四象: 月支五行定象(提纲), 土月回落日主, 再回落最强非土 ----
  var ZHI_ELE = { 寅: "木", 卯: "木", 巳: "火", 午: "火", 申: "金", 酉: "金", 亥: "水", 子: "水" };
  var GAN_ELE = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
  var Xiang = {
    玄武: { name: "玄武", dir: "北", ele: "水", line: "北方水象:先沉住,再出手。" },
    青龙: { name: "青龙", dir: "东", ele: "木", line: "东方木象:向光而生,一直在长。" },
    白虎: { name: "白虎", dir: "西", ele: "金", line: "西方金象:干净利落,一击见底。" },
    朱雀: { name: "朱雀", dir: "南", ele: "火", line: "南方火象:自带声量,先点燃再蔓延。" }
  };
  var ELE_XIANG = { 水: "玄武", 木: "青龙", 金: "白虎", 火: "朱雀" };

  // ---- 人格原型 10 套 ----
  var PERSONAS = ["谋士", "将星", "游侠", "隐士", "商贾", "医者", "修士", "术士", "智者", "开拓者"];
  var P_DESC = {
    谋士: "擅长观察、判断、布局和等待窗口。",
    将星: "在混乱里负责拍板,天生带队的节奏感。",
    游侠: "重视自由、行动和探索,不喜欢被固定轨道拴住。",
    隐士: "倾向独立思考和深度研究,独处时效率最高。",
    商贾: "对价值和交换敏感,擅长把手里的资源盘活。",
    医者: "先照顾人,再处理事,天然的稳定器。",
    修士: "习惯向内用功,把日常过成长期的功课。",
    术士: "偏爱旁人没走过的路,擅长用非常规办法解决常规问题。",
    智者: "追问到底才肯罢休,擅长把复杂的事说清楚。",
    开拓者: "倾向主动进入未知领域,先开枪后瞄准也能打中。"
  };
  // 打分权重: e=五行(命中命局前二才计), g=十神组计数×权重, s=神煞命中, geju=格局
  var P_W = {
    谋士:   { e: { 金: 2, 水: 1 }, g: { 官杀: 2, 食伤: 1 }, s: { 华盖: 1 } },
    将星:   { e: { 火: 2 },        g: { 官杀: 3, 比劫: 1 }, s: { 将星: 3 }, geju: { 七杀: 3, 正官: 2 } },
    游侠:   { e: { 木: 2 },        g: { 食伤: 2, 比劫: 2 }, geju: { 劫财: 2 } },
    隐士:   { e: { 水: 1 },        g: { 偏印: 2 },          s: { 华盖: 3, 空亡: 1 } },
    商贾:   { e: { 土: 1, 金: 2 }, g: { 财: 3 },            geju: { 正财: 2, 偏财: 3 } },
    医者:   { e: { 木: 2 },        g: { 正印: 2, 食神: 2 }, geju: { 食神: 3 } },
    修士:   { e: { 水: 1 },        g: { 偏印: 2 },          s: { 华盖: 2, 空亡: 2 }, geju: { 偏印: 3 } },
    术士:   { e: { 火: 1 },        g: { 伤官: 3, 偏印: 2 }, geju: { 伤官: 3 } },
    智者:   { e: { 水: 1, 木: 1 }, g: { 正印: 3 },          geju: { 正印: 3 } },
    开拓者: { e: { 木: 1, 火: 1 }, g: { 比劫: 3, 财: 1 },   geju: { 比肩: 3 } }
  };

  // ---- 属性: base + 五行 + 十神 + 旺衰/神煞, clamp 0..100 ----
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

  var TALENT = {
    洞察: "你更容易发现别人忽略的细节,并倾向于先观察,再做判断。",
    行动: "你进入状态很快,别人还在讨论时,你已经试过一轮了。",
    意志: "风向变了你也稳得住,一旦定下方向,很少被话术带偏。",
    判断: "你习惯把事情放在规则和标准上衡量,取舍比多数人干脆。",
    适应: "换环境你适应得快,规则变了你能重新找到自己的位置。",
    创造: "你总能给出不一样的解法,同样的材料到你手里能拼出新东西。"
  };
  var P_CLOSE = {
    谋士: "放到你的命格里,这份能力最终会变成一步落子。",
    将星: "配上你命里的将星底子,它会在需要有人拍板时先站出来。",
    游侠: "你的游侠底色让它不困在原地,越走越准。",
    隐士: "你的隐士倾向让它在独处时更清晰,人多时反而要刻意留白。",
    商贾: "你的商贾底色让它最后总能换成实实在在的收获。",
    医者: "你的医者底色让它先照顾到人,再处理事。",
    修士: "你的修士底色让它越用越沉,像每天都在给内里添柴。",
    术士: "你的术士底色让它偏爱旁人没走过的那条路。",
    智者: "你的智者底色让它不停追问,直到把道理说通。",
    开拓者: "你的开拓者底色让它总往没去过的地方探。"
  };
  var BLIND = {
    洞察: ["过度思考", "信息不足时,你可能倾向于继续分析,而不是先采取行动。"],
    行动: ["走得太快", "冲起来之后,你可能来不及回头看队友有没有跟上。"],
    意志: ["太过扛事", "该换方向的时候,你可能因为已经投入太多而迟迟不放手。"],
    判断: ["标准太硬", "规则清楚时你最稳;遇到没有标准答案的事,容易先替别人扣分。"],
    适应: ["太容易将就", "你能迅速适应环境,也可能因此在不合适的位置上待得过久。"],
    创造: ["想法太多", "新点子一个接一个,收尾的活可能被留在半路上。"]
  };
  var JI_LINE = {
    水: "水一旺,注意力容易被夜里的事和情绪带走。",
    木: "木一旺,外部压力一上来,你容易选择硬顶。",
    火: "火一旺,容易上头抢着表态。",
    金: "金一旺,容易抠进细节,忘了原本要什么。",
    土: "土一旺,容易守在熟悉的圈子里不动。"
  };
  var DIR = {
    洞察: ["从看遍全局,到盯住一处。", "今天挑一件事,写下你注意到、但别人没提的一个细节。"],
    行动: ["从想清楚,到做起来。", "遇到一个小决定时,不要继续搜索更多信息,给自己60秒直接做出选择。"],
    意志: ["从硬扛到底,到会拐弯。", "一件卡住的事,今天换个方法再试一次,不靠加时间硬顶。"],
    判断: ["从非黑即白,到容下灰色。", "对一个你不喜欢的做法,先写出它的一条合理之处,再下结论。"],
    适应: ["从随境而变,到选定立场。", "在一个你习惯迁就的场合,今天明确说出一次自己的偏好。"],
    创造: ["从不停开坑,到收一个尾。", "挑一个半成品,今天把它做到能交出去的程度。"]
  };
  var HIDDEN = {
    洞察: ["观察者", "你往往比别人更早发现变化,只是不一定会第一时间说出来。"],
    行动: ["先手", "机会出现时你本能地先动一步,很多时候这一步就是差距。"],
    意志: ["定盘星", "局势乱的时候,你身边的人会不自觉地看你有没有慌。"],
    判断: ["秤杆", "别人纠结时,你能在心里很快称出轻重,只是常忍着不说。"],
    适应: ["随形", "进新环境你几乎不用热身,总能先站稳再图发展。"],
    创造: ["火花", "你脑子里同时亮着好几个念头,只是在等一个把它们串起来的理由。"]
  };
  var LEVELS = [[1, "初识"], [10, "入门"], [20, "观心"], [30, "修行"], [40, "明悟"], [50, "化境"]];

  function countGods(p) {
    var c = { 比肩: 0, 劫财: 0, 食神: 0, 伤官: 0, 正财: 0, 偏财: 0, 正官: 0, 七杀: 0, 正印: 0, 偏印: 0, 日主: 0 };
    var add = function (g) { if (g && c[g] !== undefined) c[g]++; };
    (p.shiShenTg || []).forEach(add);
    (p.shiShenZz || []).forEach(function (a) { (a || []).forEach(add); });
    c.官杀 = c.正官 + c.七杀;
    c.财 = c.正财 + c.偏财;
    c.比劫 = c.比肩 + c.劫财;
    c.印 = c.正印 + c.偏印;
    c.食伤 = c.食神 + c.伤官;
    return c;
  }

  function shenShaFlag(p) {
    var s = (p.shenSha || []).join("|");
    return { 华盖: s.indexOf("华盖") >= 0, 空亡: s.indexOf("空亡") >= 0, 将星: s.indexOf("将星") >= 0, 桃花: s.indexOf("桃花") >= 0 };
  }

  function pillarsOf(p) {
    if (Array.isArray(p.gz) && p.gz.length === 4) return p.gz;
    if (p.pillars && p.pillars.tg) return [0, 1, 2, 3].map(function (i) { return p.pillars.tg[i] + p.pillars.dz[i]; });
    return [];
  }

  function xiangOf(p) {
    var gz = pillarsOf(p);
    var monthZhi = gz[1] ? gz[1].charAt(1) : "";
    var ele = ZHI_ELE[monthZhi];
    if (!ele) { // 土月
      var dg = p.dayGan || "";
      ele = GAN_ELE[dg];
      if (!ele || ele === "土") {
        var w = p.wuXing || {}, best = null, bv = -1;
        ["木", "火", "金", "水"].forEach(function (e) { if ((w[e] || 0) > bv) { bv = w[e] || 0; best = e; } });
        ele = best || "水";
      }
    }
    return Xiang[ELE_XIANG[ele] || "玄武"];
  }

  function personaOf(p) {
    var c = countGods(p), sf = shenShaFlag(p), w = p.wuXing || {};
    var order = Object.keys(w).sort(function (a, b) { return (w[b] || 0) - (w[a] || 0); }).slice(0, 2);
    var best = PERSONAS[0], bv = -1;
    PERSONAS.forEach(function (name) {
      var wt = P_W[name], v = 0;
      Object.keys(wt.e || {}).forEach(function (e) {
        var i = order.indexOf(e);
        if (i === 0) v += wt.e[e] * 2; else if (i === 1) v += wt.e[e];
      });
      Object.keys(wt.g || {}).forEach(function (g) { v += (c[g] || 0) * wt.g[g]; });
      Object.keys(wt.s || {}).forEach(function (k) { if (sf[k]) v += wt.s[k]; });
      if (wt.geju && p.ge && wt.geju[p.ge]) v += wt.geju[p.ge];
      if (v > bv) { bv = v; best = name; } // 并列取 PERSONAS 固定顺序靠前者 → 稳定
    });
    return best;
  }

  function attrsOf(p) {
    var w = p.wuXing || {}, c = countGods(p), sf = shenShaFlag(p);
    var score = (p.wangShuai && p.wangShuai.score) || 0;
    var E = function (e) { return w[e] || 0; };
    var a = {
      洞察: 40 + E("水") * 6 + E("金") * 3 + c.印 * 4 + (sf.华盖 ? 3 : 0) + (sf.空亡 ? 3 : 0),
      行动: 40 + E("火") * 5 + E("木") * 4 + c.比劫 * 4 + c.食伤 * 3,
      意志: 40 + E("土") * 6 + c.官杀 * 4 + (score > 0 ? 8 : score < -2 ? 1 : 3),
      判断: 40 + E("金") * 6 + c.官杀 * 4 + c.财 * 2,
      适应: 40 + E("水") * 4 + E("木") * 3 + c.财 * 3 + c.食伤 * 2,
      创造: 40 + E("火") * 5 + E("木") * 3 + c.食伤 * 5 + c.偏印 * 2
    };
    var out = {};
    ATTRS.forEach(function (k) { out[k] = clamp(a[k]); });
    return out;
  }

  function code(p) {
    var sc = (p.input && p.input.school) || {};
    var raw = [pillarsOf(p).join(""), p.solar || "", p.ge || "", p.dayGan || "",
      [sc.yearBound, sc.ziTime, sc.monthRule, Math.round((sc.lon || 0) * 10) / 10].join("|")
    ].join("/");
    var h = 0x811c9dc5;
    for (var i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return "TJ-" + ("0000" + h.toString(16).toUpperCase()).slice(-4);
  }

  function fate(p) {
    var attrs = attrsOf(p);
    var ranked = ATTRS.map(function (k) { return [k, attrs[k]]; })
      .sort(function (a, b) { return b[1] - a[1] || ATTRS.indexOf(a[0]) - ATTRS.indexOf(b[0]); });
    var top1 = ranked[0][0], top2 = ranked[1][0], low = ranked[ranked.length - 1][0];
    var ji = (p.yongShen && p.yongShen.hao) || "水";
    var ji2 = (p.yongShen && p.yongShen.keWo) || "木";
    var persona = personaOf(p), xiang = xiangOf(p);
    return {
      code: code(p),
      xiang: xiang,                       // 四象命格
      persona: persona,                   // 人格原型
      personaDesc: P_DESC[persona],
      attrs: attrs,
      ranked: ranked,
      attrList: ranked,   // [[属性,分],...] 降序, 前端卡面/分享图直接用
      keywords: [ranked[0][0], ranked[1][0], ranked[2][0]],
      talents: [
        ranked[0][0] + " · " + TALENT[ranked[0][0]] + P_CLOSE[persona],
        ranked[1][0] + " · " + TALENT[ranked[1][0]] + P_CLOSE[persona],
        ranked[2][0] + " · " + TALENT[ranked[2][0]]
      ],
      blind: {
        title: BLIND[top1][0],
        desc: BLIND[top1][1] + JI_LINE[ji] + JI_LINE[ji2]
      },
      practice: { dir: DIR[low][0], today: DIR[low][1] },
      hidden: { name: HIDDEN[top2][0], desc: HIDDEN[top2][1] + P_CLOSE[persona] },
      level: "Lv.01 初识",
      levelNum: 1,
      wuxing: p.wuXing
    };
  }

  var api = { fate: fate, ATTRS: ATTRS, PERSONAS: PERSONAS, Xiang: Xiang, LEVELS: LEVELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Fate = api;
})(this);

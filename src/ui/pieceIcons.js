// マスに置いた駒のアイコン（16×16 のドット絵）。-20〜20 の箱に描く。
// 方針：キャラは「その駒そのもの」（人・獣・機械）を描き、元の絵文字のモチーフを持たせる。道具は物だけを描く。
// かっこよく・顔は無理につけない。
// 用意のない駒（自作駒など）は null を返し、呼ぶ側が絵文字で描く。
const PALETTE = {
  k: '#1a1c2c', // ふちどり
  w: '#f4f4f4', g: '#94b0c2', s: '#566c86', // 白・鋼・暗い鋼
  y: '#ffcd75', o: '#ef7d57', r: '#b13e53', // 金・橙・赤
  b: '#3b5dc9', c: '#41a6f6', p: '#8a4fd1', // 青・水色・紫
  G: '#38b764', d: '#257179', l: '#a7f070', // 緑・暗い緑・黄緑
  n: '#8a5a3c', t: '#c28569', // 茶・明るい茶
  f: '#f0c8a0', P: '#5d275d', // 肌・暗い紫
  a: '#333c57', e: '#73eff7', u: '#29366f', // 暗い灰・明るい水色・紺
};

// ---- 土台（体形をそろえる）。H=髪・かぶと F=肌 B=服 L=脚 を色の文字に置きかえ、上から描き足す（'.' は透明）----
const HUMAN = [
  '................',
  '....kkkkk.......',
  '...kHHHHHk......',
  '..kHHHHHHHk.....',
  '..kHFFFFFHk.....',
  '..kFkFFkFFk.....',
  '..kFFFFFFFk.....',
  '...kFFFFFk......',
  '..kkBBBBBkk.....',
  '.kBBBBBBBBBk....',
  '.kFkBBBBBkFk....',
  '.kkkBBBBBkkk....',
  '...kBBBBBk......',
  '...kLLkLLk......',
  '...kLLkLLk......',
  '...kkkkkkk......',
];
// 術師：下がローブ
const MAGE = [...HUMAN.slice(0, 12), '..kBBBBBBBk.....', '..kBBBBBBBk.....', '.kBBBBBBBBBk....', '.kkkkkkkkkkk....'];
// 四つ足の獣（左向き）。A=体 D=影
const QUAD = [
  '................',
  '................',
  '................',
  '..kk..k.........',
  '.kAAkkAk........',
  'kAAAAAAAkkkkkk..',
  'kAkAAAAAAAAAAAk.',
  'kAAAAAAAAAAAAAAk',
  '.kkAAAAAAAAAAAAk',
  '...kDDDDDDDDDDDk',
  '...kDDDDDDDDDDk.',
  '...kAAkkkkkDDDk.',
  '...kAAk...kDDk..',
  '...kAAk...kDDk..',
  '...kAAk...kDDk..',
  '...kkkk...kkkk..',
];
// 土台の文字を色に置きかえ、over（行番号 → 上描きの行）を重ねる
function build(base, map, over = {}) {
  return base.map((row, y) => {
    const out = [...row].map((ch) => map[ch] ?? ch);
    [...(over[y] ?? '')].forEach((ch, x) => { if (ch !== '.') out[x] = ch; });
    return out.join('');
  });
}
const human = (map, over) => build(HUMAN, { F: 'f', ...map }, over);
const mage = (map, over) => build(MAGE, { F: 'f', ...map }, over);
const quad = (A, D, over) => build(QUAD, { A, D }, over);
// とんがり帽子（色 c）を over の上の5行に足す
function withHat(c, over = {}) {
  const hat = ['......kk', '.....kXXk', '....kXXXXk', '...kXXXXXXk', '.kXXXXXXXXXk'].map((r) => r.replace(/X/g, c));
  const out = { ...over };
  hat.forEach((r, y) => {
    const row = [...r.padEnd(16, '.')];
    [...(over[y] ?? '')].forEach((ch, x) => { if (ch !== '.') row[x] = ch; });
    out[y] = row.join('');
  });
  return out;
}
// 柄（つか・杖）：決まった列に、縦に1文字ずつ
const staff = (rows, col, ch) => Object.fromEntries(rows.map((y) => [y, '.'.repeat(col) + ch]));

const SPRITES = {
  // ---- 戦士 ----
  // 見習い剣士 🗡️：短剣を構えた若い剣士
  c_squire: [
    '............kk..',
    '....kkkkk..kwk..',
    '...knnnnnk.kwk..',
    '..knnnnnnnkkwk..',
    '..knfffffnkkwk..',
    '..kfkffkffkkwk..',
    '..kfffffffkkwk..',
    '...kfffffkkyyyk.',
    '..kkbbbbbkkknk..',
    '.kbbbbbbbbbfk...',
    '.kfkbbbbbkkk....',
    '.kkkbyyybk......',
    '...kbbbbbk......',
    '...ksskssk......',
    '...ksskssk......',
    '...kkkkkkk......',
  ],
  // 騎士 🤺：細身の剣を突き出す、鎧の騎士
  c_knight: human({ H: 'g', F: 'g', B: 'g', L: 's' }, { 0: '......krk', 4: '..kgggggggk', 5: '..kgkkkkkgk....w', 6: '..kgggggggk...w', 7: '...kgggggk...w', 8: '............w', 9: '...........w', 10: '............y' }),
  // 狂戦士 🪓：大斧をかついだ、赤髪の戦士
  c_berserker: human({ H: 'r', B: 't', L: 'n' }, { 0: '....r.r.r', 2: '............kkk', 3: '...........kngwk', 4: '...........kngwk', 5: '...........kngwk', 6: '...........knkkk', 7: '...........knk', 8: '...........knk', 9: '...........knk', 10: '...........knk', 11: '............k' }),
  // 聖騎士 ⚜️：ユリの紋章の旗印を掲げた、白い鎧の騎士
  c_paladin: human({ H: 'y', B: 'w', L: 'g' }, { ...staff([4, 5, 6, 7, 8, 12], 13, 'y'), 0: '.............y', 1: '...........y.y.y', 2: '...........y.y.y', 3: '............yyy', 9: '......y......y', 10: '.....yyy.....y', 11: '......y......y' }),
  // 剣聖 🥷：刀を構えた忍び
  c_swordmaster: human({ H: 'a', B: 'a', L: 'a' }, { 1: '............k', 2: '...........kwk', 3: '...........kwk', 4: '..kaaaaaaakkwk', 5: '...........kwk', 6: '..kaaaaaaakkwk', 7: '...kaaaaak.kwk', 8: '..krrrrrrrkkwk', 9: '...........yyy' }),
  // 重装兵 🪖：鉄かぶとと大盾の兵
  c_guard: human({ H: 'G', B: 's', L: 's' }, { 1: '...kkkkkkk', 2: '..kGGGGGGGk', 3: '.kGGGGGGGGGk', 4: '.kdddddddddk', 7: '........kkkkkkk', 8: '........kgggggk', 9: '........kgyyygk', 10: '........kgyyygk', 11: '........kgggggk', 12: '........kgggggk', 13: '.........kgggk', 14: '..........kkk' }),
  // 竜騎士 🐉：竜にまたがった騎士
  c_dragoon: [
    '................',
    '.......kkk......',
    '......kgggk.....',
    '......kgkgk.....',
    '.kk...kgggk.kk..',
    'kGGk.kkbbbkkGGk.',
    'kGyGkkbbbbbkGGGk',
    'kGGGGGkbbbkGGGGk',
    '.kkGGGGkkkGGGGk.',
    '.wkGGGGGGGGGGGk.',
    '...kdGGGGGGGGdk.',
    '...kddGGGGGGddkk',
    '...kGGkkkkkGGkGk',
    '...kGGk...kGGkGk',
    '...kGGk...kGGkk.',
    '...kkkk...kkkk..',
  ],
  // 将軍 👑：王冠をかぶり、剣を掲げた将
  c_general: human({ H: 'n', B: 'r', L: 'u' }, { 0: '....y.y.y...k', 1: '....yyyyy..kwk', 2: '...........kwk', 3: '...........kwk', 4: '...........kwk', 5: '...........kwk', 6: '...........kwk', 7: '..........kyyyk', 8: '..yy.....yy.n', 10: '......y' }),

  // ---- 魔導 ----
  // 見習い魔導士 🔮：水晶玉を持った見習い
  c_apprentice: mage({ H: 'n', B: 'c' }, withHat('c', { 6: '...........kkk', 7: '..........kpwpk', 8: '..........kpppk', 9: '...........kkk' })),
  // 魔女 🧹：ほうきを持った魔女
  c_witch: mage({ H: 'o', B: 'P' }, withHat('p', { ...staff([1, 2, 3, 4, 5, 6, 7, 8, 9], 13, 'n'), 10: '...........kyyyk', 11: '...........kyyyk', 12: '...........kyyyk', 13: '...........kkkkk' })),
  // 預言者 👁️：目の紋章を浮かべた、白いフードの術師
  c_oracle: mage({ H: 'w', B: 'w' }, { 1: '....kkkkk.kkkkk', 2: '.........kwwcwwk', 3: '.........kwckcwk', 4: '.........kwwcwwk', 5: '..........kkkkk', 9: '......y', 12: '........gg', 13: '........gg', 14: '.........gg' }),
  // 呪詛師 💀：どくろの面をつけた、フードの術師
  c_cursemaster: [
    '................',
    '.....kkkkkk.....',
    '....kppppppk....',
    '...kpppppppPk...',
    '...kpkkkkkkPk...',
    '..kpkwwwwwwkPk..',
    '..kpkwkwwkwkPk..',
    '..kpkwwwwwwkPk..',
    '..kppkwkwkkpPk..',
    '..kpppkkkkppPk..',
    '.kppppppppppPk..',
    '.kpppypppppPPk..',
    '.kppyyypppppPPk.',
    '.kpppypppppPPPk.',
    '.kppppppppPPPPPk',
    '.kkkkkkkkkkkkkkk',
  ],
  // 雷術師 ⚡：いなずまを掲げた、とんがり帽子の術師
  c_sorcerer: [
    '.....kk.....kk..',
    '....kbbk...kyk..',
    '....kbbk..kyk...',
    '...kbbbbk.kyykk.',
    '..kkbbbbkk.kkyk.',
    '.kbbbbbbbbk.kyk.',
    '..kkffffkk.kyk..',
    '...kfkfkfk.kk...',
    '...kffffk.kfk...',
    '..kkbbbbkkbk....',
    '.kbbbybbbbk.....',
    '.kfkbybbk.......',
    '.kkkbbbbk.......',
    '..kbbbbbbk......',
    '..kbbbbbbk......',
    '..kkkkkkkk......',
  ],
  // 呪術師 🧪：毒の薬びんを持った、緑のフードの術師
  c_hexer: mage({ H: 'G', B: 'd' }, { 4: '..kGGGGGGGk', 5: '...........kkk', 6: '...........kwk', 7: '..........kwwwk', 8: '..........klllk', 9: '...........kkk' }),
  // 炎術師 🔥：手に炎をともした、赤い帽子の術師
  c_pyromancer: mage({ H: 'n', B: 'r' }, withHat('r', { 4: '............o', 5: '...........oo', 6: '...........oyo', 7: '..........oyyo', 8: '..........oywyo', 9: '...........oyo' })),
  // 大魔導士 🧙：長い杖と白いひげの大魔導士
  c_archmage: mage({ H: 'w', B: 'u' }, withHat('u', { ...staff([3, 4, 5, 10, 11, 12, 13, 14], 13, 'n'), 0: '............kkk', 1: '...........kcwck', 2: '......y.....kkk', 6: '....wwwww....n', 7: '...kwwwwwk...n', 8: '....kwwwk....n', 9: '......w......n' })),

  // ---- 獣 ----
  // 毒蛇 🐍：かま首を上げた蛇
  c_viper: [
    '................',
    '.....kkkkk......',
    '....kGGGGGk.....',
    '...kGykGGGGk....',
    '...kGGGGGGdk....',
    '.rrkkkGGGdk.....',
    'r....kGGdk......',
    '.....kGGdk......',
    '.....kGlGdkkkk..',
    '.....kGGlGGGGdk.',
    '..kkkkkkGlGGGGdk',
    '.kGGGGGGkkkGlGdk',
    'kGlGddGGGGGGGGdk',
    'kGGlGGdddddddddk',
    '.kkGGlGGGGGkkkk.',
    '...kkkkkkkk.....',
  ],
  // 狼 🐺
  c_wolf: quad('g', 's', { 3: '..kk..k.......kk', 4: '.............kgk', 5: '.............kgk', 6: '..y', 8: '.w' }),
  // 鷹 🦅：翼を広げた鷹
  c_hawk: [
    '................',
    '................',
    'k..............k',
    'kk....kkkk....kk',
    'knk..kwwwwk..knk',
    'knnkkwkwwkwkknnk',
    'knnnnkwwyywknnnk',
    '.knnnnkkyykknnnk',
    '.knnnnnnnnnnnnk.',
    '..knnnnnnnnnnk..',
    '...kknnnnnnkk...',
    '.....knnnnk.....',
    '.....knttnk.....',
    '......kttk......',
    '.....kyk.kyk....',
    '................',
  ],
  // 豹 🐆：斑点のある豹
  c_leopard: quad('y', 'o', { 2: '..............kk', 3: '..kk..k......kyk', 4: '.............kyk', 5: '.............kyk', 6: '......n..n..n', 7: '....n..n..n..n', 9: '.....n..n..n' }),
  // 猪 🐗：低く構えた黒い猪（背の剛毛・白い牙・赤い目）
  c_boar: [
    '................',
    '................',
    '................',
    '......k.k.k.k...',
    '...kkkskskskskk.',
    '..kssssssssssssk',
    '.kaaaaaaaaaaaaak',
    'karaaaaaaaaaaaak',
    'kaaaaaaaaaaaaaak',
    'ktaawaaaaaaaaak.',
    '.kkwwaaaaaaaaak.',
    '...kkkaakkkkaak.',
    '....kaak...kaak.',
    '....kaak...kaak.',
    '....kkkk...kkkk.',
    '................',
  ],
  // 熊 🐻：後ろ足で立ち上がり、爪を広げた熊
  c_bear: [
    '...kk......kk...',
    '..knnk....knnk..',
    '..knnkkkkkknnk..',
    '...knnnnnnnnk...',
    '...knknnnnknk...',
    '...knnttttnnk...',
    '...knntkktnnk...',
    '..kknnttttnnkk..',
    '.knnknnnnnnknnk.',
    '.knnknnttnnknnk.',
    '.kwwknttttnkwwk.',
    '..kkknttttnkkk..',
    '....knnnnnnk....',
    '....knnkknnk....',
    '...knnnkknnnk...',
    '...kkkkkkkkkk...',
  ],
  // 獅子 🦁：たてがみの獅子
  c_lion: quad('y', 'o', { 2: '..kkkkkk......kk', 3: '.kooooook....kok', 4: 'kooyyyook....kyk', 5: 'kooyyyyok....kyk', 6: 'koykyyyok', 7: 'kooyyyook', 8: '.kooooook' }),
  // 古の巨獣 🦣：正面から見た巨獣（大きな頭・長い鼻・内に曲がる大牙）
  c_behemoth: [
    '.....kkkkkk.....',
    '...kknnnnnnkk...',
    '..knntttttnnnk..',
    '.knnnttttnnnnnk.',
    'knnnknnnnnnknnnk',
    'knnnnnnnnnnnnnnk',
    'knnkknnnnnnkknnk',
    'kwkk.knnnnk.kkwk',
    'kwk..knnnnk..kwk',
    'kwk..knnnnk..kwk',
    'kwwk.knnnnk.kwwk',
    '.kwwkknnnnkkwwk.',
    '..kkkkknnkkkkk..',
    '..kaak.knnk.kaak',
    '..kaak.knk..kaak',
    '..kkkk..k...kkkk',
  ],

  // ---- 機械 ----
  // 偵察機 🛸
  c_drone: [
    '................',
    '................',
    '......kkkk......',
    '.....kccewk.....',
    '....kcccceck....',
    '..kkkkkkkkkkkk..',
    '.kggggggggggggk.',
    'kgygggygggygggsk',
    '.kssssssssssssk.',
    '..kkkkkkkkkkkk..',
    '.....e....e.....',
    '....e......e....',
    '....e......e....',
    '...e........e...',
    '................',
    '................',
  ],
  // 動力炉 🔋：光る炉心
  c_reactor: [
    '................',
    '.....kkkkkk.....',
    '.....kssssk.....',
    '...kkkkkkkkkk...',
    '...kggggggggk...',
    '...kgkkkkkksk...',
    '...kgkllylksk...',
    '...kgklyylksk...',
    '...kgkyyyyksk...',
    '...kgklyylksk...',
    '...kgklyllksk...',
    '...kgkllllksk...',
    '...kgkkkkkksk...',
    '...kggggggssk...',
    '..kkkkkkkkkkkk..',
    '..kssssssssssk..',
  ],
  // 電磁塔 📡：火花を散らす塔
  c_tesla: [
    '.......kk.......',
    '..y...kcck...y..',
    '...y..kcck..y...',
    '.......kk.......',
    '......kggk......',
    '.....kkggkk.....',
    '....kgggggsk....',
    '.....kkggkk.....',
    '......kgsk......',
    '.....kkggkk.....',
    '....kgggggsk....',
    '.....kkggkk.....',
    '......kgsk......',
    '.....kggssk.....',
    '....kggggssk....',
    '....kkkkkkkk....',
  ],
  // 砲台 🗼：大砲をのせた塔
  c_turret: [
    '................',
    '................',
    '................',
    'kkkkkkk.........',
    'kaaaaaakkkkk....',
    'kaaaaaakggggk...',
    'kkkkkkkkgggggk..',
    '......kgggggssk.',
    '......kkkkkkkkk.',
    '.......kggsk....',
    '.......kggsk....',
    '......kgggssk...',
    '......kgkgksk...',
    '.....kggggsssk..',
    '....kgggggssssk.',
    '....kkkkkkkkkkk.',
  ],
  // ゴーレム 🗿：石の体の巨人（目が光る）
  c_golem: [
    '................',
    '.....kkkkkk.....',
    '....kggggggk....',
    '....kgckkcgsk...',
    '....kggggggsk...',
    '.kkkkkkkkkkkkkk.',
    'kgggkggggggkgggk',
    'kggskgglgggkggsk',
    'kggskggggggkggsk',
    'kgsk.kggggsk.kgk',
    'kgsk.kggggsk.kgk',
    'kkk..kggggsk.kkk',
    '....kggsk.kggsk.',
    '....kggsk.kggsk.',
    '...kgggsk.kgggsk',
    '...kkkkkk.kkkkkk',
  ],
  // 修理ロボ 🔧：スパナを持ったロボ
  c_medibot: human({ H: 'g', F: 'g', B: 'w', L: 's' }, { ...staff([4, 6, 7, 8], 12, 'g'), 0: '......k', 2: '...........g.g', 3: '...........ggg', 5: '....c..c....g', 9: '......G.....g', 10: '.....GGG', 11: '......G' }),
  // 戦闘機 ✈️
  c_fighter: [
    '.......kk.......',
    '......kggk......',
    '......kggk......',
    '.....kgccgk.....',
    '.....kgccgk.....',
    '.....kggggk.....',
    '....kkggggkk....',
    '..kkggggggggkk..',
    'kkggggggggggggkk',
    'kgggsggggggsgggk',
    'kkkkkkggggkkkkkk',
    '.....kggggk.....',
    '....kkgssgkk....',
    '...kggksskggk...',
    '...kkkkookkkk...',
    '.......oo.......',
  ],
  // 修理工房 🏭：煙突のある工房（緑の十字の扉）
  c_workshop: [
    '..........kk....',
    '.....g...kaak...',
    '....g....kaak...',
    '...kk....kaak...',
    '..kaak...kaak...',
    '..kaak.kkkaakkk.',
    '..kaakkrrrrrrrk.',
    '.kkaakrrrrrrrrk.',
    '.krrrrrrrrrrrrk.',
    '.kryyrryyrryyrk.',
    '.kryyrryyrryyrk.',
    '.krrrrrrrrrrrrk.',
    '.krrrrkkkkrrrrk.',
    '.krrrrkGGkrrrrk.',
    '.krrrrkGGkrrrrk.',
    '.kkkkkkkkkkkkkk.',
  ],

  // ---- 中立 ----
  // エルフ 🧝：弓を持った、とがった耳のエルフ
  c_elf: human({ H: 'y', B: 'G', L: 'n' }, { 5: 'kf.........fn', 6: '............wn', 7: '............w.n', 8: '............w.n', 9: '............w.n', 10: '............w.n', 11: '............w.n', 12: '............wn', 13: '............n' }),
  // ドワーフ ⛏️：つるはしをかついだ、ひげのドワーフ
  c_dwarf: human({ H: 's', B: 'n', L: 'a' }, { ...staff([4, 5, 9, 10, 11], 12, 'n'), 2: '..........ggggg', 3: '.........g..n..g', 6: '...ooooooo..n', 7: '....ooooo...n', 8: '.....ooo....n' }),
  // 吸血鬼 🧛：赤い裏地のマントの吸血鬼
  c_vampire: human({ H: 'a', F: 'w', B: 'a', L: 'a' }, { 4: '......a', 5: '....r..r', 7: '.kr..w.w..rk', 8: '.krr.....rrk', 11: '.krk.....krk', 12: '.krk.....krk', 13: '.krk.....krk', 14: '.kkk.....kkk' }),
  // 竜人 🐲：角と尾のある竜の人
  c_dragonkin: human({ H: 'G', F: 'G', B: 'o', L: 'd' }, { 0: '..y.......y', 1: '...y.....y', 5: '....y..y', 6: '....lllll', 9: '.....lll', 10: '.....lll', 12: '..........kGk', 13: '...........kGk', 14: '............kk' }),
  // 魔人 👹：角と金棒の鬼
  c_fiend: human({ H: 'a', F: 'r', B: 'P', L: 'a' }, { 0: '...w.....w', 1: '...w.....w', 3: '...........kkkk', 4: '...........knnk', 5: '....y..y..wknnkw', 6: '...........knnk', 7: '.....w.w..wknnkw', 8: '...........knnk', 9: '............nn' }),

  // ---- 道具（物だけ）----
  // 木の盾 🛡️
  i_shield: [
    '................',
    '..kkkkkkkkkkkk..',
    '.kggggggggggggk.',
    '.kgtttttyynnnsk.',
    '.kgtttttyynnnsk.',
    '.kgtttttyynnnsk.',
    '.kgyyyyyyyyyysk.',
    '.kgyyyyyyyyyysk.',
    '.kgtttttyynnnsk.',
    '.kgtttttyynnnsk.',
    '..kgttttyynnsk..',
    '..kgttttyynnsk..',
    '...kgtttyynsk...',
    '....kgttynsk....',
    '.....kgssk......',
    '......kkk.......',
  ],
  // 歯車 ⚙️
  i_gear: [
    '................',
    '......kkkk......',
    '..kk..kggk..kk..',
    '.kggkkkggkkkggk.',
    '.kgggggggggggsk.',
    '..kgggkkkkgggk..',
    '.kkggk....kgskk.',
    'kggggk....kgsssk',
    'kggggk....kgsssk',
    '.kkggk....kgskk.',
    '..kgggkkkkgssk..',
    '.kggggggggssssk.',
    '.kggkkkgskkkssk.',
    '..kk..kssk..kk..',
    '......kkkk......',
    '................',
  ],
  // 軍旗 🚩
  i_banner: [
    '..kk............',
    '..kykkkkkkkkk...',
    '..knrrrrrrrrrk..',
    '..knrrrryrrrrrk.',
    '..knrrryyyrrrk..',
    '..knrrrryrrrk...',
    '..knrrrrrrrrk...',
    '..knrrrrrrrrrk..',
    '..knkkkkkkkkkk..',
    '..knk...........',
    '..knk...........',
    '..knk...........',
    '..knk...........',
    '..knk...........',
    '..knk...........',
    '..kkk...........',
  ],
  // スタンガン 🔌：電気の走るプラグ
  i_stungun: [
    '....kk....kk....',
    '....kgk..kgk....',
    '....kgk..kgk....',
    '...kkkkkkkkkk...',
    '...kaaaaaaaak...',
    '...kaaayaaaak...',
    '...kaayyaaaak...',
    '...kayyyyaaak...',
    '...kaaayyaaak...',
    '....kaayaaak....',
    '.....kkkkkk.....',
    '......kaak......',
    '......kaak..y...',
    '.....kaak..y.y..',
    '....kaak........',
    '....kkk.........',
  ],
  // 毒瓶 ☠️：どくろの印の毒びん
  i_vial: [
    '................',
    '.....kkkkkk.....',
    '.....knnnnk.....',
    '......kggk......',
    '......kggk......',
    '....kkkggkkk....',
    '...kGGGGGGGGk...',
    '..kGGwwwwwwGGk..',
    '..kGwwkwwkwwGk..',
    '..kGwwwwwwwwGk..',
    '..kGGwwkkwwGGk..',
    '..kGGGwwwwGGGk..',
    '..kGGGGGGGGGGk..',
    '...kGGGGGGGGk...',
    '....kkkkkkkk....',
    '................',
  ],
  // 槍 🔱：三つ又の槍
  i_spear: [
    '...k...kk...k...',
    '..kgk.kwgk.kgk..',
    '..kgk.kwgk.kgk..',
    '..kgk.kwgk.kgk..',
    '..kgkkkwgkkkgk..',
    '..kggggwgggggk..',
    '...kkkkwgkkkk...',
    '......kwgk......',
    '......knnk......',
    '......knnk......',
    '......knnk......',
    '......knnk......',
    '......knnk......',
    '......knnk......',
    '......knnk......',
    '......kkkk......',
  ],
  // 王冠 💎：大きな宝石の王冠
  i_crown: [
    '................',
    '................',
    '..k....kk....k..',
    '.kyk..kyyk..kyk.',
    '.kyyk.kyyk.kyyk.',
    '.kyyykyyyykyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kyyyykcckyyyyk.',
    '.kyrykceeckyryk.',
    '.kyyykceeckyyyk.',
    '.kyyyykcckyyyyk.',
    '.kooooooooooook.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  // 魔剣 🗡️：紫に光る剣
  i_blade: [
    '..............kk',
    '.............kpk',
    '............kpPk',
    '...........kpPk.',
    '..........kpPk..',
    '.........kpPk...',
    '........kpPk....',
    '.kk....kpPk.....',
    '.kyk..kpPk......',
    '..kykkpPk.......',
    '...kyyPk........',
    '...kkyyk........',
    '..krkkyyk.......',
    '.krrk.kkyk......',
    'krrk....kk......',
    '.kk.............',
  ],
  // 聖鎧 🥋：金の十字の白い鎧
  i_armor: [
    '................',
    '..kkk......kkk..',
    '.kwwwkkkkkkwwwk.',
    'kwwwwwkyykwwwwwk',
    'kwwgkwwyywwkgwwk',
    '.kkk.kwyywk.kkk.',
    '....kwwyywwk....',
    '....kwyyyywk....',
    '....kwwyywwk....',
    '....kwwyywwk....',
    '....kggyyggk....',
    '...kyyyyyyyyk...',
    '...kwwwggwwwk...',
    '...kwwgkkgwwk...',
    '...kkkk..kkkk...',
    '................',
  ],
  // 鉄の剣 ⚔️：交差した2本の剣
  i_sword: [
    'kk............kk',
    'kwk..........kwk',
    '.kwk........kwk.',
    '..kwk......kwk..',
    '...kwk....kwk...',
    '....kwk..kwk....',
    '.....kwkkwk.....',
    '......kwwk......',
    '.....kwkkwk.....',
    '....kwk..kwk....',
    '.k.kwk....kwk.k.',
    'kykwk......kwkyk',
    '.kyyk......kyyk.',
    '.knk........knk.',
    'knk..........knk',
    'kk............kk',
  ],
  // 戦太鼓 🥁
  i_drum: [
    '.k............k.',
    '.kn..........nk.',
    '..kn........nk..',
    '...kn.kkkk.nk...',
    '..kkkkwwwwkkkk..',
    '.kwwwwwwwwwwwwk.',
    '.kkwwwwwwwwwwkk.',
    '.krkkkkkkkkkkrk.',
    '.kryrrryyrrryrk.',
    '.krryryrryryrrk.',
    '.krrryrrrryrrrk.',
    '.krryryrryryrrk.',
    '.kkrrrrrrrrrrkk.',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  // 結界石 🔷
  i_ward: [
    '.......kk.......',
    '......kcck......',
    '.....kceeck.....',
    '....kceecbck....',
    '...kceeccbbck...',
    '..kceecccbbbck..',
    '.kceeccccbbbbck.',
    'kceecccccbbbbbck',
    'kcccccccbbbbbbuk',
    '.kccccccbbbbbuk.',
    '..kccccbbbbbuk..',
    '...kcccbbbbuk...',
    '....kccbbbuk....',
    '.....kcbbuk.....',
    '......kbuk......',
    '.......kk.......',
  ],
  // 回復薬 🧴：白い十字の赤い薬びん
  i_potion: [
    '................',
    '......kkkk......',
    '......knnk......',
    '.....kkkkkk.....',
    '......kwwk......',
    '......kwwk......',
    '....kkkwwkkk....',
    '...kwwwwwwwwk...',
    '..kwrrrrrrrrwk..',
    '..krrrrwwrrrrk..',
    '..krrrwwwwrrrk..',
    '..krrrrwwrrrrk..',
    '..krrrrrrrrrrk..',
    '...krrrrrrrrk...',
    '....kkkkkkkk....',
    '................',
  ],
  // 毒の香炉 🏺：紫の煙の立つつぼ
  i_censer: [
    '.....p....p.....',
    '......p..p......',
    '.....p....p.....',
    '....kkkkkkkk....',
    '....knnnnnnk....',
    '.....kttttk.....',
    '..kk.kttttk.kk..',
    '.ktkkttttttkktk.',
    '.ktkttttttttktk.',
    '.kkkttyyyyttkkk.',
    '..kkttttttttkk..',
    '...kttttttttk...',
    '....kttttttk....',
    '.....kttttk.....',
    '....kkttttkk....',
    '....kkkkkkkk....',
  ],
  // 呪いの人形 🪆：紫の入れ子人形
  i_doll: [
    '................',
    '.....kkkkkk.....',
    '....kPPPPPPk....',
    '...kPPffffPPk...',
    '...kPfkffkfPk...',
    '...kPffffffPk...',
    '...kPPfrrfPPk...',
    '....kPPPPPPk....',
    '...kPPPPPPPPk...',
    '..kPPPyPPyPPPk..',
    '..kPPyryyryPPk..',
    '..kPPPyPPyPPPk..',
    '..kPPPPPPPPPPk..',
    '..kPPPPPPPPPPk..',
    '...kPPPPPPPPk...',
    '....kkkkkkkk....',
  ],
};

const PX = 2.5; // 16マス × 2.5 = 40

// 駒のアイコン（SVGの中身の文字列）。用意がなければ null。横に同じ色が続くところは1つの四角にまとめる。
export function pieceIconMarkup(piece) {
  const rows = SPRITES[piece?.id];
  if (!rows) return null;
  let out = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      if (PALETTE[ch]) out += `<rect x="${-20 + x * PX}" y="${-20 + y * PX}" width="${n * PX}" height="${PX}" fill="${PALETTE[ch]}"/>`;
      x += n;
    }
  });
  return `<g shape-rendering="crispEdges">${out}</g>`;
}

// テスト・確認用：ドット絵の行そのもの
export const pieceSpriteRows = (id) => SPRITES[id] ?? null;

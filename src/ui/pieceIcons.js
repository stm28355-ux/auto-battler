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
};

const SPRITES = {
  // 毒蛇：かま首を上げた蛇
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
  // 木の盾
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
  // 見習い剣士：短剣を構えた若い剣士
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
  // 呪詛師：どくろの面をつけた、フードの術師
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
  // 雷術師：いなずまを掲げた、とんがり帽子の術師
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
  // ゴーレム：石の体の巨人（目が光る）
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
  // 魔剣：紫に光る剣（道具は物だけ）
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

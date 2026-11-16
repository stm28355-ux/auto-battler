// マスに置いた駒のアイコン（16×16 のドット絵）。-20〜20 の箱に描く。
// 方針：元の絵文字のモチーフを残す・かっこよく・顔は無理につけない。
// 用意のない駒（自作駒など）は null を返し、呼ぶ側が絵文字で描く。
const PALETTE = {
  k: '#1a1c2c', // ふちどり
  w: '#f4f4f4', g: '#94b0c2', s: '#566c86', // 白・鋼・暗い鋼
  y: '#ffcd75', o: '#ef7d57', r: '#b13e53', // 金・橙・赤
  b: '#3b5dc9', c: '#41a6f6', p: '#8a4fd1', // 青・水色・紫
  G: '#38b764', d: '#257179', l: '#a7f070', // 緑・暗い緑・黄緑
  n: '#8a5a3c', t: '#c28569', // 茶・明るい茶
};

const SPRITES = {
  // 見習い剣士：短剣
  c_squire: [
    '..............kk',
    '.............kwk',
    '............kwgk',
    '...........kwgk.',
    '..........kwgk..',
    '.........kwgk...',
    '........kwgk....',
    '.kk....kwgk.....',
    '.kyk..kwgk......',
    '..kykkwgk.......',
    '...kyygk........',
    '...kkyyk........',
    '..knkkyyk.......',
    '.knnk.kkyk......',
    'knnk....kk......',
    '.kk.............',
  ],
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
  // 呪詛師：どくろ
  c_cursemaster: [
    '................',
    '....kkkkkkkk....',
    '...kwwwwwwwwk...',
    '..kwwwwwwwwwwk..',
    '.kwwwwwwwwwwwgk.',
    '.kwwwwwwwwwwwgk.',
    '.kwkkkwwwkkkwgk.',
    '.kwkpkwwwkpkwgk.',
    '.kwkkkwwwkkkwgk.',
    '.kwwwwwkwwwwggk.',
    '..kwwwkkkwwwgk..',
    '...kkwwwwwgkk...',
    '....kwkwkwgk....',
    '....kwkwkwgk....',
    '....kkkkkkkk....',
    '................',
  ],
  // 雷術師：いなずま
  c_sorcerer: [
    '................',
    '........kkkkkk..',
    '.......kwyyyk...',
    '......kwyyyk....',
    '.....kwyyyk.....',
    '....kwyyyk......',
    '...kwyyykkkkk...',
    '..kwyyyyyyyk....',
    '..kkkkkyyyk.....',
    '......kyyok.....',
    '.....kyyok......',
    '....kyyok.......',
    '....kyok........',
    '...kyok.........',
    '...kok..........',
    '...kk...........',
  ],
  // ゴーレム：石の像
  c_golem: [
    '................',
    '....kkkkkkk.....',
    '...kgggggggk....',
    '...kgggggggsk...',
    '...kkkkkkkksk...',
    '...kskkgkkssk...',
    '...kgggggggsk...',
    '...kgggkgggsk...',
    '...kggkkgggsk...',
    '..kgggkkkggsk...',
    '..kggggggggsk...',
    '...kgkkkkkgsk...',
    '...kgggggggsk...',
    '....kggggggsk...',
    '....kggggssk....',
    '....kkkkkkkk....',
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

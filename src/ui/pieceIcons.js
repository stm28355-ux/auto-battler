// マスに置いた駒のアイコン（SVG）。-20〜20 の箱に描く。丸い顔・点の目・ほっぺで、かわいくそろえる。
// 用意のない駒（自作駒など）は null を返し、呼ぶ側が絵文字で描く。
const INK = '#4a3b3b';
const SKIN = '#ffe3c8';

const face = (y = 4, dx = 5, { mouth = true } = {}) =>
  `<ellipse cx="${-dx - 2.5}" cy="${y + 3.2}" rx="2.4" ry="1.5" fill="#ff9aa8" opacity=".75"/><ellipse cx="${dx + 2.5}" cy="${y + 3.2}" rx="2.4" ry="1.5" fill="#ff9aa8" opacity=".75"/>`
  + `<circle cx="${-dx}" cy="${y}" r="1.9" fill="${INK}"/><circle cx="${dx}" cy="${y}" r="1.9" fill="${INK}"/>`
  + `<circle cx="${-dx + 0.7}" cy="${y - 0.7}" r=".6" fill="#fff"/><circle cx="${dx + 0.7}" cy="${y - 0.7}" r=".6" fill="#fff"/>`
  + (mouth ? `<path d="M-2 ${y + 3.6} q2 2 4 0" fill="none" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` : '');
const head = (c, r = 12, y = 4) => `<circle cx="0" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="1.2"/>`;
const st = `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`;
const star = (x, y, s, c = '#ffe36e') => `<path d="M${x} ${y - s} l${s * 0.3} ${s * 0.7} ${s * 0.75} .05 -${s * 0.6} ${s * 0.45} ${s * 0.25} ${s * 0.75} -${s * 0.7} -${s * 0.45} -${s * 0.7} ${s * 0.45} ${s * 0.25} -${s * 0.75} -${s * 0.6} -${s * 0.45} ${s * 0.75} -.05z" fill="${c}"/>`;

// 後ろに描くもの（耳・たてがみ）
const ears = {
  cat: (c) => `<path d="M-11 -2 l-1 -11 9 5z M11 -2 l1 -11 -9 5z" fill="${c}" ${st}/>`,
  round: (c) => `<circle cx="-9.5" cy="-6" r="4.5" fill="${c}" ${st}/><circle cx="9.5" cy="-6" r="4.5" fill="${c}" ${st}/>`,
  long: (c) => `<path d="M-11 3 l-8 -6 9 -1z M11 3 l8 -6 -9 -1z" fill="${c}" ${st}/>`,
  big: (c) => `<ellipse cx="-13" cy="3" rx="5.5" ry="7.5" fill="${c}" ${st}/><ellipse cx="13" cy="3" rx="5.5" ry="7.5" fill="${c}" ${st}/>`,
  mane: (c) => Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2; return `<circle cx="${(Math.cos(a) * 12.5).toFixed(1)}" cy="${(4 + Math.sin(a) * 12.5).toFixed(1)}" r="4.6" fill="${c}" ${st}/>`; }).join(''),
  horns: (c) => `<path d="M-8 -5 l-2 -8 6 4z M8 -5 l2 -8 -6 4z" fill="${c}" ${st}/>`,
};
// 上に描くもの（帽子・かぶと）
const hats = {
  wiz: (c, mark = '') => `<path d="M-13 -3 q13 -5 26 0 l-3 -3 q-3 -1 -4 -3 l-5 -10 -6 10 q-1 2 -5 3z" fill="${c}" ${st}/><path d="M-14 -3 q14 -6 28 0 q-14 4 -28 0z" fill="${c}" ${st}/>${mark}`,
  helm: (c, extra = '') => `<path d="M-12 2 a12 12 0 0 1 24 0 l0 1 -24 0z" fill="${c}" ${st}/><path d="M-12 1 h24" stroke="${INK}" stroke-width="1.2"/>${extra}`,
  hair: (c) => `<path d="M-12 3 a12 12 0 0 1 24 0 q-4 -6 -9 -3 q-3 -4 -8 0 q-4 -1 -7 3z" fill="${c}" ${st}/>`,
  hood: (c) => `<path d="M-13 9 a13 14 0 0 1 26 0 q-1 -9 -13 -10 q-12 1 -13 10z" fill="${c}" ${st}/>`,
  crown: (c = '#ffd34d') => `<path d="M-8 -6 l-1 -8 5 4 4 -6 4 6 5 -4 -1 8z" fill="${c}" ${st}/><circle cx="0" cy="-9.5" r="1.3" fill="#ff7b9c"/>`,
};

const chara = (c, { ear, earC, hat, y = 4, extra = '', back = '' } = {}) =>
  `${back}${ear ? ears[ear](earC ?? c) : ''}${head(c, 12, y)}${face(y + 1)}${hat ?? ''}${extra}`;
const snout = (c = '#fff3e0') => `<ellipse cx="0" cy="9.5" rx="4.6" ry="3.4" fill="${c}"/><ellipse cx="0" cy="8" rx="1.6" ry="1.1" fill="${INK}"/>`;
const bot = (c, extra = '', back = '') => `${back}<rect x="-12" y="-7" width="24" height="22" rx="6" fill="${c}" ${st}/>${face(4)}${extra}`;
const eyes = (y, dx = 3.2) => `<circle cx="${-dx}" cy="${y}" r="1.3" fill="${INK}"/><circle cx="${dx}" cy="${y}" r="1.3" fill="${INK}"/><path d="M-1.4 ${y + 2.2} q1.4 1.4 2.8 0" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;

const ICONS = {
  // 戦士
  c_squire: () => chara(SKIN, { hat: hats.hair('#b9794a'), extra: `<path d="M13 14 l4 -14 2 1 -3 14z" fill="#dfe7ee" ${st}/>` }),
  c_knight: () => chara(SKIN, { hat: hats.helm('#c9d3dd', `<path d="M0 -8 q5 -9 9 -5 q-5 0 -6 6z" fill="#ff7b9c" ${st}/>`) }),
  c_berserker: () => chara(SKIN, { hat: `<path d="M-12 3 l-1 -9 5 3 2 -8 4 6 4 -7 3 8 5 -3 -2 10 q-10 -7 -20 0z" fill="#ff7a5c" ${st}/>` }),
  c_paladin: () => chara(SKIN, { hat: hats.helm('#ffd76a', `<path d="M0 -7 v6 M-3 -4.5 h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`) }),
  c_swordmaster: () => chara(SKIN, { hat: hats.hair('#5b5fa8') + `<path d="M-12 0 h24 l5 -4 -1 6 -4 0" fill="#ff7b9c" ${st}/>` }),
  c_guard: () => chara(SKIN, { hat: `<path d="M-13 5 a13 14 0 0 1 26 0 l0 2 -6 -3 h-14 l-6 3z" fill="#8fb59a" ${st}/>` }),
  c_dragoon: () => chara(SKIN, { ear: 'horns', earC: '#ffe9a8', hat: hats.hood('#7fcf9a') }),
  c_general: () => chara(SKIN, { hat: hats.hair('#7a5a4a') + hats.crown() }),
  // 魔導
  c_apprentice: () => chara(SKIN, { hat: hats.wiz('#8fb8ff', star(1, -11, 2.6)) }),
  c_witch: () => chara(SKIN, { back: `<path d="M-12 6 q-4 8 0 10 M12 6 q4 8 0 10" stroke="#ffb46a" stroke-width="4" stroke-linecap="round" fill="none"/>`, hat: hats.wiz('#b08be8', `<path d="M-6 -6.5 q6 -2 12 0" stroke="#ffd34d" stroke-width="1.8" fill="none"/>`) }),
  c_oracle: () => chara(SKIN, { hat: hats.hood('#f4f0ff') + star(0, -4, 3, '#9fb6ff') }),
  c_cursemaster: () => chara(SKIN, { hat: hats.hood('#7d83c9') + `<path d="M2 -7 a4 4 0 1 0 2 7 a5 5 0 0 1 -2 -7z" fill="#ffe36e"/>` }),
  c_sorcerer: () => chara(SKIN, { hat: hats.wiz('#ffd34d', `<path d="M2 -15 l-4 6 h3 l-2 5 5 -7 h-3z" fill="#fff" stroke="${INK}" stroke-width=".8"/>`) }),
  c_hexer: () => chara(SKIN, { hat: hats.wiz('#8fd18a', `<circle cx="0" cy="-11" r="2" fill="#d7a6ff"/>`) }),
  c_pyromancer: () => chara(SKIN, { hat: hats.wiz('#ff8a70', `<path d="M0 -15 q4 4 1 7 q-4 0 -3 -3 q1 -1 2 -4z" fill="#ffe36e"/>`) }),
  c_archmage: () => chara(SKIN, { hat: hats.wiz('#5c6bc0', star(0, -11, 3)), extra: `<path d="M-7 10 q7 12 14 0 q-7 3 -14 0z" fill="#fff" ${st}/>` }),
  // 獣
  c_viper: () => chara('#9bdc8a', { extra: `<path d="M0 12 v4 l-1.6 2 M0 16 l1.6 2" stroke="#ff7b9c" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="-6" cy="-3" r="1.4" fill="#6fbf6a"/><circle cx="5" cy="-5" r="1.4" fill="#6fbf6a"/>` }),
  c_wolf: () => chara('#b9c2cf', { ear: 'cat', extra: snout() }),
  c_hawk: () => chara('#c79a6b', { hat: `<path d="M-3 -8 l1 -6 2 4 2 -5 1 7z" fill="#a9794d" ${st}/>`, extra: `<path d="M-3 8 h6 l-3 5z" fill="#ffc94d" ${st}/>` }),
  c_leopard: () => chara('#ffd77a', { ear: 'round', extra: snout() + `<circle cx="-7" cy="-3" r="1.5" fill="#c98f3a"/><circle cx="6" cy="-4" r="1.5" fill="#c98f3a"/><circle cx="0" cy="-5" r="1.3" fill="#c98f3a"/>` }),
  c_boar: () => chara('#c49a7a', { ear: 'cat', extra: `<ellipse cx="0" cy="10" rx="5" ry="3.6" fill="#f3c9b0" ${st}/><circle cx="-1.8" cy="10" r=".9" fill="${INK}"/><circle cx="1.8" cy="10" r=".9" fill="${INK}"/><path d="M-6 12 l-1 -4 M6 12 l1 -4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` }),
  c_bear: () => chara('#b98a62', { ear: 'round', extra: snout('#f3dcc0') }),
  c_lion: () => chara('#ffd77a', { ear: 'mane', earC: '#ff9f55', extra: snout() }),
  c_behemoth: () => chara('#b7c9de', { ear: 'big', extra: `<path d="M-2.5 8 q0 9 4 8 q2 -1 1 -3" fill="none" stroke="#b7c9de" stroke-width="4.5" stroke-linecap="round"/><path d="M-6 11 q-3 4 -6 2 M6 11 q3 4 6 2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>` }),
  // 機械
  c_drone: () => `<ellipse cx="0" cy="6" rx="17" ry="7" fill="#b8c7d9" ${st}/><path d="M-9 4 a9 10 0 0 1 18 0z" fill="#bfeaff" ${st}/>${eyes(8, 4)}<circle cx="-12" cy="8" r="1.3" fill="#ffe36e"/><circle cx="12" cy="8" r="1.3" fill="#ffe36e"/>`,
  c_reactor: () => `<rect x="-4" y="-15" width="8" height="5" rx="2" fill="#b8c7d9" ${st}/><rect x="-10" y="-11" width="20" height="27" rx="5" fill="#9be08a" ${st}/>${eyes(1)}<path d="M1 7 l-4 5 h3 l-1 3 4 -5 h-3z" fill="#ffe36e" stroke="${INK}" stroke-width=".8"/>`,
  c_tesla: () => `<path d="M-8 16 l4 -20 h8 l4 20z" fill="#b8c7d9" ${st}/><circle cx="0" cy="-9" r="6.5" fill="#bfeaff" ${st}/>${eyes(5, 2.6)}<path d="M-13 -11 l3 2 M13 -11 l-3 2 M0 -19 v2" stroke="#ffd34d" stroke-width="1.8" stroke-linecap="round"/>`,
  c_turret: () => bot('#9fb4c9', `<rect x="-3" y="-17" width="6" height="11" rx="2" fill="#7f95ab" ${st}/>`),
  c_golem: () => bot('#c9c2b6', `<path d="M-12 -3 q3 -6 9 -4 q-2 4 -9 6z" fill="#9bdc8a" ${st}/><circle cx="8" cy="-3" r="1.5" fill="#aaa294"/>`),
  c_medibot: () => bot('#f7f7f2', `<path d="M0 -16 v6" stroke="${INK}" stroke-width="1.2"/><circle cx="0" cy="-17" r="2.2" fill="#ff9aa8" ${st}/><path d="M0 -4.5 v5 M-2.5 -2 h5" stroke="#6fcf97" stroke-width="2" stroke-linecap="round"/>`),
  c_fighter: () => `<path d="M-19 8 l19 -6 19 6 -19 3z" fill="#9fb4c9" ${st}/><path d="M-6 14 q-2 -22 6 -30 q8 8 6 30z" fill="#dfe7ee" ${st}/><path d="M-3.5 -6 a3.5 4 0 0 1 7 0z" fill="#bfeaff" ${st}/>${eyes(3, 2.6)}`,
  c_workshop: () => `<rect x="5" y="-15" width="5" height="9" fill="#c9a28a" ${st}/><path d="M-15 -2 l15 -11 15 11z" fill="#ff9f7a" ${st}/><rect x="-12" y="-2" width="24" height="18" rx="2" fill="#ffe9c4" ${st}/>${eyes(5, 4)}<circle cx="9" cy="-18" r="1.8" fill="#dfe7ee"/>`,
  // 中立
  c_elf: () => chara(SKIN, { ear: 'long', earC: SKIN, hat: hats.hair('#ffe08a') + `<path d="M-4 -9 q4 -4 8 0 q-4 2 -8 0z" fill="#8fd18a" ${st}/>` }),
  c_dwarf: () => chara(SKIN, { hat: hats.helm('#ffb85c', `<circle cx="0" cy="-5" r="2.6" fill="#fff6c9" ${st}/>`), extra: `<path d="M-9 8 q9 14 18 0 q-9 4 -18 0z" fill="#c98f5a" ${st}/>` }),
  c_vampire: () => chara('#fff0ec', { hat: `<path d="M-12 3 a12 12 0 0 1 24 0 q-6 -7 -12 -2 q-6 -5 -12 2z" fill="#6b5b8f" ${st}/>`, extra: `<path d="M2 9.2 l1 2.2 1 -2.2z" fill="#fff" stroke="${INK}" stroke-width=".6"/><path d="M-9 15 q9 4 18 0 l2 3 h-22z" fill="#ff7b9c" ${st}/>` }),
  c_dragonkin: () => chara('#7fd6c2', { ear: 'horns', earC: '#ffe9a8', extra: `<ellipse cx="0" cy="10" rx="5" ry="3.2" fill="#c8f2e6"/><circle cx="-1.6" cy="9.5" r=".7" fill="${INK}"/><circle cx="1.6" cy="9.5" r=".7" fill="${INK}"/>` }),
  c_fiend: () => chara('#ff9d9d', { ear: 'horns', earC: '#fff3d6', hat: `<path d="M-6 -6 q6 -5 12 0 q-6 -2 -12 0z" fill="#c75b7a"/>` }),
  // 道具
  i_shield: () => `<path d="M-12 -12 h24 v10 q0 13 -12 18 q-12 -5 -12 -18z" fill="#d9a56b" ${st}/><path d="M0 -12 v28 M-12 -4 h24" stroke="#b9824a" stroke-width="1.6"/>${eyes(2)}`,
  i_gear: () => `${Array.from({ length: 8 }, (_, k) => `<rect x="-3" y="-17" width="6" height="8" rx="1.5" fill="#b8c7d9" ${st} transform="rotate(${k * 45})"/>`).join('')}<circle r="11.5" fill="#cfdbe8" ${st}/>${eyes(-1)}`,
  i_banner: () => `<path d="M-10 -16 v32" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M-9 -15 h22 l-5 8 5 8 h-22z" fill="#ff8f8f" ${st}/>${eyes(-8.5, 3)}`,
  i_stungun: () => `<rect x="-9" y="-6" width="18" height="21" rx="4" fill="#8fb8ff" ${st}/><path d="M-5 -6 v-6 M5 -6 v-6" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M-4 -14 l3 2 2 -3 3 2" fill="none" stroke="#ffd34d" stroke-width="1.8" stroke-linecap="round"/>${eyes(3)}`,
  i_vial: () => `<rect x="-4" y="-16" width="8" height="5" rx="1.5" fill="#c9a28a" ${st}/><path d="M-4 -11 v5 q-9 5 -9 13 a13 10 0 0 0 26 0 q0 -8 -9 -13 v-5z" fill="#e9f7ef" ${st}/><path d="M-12 6 a12 9 0 0 0 24 0 q-6 -3 -12 0 q-6 3 -12 0z" fill="#b99cf0"/>${eyes(8)}<circle cx="6" cy="1" r="1.2" fill="#d9c8ff"/>`,
  i_spear: () => `<path d="M-13 15 l18 -18" stroke="#c9a28a" stroke-width="3" stroke-linecap="round"/><path d="M3 -5 q2 -9 12 -11 q-2 10 -11 12z" fill="#dfe7ee" ${st}/><path d="M-2 0 l5 5" stroke="#ff7b9c" stroke-width="2.4" stroke-linecap="round"/>`,
  i_crown: () => `<path d="M-14 12 l-2 -20 9 8 7 -13 7 13 9 -8 -2 20z" fill="#ffd34d" ${st}/><circle cx="0" cy="-12" r="2" fill="#ff7b9c"/><circle cx="-15.5" cy="-8" r="1.7" fill="#8fb8ff"/><circle cx="15.5" cy="-8" r="1.7" fill="#8fb8ff"/>${eyes(4)}`,
  i_blade: () => `<path d="M-3.5 6 v-17 l3.5 -6 3.5 6 v17z" fill="#c9b5ff" ${st}/><rect x="-9" y="6" width="18" height="3.6" rx="1.8" fill="#ffd34d" ${st}/><rect x="-2" y="9.6" width="4" height="7" rx="1.5" fill="#8f7ad1" ${st}/>${star(9, -9, 2.6)}${star(-9, -2, 1.8)}`,
  i_armor: () => `<path d="M-13 -11 l6 -3 q7 5 14 0 l6 3 -3 8 -2 -1 v19 h-16 v-19 l-2 1z" fill="#fff6d9" ${st}/><path d="M0 -3 v8 M-3.5 0 h7" stroke="#ffd34d" stroke-width="2.2" stroke-linecap="round"/>${eyes(9)}`,
  i_sword: () => `<path d="M-3 6 v-17 l3 -6 3 6 v17z" fill="#dfe7ee" ${st}/><rect x="-8" y="6" width="16" height="3.6" rx="1.8" fill="#c9a28a" ${st}/><rect x="-2" y="9.6" width="4" height="7" rx="1.5" fill="#b9794a" ${st}/>`,
  i_drum: () => `<path d="M-13 -5 v13 a13 5 0 0 0 26 0 v-13z" fill="#ff9f7a" ${st}/><ellipse cx="0" cy="-5" rx="13" ry="5" fill="#fff3e0" ${st}/>${eyes(6)}<path d="M-16 -15 l8 8 M16 -15 l-8 8" stroke="#c9a28a" stroke-width="2.2" stroke-linecap="round"/>`,
  i_ward: () => `<path d="M0 -17 l11 12 -11 22 -11 -22z" fill="#9fd0ff" ${st}/><path d="M-11 -5 h22 M0 -17 l-4 12 4 22 4 -22z" fill="none" stroke="#fff" stroke-width="1" opacity=".8"/>${eyes(1, 2.8)}`,
  i_potion: () => `<rect x="-4" y="-16" width="8" height="5" rx="1.5" fill="#c9a28a" ${st}/><path d="M-4 -11 v5 q-9 5 -9 13 a13 10 0 0 0 26 0 q0 -8 -9 -13 v-5z" fill="#e9f7ef" ${st}/><path d="M-12 6 a12 9 0 0 0 24 0 q-6 -3 -12 0 q-6 3 -12 0z" fill="#ff9aa8"/>${eyes(8)}<path d="M0 -3 v4 M-2 -1 h4" stroke="#ff7b9c" stroke-width="1.6" stroke-linecap="round"/>`,
  i_censer: () => `<path d="M-11 -1 q0 15 11 15 q11 0 11 -15z" fill="#d9b38c" ${st}/><rect x="-13" y="-4" width="26" height="4" rx="2" fill="#c49a6c" ${st}/>${eyes(5)}<path d="M-4 -8 q-3 -3 0 -6 M4 -8 q3 -3 0 -6" fill="none" stroke="#b99cf0" stroke-width="1.8" stroke-linecap="round"/>`,
  i_doll: () => `<path d="M-9 16 q-3 -14 9 -15 q12 1 9 15z" fill="#f3b6c8" ${st}/><circle cx="0" cy="-6" r="9" fill="#fff3e0" ${st}/><path d="M-9 -7 a9 9 0 0 1 18 0 q-9 -5 -18 0z" fill="#8f7ad1" ${st}/>${eyes(-4, 3)}<path d="M-3 8 l3 3 3 -3" fill="none" stroke="#fff" stroke-width="1.4"/>`,
};

// 駒のアイコン（SVGの中身の文字列）。用意がなければ null。
export function pieceIconMarkup(piece) {
  return ICONS[piece?.id]?.() ?? null;
}

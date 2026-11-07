import { BALANCE } from '../data/balance.js';
import { neighbors, posKey } from '../data/boards.js';
import { ON_HIT_TYPES } from '../data/effects.js';
import { activeSynergies, frontLiners } from '../core/team.js';

const onHitOf = (piece) => (piece.effects ?? []).filter((e) => ON_HIT_TYPES.has(e.type));
const effectsOf = (piece, type) => (piece.effects ?? []).filter((e) => e.type === type);
const sumOf = (list) => list.reduce((s, e) => s + e.value, 0);

// チームの駒配置から、戦闘で使う実効ステータスを求める（spec §3〜§5）。
//   実効値 = (基本値 + 隣接する道具 + 加算バフ) × (1 + 割合バフの合計)
//   バフ：種族ボーナス・遺物・全体効果（チーム全員）、行効果（同じ行）、隣接効果（隣のマス）、3体の行の強化（遺物）
// 攻撃倍率（Ver.1 の隣接攻撃倍率）は実効攻撃とは別に掛ける。
export function resolveTeam(team, catalog) {
  const placed = team.slots
    .map((slot) => ({ pos: slot.pos, piece: catalog.piece(slot.pieceId) }))
    .filter((s) => s.piece);
  const byPos = new Map(placed.map((p) => [posKey(p.pos), p]));
  const relics = (team.relics ?? []).map((id) => catalog.relic(id)).filter(Boolean);
  const trait = BALANCE.boardTraits?.[team.board] ?? {};

  // チーム全員に効く強化（種族ボーナス・遺物・駒の全体効果）と、チームにかかる値
  const buffs = [];
  const sideEffects = [];
  for (const synergy of activeSynergies(team, catalog)) {
    for (const e of synergy.effects) {
      if (e.type === 'statBuff') buffs.push({ ...e, tribe: e.scope === 'tribe' ? synergy.tribe : null });
      else sideEffects.push(e);
    }
  }
  for (const relic of relics) {
    for (const e of relic.effects) {
      if (e.type === 'statBuff') buffs.push({ ...e, tribe: e.tribe ?? null });
      else sideEffects.push(e);
    }
  }
  for (const { piece } of placed) for (const e of effectsOf(piece, 'teamBuff')) buffs.push({ ...e, tribe: e.tribe ?? null });
  // 号令（Ver.3）：駒と遺物の号令。開始から duration 秒だけ効く
  const rallies = [...placed.flatMap(({ piece }) => effectsOf(piece, 'rally')), ...relics.flatMap((r) => effectsOf(r, 'rally'))];
  // 道具を磨く（Ver.3）：道具の隣にいるキャラの効果のうち、いちばん大きいものが、その道具の攻撃・防御に掛かる
  const ampOf = (pos, stat) => {
    let best = 0;
    for (const n of neighbors(team.board, pos)) {
      const o = byPos.get(posKey(n));
      if (o?.piece.kind !== 'character') continue;
      for (const e of effectsOf(o.piece, 'itemAmp')) if (e.stat === stat) best = Math.max(best, e.value);
    }
    return 1 + best;
  };
  const sideSum = (type) => sumOf(sideEffects.filter((e) => e.type === type));

  // 行効果：同じ行のキャラクターに効く（効果を持つ駒自身がキャラクターなら自分にも）。ボードの特性で効き目が変わる
  const rowMult = trait.rowBuffMult ?? 1;
  const rowBuffs = placed.flatMap(({ pos, piece }) =>
    effectsOf(piece, 'rowBuff').map((e) => ({ ...e, value: e.value * rowMult, row: pos[0] })));

  // 3体の行の強化（遺物）：キャラクターが3体以上いる行
  const perRow = new Map();
  for (const { pos, piece } of placed) if (piece.kind === 'character') perRow.set(pos[0], (perRow.get(pos[0]) ?? 0) + 1);
  const fullRows = new Set([...perRow].filter(([, n]) => n >= 3).map(([r]) => r));
  const fullRowBuffs = sideEffects.filter((e) => e.type === 'fullRowBuff');
  // マスの強化（遺物。Ver.3）：決まったマスにいるキャラクター
  const cellBuffs = sideEffects.filter((e) => e.type === 'cellBuff');

  const units = [];
  for (const { pos, piece } of placed) {
    if (piece.kind !== 'character') continue;
    let atk = piece.atk;
    let def = piece.def;
    let atkMult = 1;
    let pierce = sumOf(effectsOf(piece, 'pierce'));
    const onHit = onHitOf(piece);
    const near = [];
    let aura = 0; // 隣から配られた吸血
    for (const n of neighbors(team.board, pos)) {
      const other = byPos.get(posKey(n));
      if (!other) continue;
      if (other.piece.kind === 'item') {
        atk += other.piece.atk * ampOf(other.pos, 'atk');
        def += other.piece.def * ampOf(other.pos, 'def');
        onHit.push(...onHitOf(other.piece));
        pierce += sumOf(effectsOf(other.piece, 'pierce'));
      }
      for (const e of other.piece.effects ?? []) {
        if (e.type === 'lifestealAura' && other.piece.kind === 'character') aura += e.value;
        if (e.type === 'adjAtkMult') atkMult += e.mult;
        else if (e.type === 'adjBuff') near.push(e);
      }
    }

    const row = pos[0];
    const buffed = (stat, base) => {
      let add = 0;
      let pct = 0;
      const apply = (b) => {
        if (b.stat !== stat) return;
        if (b.mode === 'pct') pct += b.value;
        else add += b.value;
      };
      for (const b of buffs) if (!b.tribe || b.tribe === piece.tribe) apply(b);
      for (const b of rowBuffs) if (b.row === row) apply(b);
      for (const b of near) apply(b);
      if (fullRows.has(row)) for (const b of fullRowBuffs) apply(b);
      for (const b of cellBuffs) if (posKey(b.pos) === posKey(pos)) apply(b);
      return (base + add) * (1 + pct);
    };

    units.push({
      index: units.length,
      pos,
      row,
      piece,
      tribe: piece.tribe,
      hp: buffed('hp', piece.hp),
      atk: buffed('atk', atk),
      def: buffed('def', def),
      spd: buffed('spd', piece.spd),
      atkMult,
      pierce: Math.min(1, pierce),
      lifesteal: sumOf(effectsOf(piece, 'lifesteal')) + aura,
      venomAtk: sumOf(effectsOf(piece, 'venomAtk')),
      rally: rallies.filter((e) => !e.tribe || e.tribe === piece.tribe).map((e) => ({ stat: e.stat, value: e.value, duration: e.duration })),
      onHit,
    });
  }

  const unitAt = new Map(units.map((u) => [posKey(u.pos), u]));
  const fronts = new Map([...frontLiners(team, catalog)].map(([row, pos]) => [row, unitAt.get(posKey(pos))]));
  const maxHp = units.reduce((sum, u) => sum + u.hp, 0);

  // 回復：駒・遺物の回復と、種族ボーナスの再生（最大HPの割合を毎秒）。source は戦闘の内訳に使う
  const healers = [
    ...placed.flatMap(({ pos, piece }) => effectsOf(piece, 'heal').map((e) => ({ e, source: { kind: 'piece', id: piece.id, pos } }))),
    ...relics.flatMap((r) => effectsOf(r, 'heal').map((e) => ({ e, source: { kind: 'relic', id: r.id } }))),
  ].map(({ e, source }) => ({ amount: e.amount, interval: e.interval, source }));
  const regen = sideSum('regen');
  if (regen > 0) healers.push({ amount: maxHp * regen, interval: 1, source: { kind: 'synergy', id: 'regen' } });

  // 手当て（Ver.3）：どこに置いても、一定時間ごとに味方の毒を減らし、麻痺を1体解く
  const cures = placed.flatMap(({ pos, piece }) => effectsOf(piece, 'cure').map((e) => ({ ...e, source: { kind: 'piece', id: piece.id, pos } })));

  // 定期付与：どこに置いても、一定時間ごとに相手へ状態異常を付ける
  const pulses = placed.flatMap(({ pos, piece }) => effectsOf(piece, 'pulse').map((e) => ({ ...e, source: { kind: 'piece', id: piece.id, pos } })));

  return {
    board: team.board,
    units,
    fronts,
    healers,
    pulses,
    cures,
    poisonBonus: sideSum('poisonBonus'),
    paralyzeBonus: sideSum('paralyzeBonus'),
    poisonResist: Math.min(0.9, sideSum('poisonResist')),
    poisonChance: sideSum('poisonChance'),
    maxHp,
  };
}

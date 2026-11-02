import { neighbors, posKey } from '../data/boards.js';
import { activeSynergies, frontLiners } from '../core/team.js';

const ON_HIT = new Set(['poison', 'paralyze']);
const onHitOf = (piece) => (piece.effects ?? []).filter((e) => ON_HIT.has(e.type));

// チームの駒配置から、戦闘で使う実効ステータスを求める（spec §3〜§5）。
//   実効値 = (基本値 + 隣接する道具 + 加算バフ) × (1 + 割合バフの合計)
// 攻撃倍率（隣接攻撃倍率）は実効攻撃とは別に掛ける。
export function resolveTeam(team, catalog) {
  const placed = team.slots
    .map((slot) => ({ pos: slot.pos, piece: catalog.piece(slot.pieceId) }))
    .filter((s) => s.piece);
  const byPos = new Map(placed.map((p) => [posKey(p.pos), p]));
  const relics = (team.relics ?? []).map((id) => catalog.relic(id)).filter(Boolean);

  const buffs = [];
  let poisonBonus = 0;
  for (const synergy of activeSynergies(team, catalog)) {
    for (const e of synergy.effects) {
      if (e.type === 'statBuff') buffs.push({ ...e, tribe: e.scope === 'tribe' ? synergy.tribe : null });
      else if (e.type === 'poisonBonus') poisonBonus += e.value;
    }
  }
  for (const relic of relics) {
    for (const e of relic.effects) if (e.type === 'statBuff') buffs.push({ ...e, tribe: e.tribe ?? null });
  }

  // 行効果：同じ行のキャラクターに効く（効果を持つ駒自身がキャラクターなら自分にも）
  const rowBuffs = placed.flatMap(({ pos, piece }) =>
    (piece.effects ?? []).filter((e) => e.type === 'rowBuff').map((e) => ({ ...e, row: pos[0] })));

  const buffed = (stat, base, tribe, row) => {
    let add = 0;
    let pct = 0;
    for (const b of buffs) {
      if (b.stat !== stat || (b.tribe && b.tribe !== tribe)) continue;
      if (b.mode === 'pct') pct += b.value;
      else add += b.value;
    }
    for (const b of rowBuffs) {
      if (b.stat !== stat || b.row !== row) continue;
      if (b.mode === 'pct') pct += b.value;
      else add += b.value;
    }
    return (base + add) * (1 + pct);
  };

  const units = [];
  for (const { pos, piece } of placed) {
    if (piece.kind !== 'character') continue;
    let atk = piece.atk;
    let def = piece.def;
    let atkMult = 1;
    const onHit = onHitOf(piece);
    for (const n of neighbors(team.board, pos)) {
      const near = byPos.get(posKey(n));
      if (!near) continue;
      if (near.piece.kind === 'item') {
        atk += near.piece.atk;
        def += near.piece.def;
        onHit.push(...onHitOf(near.piece));
      }
      for (const e of near.piece.effects ?? []) if (e.type === 'adjAtkMult') atkMult += e.mult;
    }
    units.push({
      index: units.length,
      pos,
      row: pos[0],
      piece,
      tribe: piece.tribe,
      hp: buffed('hp', piece.hp, piece.tribe, pos[0]),
      atk: buffed('atk', atk, piece.tribe, pos[0]),
      def: buffed('def', def, piece.tribe, pos[0]),
      spd: buffed('spd', piece.spd, piece.tribe, pos[0]),
      atkMult,
      onHit,
    });
  }

  const unitAt = new Map(units.map((u) => [posKey(u.pos), u]));
  const fronts = new Map([...frontLiners(team, catalog)].map(([row, pos]) => [row, unitAt.get(posKey(pos))]));

  const healers = [...placed.map((p) => p.piece), ...relics]
    .flatMap((p) => (p.effects ?? []).filter((e) => e.type === 'heal'))
    .map((e) => ({ amount: e.amount, interval: e.interval }));

  return {
    board: team.board,
    units,
    fronts,
    healers,
    poisonBonus,
    maxHp: units.reduce((sum, u) => sum + u.hp, 0),
  };
}

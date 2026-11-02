// ランダムマッチ：ゲーム側のチームから対戦相手を引く。

// pool: [{ id, team }]。tier は 'any'（おまかせ）か easy / normal / hard。
// 直前の相手（excludeId）は、ほかに候補があるかぎり避ける。候補がなければ null。
export function pickOpponent(pool, tier = 'any', rng = Math.random, excludeId = null) {
  let list = tier === 'any' ? pool : pool.filter((e) => e.team.tier === tier);
  if (list.length > 1 && excludeId) list = list.filter((e) => e.id !== excludeId);
  return list[Math.floor(rng() * list.length)] ?? null;
}

// このページを開いている間の戦績（自分＝A側から見た結果）。
export function createRecord() {
  const record = {
    win: 0,
    loss: 0,
    draw: 0,
    add(winner) {
      if (winner === 'a') record.win += 1;
      else if (winner === 'b') record.loss += 1;
      else record.draw += 1;
    },
    get total() {
      return record.win + record.loss + record.draw;
    },
  };
  return record;
}

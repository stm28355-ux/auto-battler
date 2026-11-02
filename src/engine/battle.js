import { BALANCE } from '../data/balance.js';
import { createRng } from './rng.js';
import { resolveTeam } from './resolve.js';
import { fillRows, foldOf, rowStats } from '../core/rows.js';

export const DT = 0.05; // 1ステップの秒数
export const MAX_STEPS = 600; // 30秒
const POISON_TICK_STEPS = 2; // 毒は0.1秒ごと
const EPS = 1e-9;

const SIDES = ['a', 'b'];
const other = (side) => (side === 'a' ? 'b' : 'a');
const stepsOf = (seconds) => Math.max(1, Math.round(seconds / DT));
const timeOf = (step) => +(step * DT).toFixed(2);

function initSide(team, catalog) {
  const resolved = resolveTeam(team, catalog);
  return {
    resolved,
    hp: resolved.maxHp,
    maxHp: resolved.maxHp,
    poison: 0, // このチームにかかっている毒の蓄積量（有効なものの合計）
    poisons: [], // 毒の付与の記録 { stacks, until }（until は消えるステップ。永続なら Infinity）
    dealt: 0, // 相手に与えたダメージの合計（毒を含む）
    poisonDealt: 0, // そのうち毒によるダメージ（バランス調整で見る）
    units: resolved.units.map((unit) => ({ unit, progress: 0, paraSteps: 0 })),
    healers: resolved.healers.map((h) => ({ amount: h.amount, every: stepsOf(h.interval), counter: 0 })),
  };
}

function pickParalyzeTarget(effect, victim, front, rng) {
  switch (effect.target) {
    case 'front':
      return front;
    case 'random':
      return victim.units[Math.floor(rng() * victim.units.length)];
    case 'fastest':
    case 'strongest': {
      const key = effect.target === 'fastest' ? 'spd' : 'atk';
      return victim.units.reduce((best, s) => (s.unit[key] > best.unit[key] ? s : best));
    }
    default:
      return front;
  }
}

// 戦闘を1ステップずつ進められる形で作る。画面での再生とシミュレーションの両方で使う。
//   advance() で1ステップ（0.05秒）進める。state.done になったら state.result に結果が入る。
export function createBattle(teamA, teamB, catalog, { seed = 1, log = false } = {}) {
  const rng = createRng(seed);
  const sides = { a: initSide(teamA, catalog), b: initSide(teamB, catalog) };
  const boards = { a: teamA.board, b: teamB.board };
  // 計算行ごとの防御と、攻撃を受ける駒（spec §2。ペンタグラムが他のボードと向かい合うときは4行を3行にする）
  for (const key of SIDES) {
    sides[key].rows = fillRows(rowStats(sides[key].resolved.units, boards[key], boards[other(key)]));
  }
  const events = [];
  const history = [];
  const state = { step: 0, done: false, result: null };
  const emit = (event) => log && events.push({ t: timeOf(state.step), ...event });

  function finish(winner, reason) {
    const ratio = { a: sides.a.hp / sides.a.maxHp, b: sides.b.hp / sides.b.maxHp };
    state.done = true;
    state.result = {
      winner,
      reason,
      time: timeOf(state.step),
      hp: { a: sides.a.hp, b: sides.b.hp },
      maxHp: { a: sides.a.maxHp, b: sides.b.maxHp },
      ratio,
      dealt: { a: sides.a.dealt, b: sides.b.dealt },
      poisonDealt: { a: sides.a.poisonDealt, b: sides.b.poisonDealt },
      seed,
      ...(log && { log: events, history }),
    };
  }

  // HP割合で勝者を決める。ほぼ同じ値なら引き分け。
  function decideByRatio(reason) {
    const diff = sides.a.hp / sides.a.maxHp - sides.b.hp / sides.b.maxHp;
    finish(Math.abs(diff) < EPS ? 'draw' : diff > 0 ? 'a' : 'b', reason);
  }

  function advance() {
    if (state.done) return;
    state.step += 1;
    const damage = { a: 0, b: 0 };
    const heal = { a: 0, b: 0 };

    // 1. 攻撃する駒を決める（麻痺の判定はステップ開始時点のもの）
    const attackers = [];
    for (const key of SIDES) {
      for (const s of sides[key].units) {
        const slowed = s.paraSteps > 0;
        if (slowed) s.paraSteps -= 1;
        s.progress += s.unit.spd * (slowed ? BALANCE.paralyzeFactor : 1) * DT;
        if (s.progress >= 1 - EPS) {
          s.progress -= 1;
          attackers.push({ key, s });
        }
      }
    }

    // 2. 攻撃の解決。効果で付いた麻痺は次のステップから効く
    for (const { key, s } of attackers) {
      const own = sides[key];
      const foeKey = other(key);
      const foe = sides[foeKey];
      // 攻撃は、自分の行が振り分けられた計算行ごとに、割合ぶんずつ当たる
      let front = null;
      let frontShare = 0;
      for (const [calc, share] of foldOf(boards[key], boards[foeKey], s.unit.row)) {
        const row = foe.rows[calc - 1];
        const target = foe.units[row.target.index];
        const dmg = (share * s.unit.atk * s.unit.atkMult * 100 * BALANCE.damageScale) / (100 + row.def);
        damage[foeKey] += dmg;
        own.dealt += dmg;
        emit({ type: 'attack', side: key, from: s.unit.pos, to: target.unit.pos, dmg });
        if (share > frontShare) {
          frontShare = share;
          front = target;
        }
      }

      for (const effect of s.unit.onHit) {
        if (effect.chance < 1 && rng() >= effect.chance) continue;
        if (effect.type === 'poison') {
          const stacks = effect.stacks + own.resolved.poisonBonus;
          const lasts = BALANCE.poisonDuration === null ? Infinity : stepsOf(BALANCE.poisonDuration);
          foe.poisons.push({ stacks, until: state.step + lasts });
          foe.poison += stacks;
          emit({ type: 'poison', side: key, stacks, total: foe.poison });
        } else {
          const victim = pickParalyzeTarget(effect, foe, front, rng);
          victim.paraSteps += stepsOf(effect.duration);
          emit({ type: 'paralyze', side: key, target: victim.unit.pos, seconds: effect.duration });
        }
      }
    }

    // 3. 毒（防御無視）。0.1秒ごとに蓄積量ぶんのダメージ
    if (state.step % POISON_TICK_STEPS === 0) {
      for (const key of SIDES) {
        const victim = sides[key];
        if (BALANCE.poisonDuration !== null) {
          victim.poisons = victim.poisons.filter((p) => p.until > state.step); // 切れた毒を外す
          victim.poison = victim.poisons.reduce((sum, p) => sum + p.stacks, 0);
        }
        if (victim.poison <= 0) continue;
        const dmg = victim.poison * BALANCE.poisonDamage;
        damage[key] += dmg;
        sides[other(key)].dealt += dmg;
        sides[other(key)].poisonDealt += dmg;
        emit({ type: 'poisonTick', side: key, dmg });
      }
    }

    // 4. 回復
    for (const key of SIDES) {
      for (const h of sides[key].healers) {
        h.counter += 1;
        if (h.counter >= h.every) {
          h.counter = 0;
          heal[key] += h.amount;
          emit({ type: 'heal', side: key, amount: h.amount });
        }
      }
    }

    // 5. 両チームのダメージ・回復を同時に反映
    for (const key of SIDES) {
      const s = sides[key];
      s.hp = Math.min(s.maxHp, s.hp - damage[key] + heal[key]);
    }
    if (log) history.push({ t: timeOf(state.step), a: sides.a.hp, b: sides.b.hp });

    // 6. 決着判定（spec §7 勝敗）
    const down = { a: sides.a.hp <= 0, b: sides.b.hp <= 0 };
    if (down.a && down.b) decideByRatio('simultaneous'); // はみ出した分が小さい（HP割合が高い）方の勝ち
    else if (down.a) finish('b', 'ko');
    else if (down.b) finish('a', 'ko');
    else if (state.step >= MAX_STEPS) decideByRatio('timeout');
  }

  // events / history は log: true のときだけ溜まる（画面はここから新しいイベントを読む）
  return { sides, state, events, history, advance };
}

export function runBattle(teamA, teamB, catalog, options) {
  const battle = createBattle(teamA, teamB, catalog, options);
  while (!battle.state.done) battle.advance();
  return battle.state.result;
}

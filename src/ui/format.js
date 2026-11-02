import { describeEffect } from '../data/effects.js';
import { TRIBES } from '../data/tribes.js';
import { pieceCost } from '../core/cost.js';

export const $ = (id) => document.getElementById(id);

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export const effectsText = (effects) => (effects ?? []).map(describeEffect).map(escapeHtml).join('<br>') || '—';

export const tribeTag = (tribe) =>
  `<span class="tribe" style="--tribe:${TRIBES[tribe].color}">${TRIBES[tribe].name}</span>`;

export function pieceSummary(piece) {
  const stats = piece.kind === 'character'
    ? `HP ${piece.hp} / 攻撃 ${piece.atk} / 防御 ${piece.def} / 攻撃速度 ${piece.spd}`
    : `攻撃 +${piece.atk} / 防御 +${piece.def}（隣接キャラへ）`;
  const tribe = piece.kind === 'character' ? ` ${tribeTag(piece.tribe)}` : '';
  return `<strong>${escapeHtml(piece.icon)} ${escapeHtml(piece.name)}</strong>${tribe} コスト${pieceCost(piece)}<br>${stats}<br>${effectsText(piece.effects)}`;
}

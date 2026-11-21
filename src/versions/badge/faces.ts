// The printing on the two badges, drawn onto the Lanyard card faces (canvas textures).
// Every word comes from content.ts.
import { DEBATE, PERSON } from '@/content';
import type { Painter } from './Lanyard';

const INK = '#141414';
const CARD = '#f6f5f1';
const SOFT = '#55524b';
const DISPLAY = 'Anton';
const BODY = '"Hanken Grotesk Variable", "Hanken Grotesk", sans-serif';
const M = 104; // side margin, in texture px (face is 1280 x 1800)

function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight = '400', family = DISPLAY) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > max && s > 20) {
    s -= 4;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}

function base(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = CARD;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

/** Small spaced caps line under the punched slot. */
function head(ctx: CanvasRenderingContext2D, text: string, w: number) {
  ctx.fillStyle = SOFT;
  ctx.font = `600 46px ${BODY}`;
  ctx.letterSpacing = '6px';
  ctx.fillText(text.toUpperCase(), M, 268);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = INK;
  ctx.fillRect(M, 300, w - M * 2, 6);
}

function front(role: string, sub: string, kicker: string): Painter {
  return (ctx, w, h) => {
    base(ctx, w, h);
    head(ctx, kicker, w);
    ctx.fillStyle = INK;
    const max = w - M * 2;
    const a = fit(ctx, PERSON.first.toUpperCase(), max, 330);
    ctx.fillText(PERSON.first.toUpperCase(), M - 6, 330 + a * 0.98);
    const b = fit(ctx, PERSON.last.toUpperCase(), max, a);
    ctx.font = `400 ${b}px ${DISPLAY}`;
    ctx.fillText(PERSON.last.toUpperCase(), M - 6, 330 + a * 0.98 + b * 0.98);
    // role block across the bottom
    const top = h - 470;
    ctx.fillStyle = INK;
    ctx.fillRect(0, top, w, 470);
    ctx.fillStyle = CARD;
    const r = fit(ctx, role.toUpperCase(), max, 250);
    ctx.fillText(role.toUpperCase(), M - 4, top + 70 + r * 0.92);
    ctx.font = `500 50px ${BODY}`;
    wrap(ctx, sub, M, top + 70 + r * 0.92 + 90, max, 62);
  };
}

export const competitorFront = front('Competitor', 'Lincoln-Douglas', 'Debater');
export const coachFront = front('Coach', `${DEBATE.team.name}, ${DEBATE.team.role.toLowerCase()}`, 'Skeptical');

/** Back of the competitor badge: the two championships. */
export const competitorBack: Painter = (ctx, w, h) => {
  base(ctx, w, h);
  head(ctx, 'Lincoln-Douglas, 2026', w);
  const max = w - M * 2;
  let y = 420;
  DEBATE.wins.forEach((win, i) => {
    ctx.fillStyle = INK;
    ctx.font = `400 220px ${DISPLAY}`;
    ctx.fillText(win.title.toUpperCase(), M - 6, y + 200);
    ctx.font = `650 64px ${BODY}`;
    ctx.fillText(win.event, M, y + 300);
    ctx.fillStyle = SOFT;
    ctx.font = `450 58px ${BODY}`;
    ctx.fillText(`${win.where}, ${win.when}`, M, y + 378);
    if (i === 0) {
      ctx.fillStyle = INK;
      ctx.fillRect(M, y + 450, max, 4);
    }
    y += 560;
  });
};

/** Back of the coach badge: the team's first tournament. */
export const coachBack: Painter = (ctx, w, h) => {
  base(ctx, w, h);
  head(ctx, DEBATE.team.role, w);
  ctx.fillStyle = INK;
  const max = w - M * 2;
  const s = fit(ctx, DEBATE.team.name.toUpperCase(), max, 260);
  ctx.fillText(DEBATE.team.name.toUpperCase(), M - 6, 400 + s * 0.92);
  ctx.font = `500 66px ${BODY}`;
  wrap(ctx, DEBATE.team.record, M, 400 + s + 120, max, 88);
};

/** Back of the coach badge at the end of the page: up next. */
export const nextBack: Painter = (ctx, w, h) => {
  base(ctx, w, h);
  head(ctx, DEBATE.team.name, w);
  ctx.fillStyle = INK;
  ctx.font = `400 250px ${DISPLAY}`;
  ctx.fillText('UP NEXT', M - 6, 640);
  let y = 820;
  DEBATE.next.forEach((n) => {
    ctx.fillStyle = INK;
    const s = fit(ctx, n.where, w - M * 2, 120);
    ctx.fillText(n.where, M - 4, y + s * 0.9);
    ctx.font = `600 58px ${BODY}`;
    ctx.fillStyle = SOFT;
    ctx.fillText(n.event, M, y + s * 0.9 + 86);
    y += 400;
  });
};

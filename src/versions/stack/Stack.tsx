// Remixed from fancy's StackingCards (danielpetho/fancy, MIT; author Khoa Phan): sticky cards that slide up over each other while the ones beneath scale back.
import { createContext, useContext, useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { gsap } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';

type Ctx = { progress: MotionValue<number>; scaleMultiplier: number; totalCards: number };
const StackCtx = createContext<Ctx | null>(null);

export default function StackingCards({ children, className, scaleMultiplier = 0.035, totalCards, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>> & { scaleMultiplier?: number; totalCards: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  // The sheet that is sliding up covers the one under it: whatever is about to go under its edge
  // dims there and then leaves the page (visibility hidden), so text never sits under text.
  useEffect(() => {
    if (still) return;
    const root = ref.current;
    if (!root) return;
    const sheets = [...root.querySelectorAll<HTMLElement>('[data-sheet]')];
    const parts = sheets.map((s) => [...s.querySelectorAll<HTMLElement>('[data-f]')]);
    const last: number[][] = parts.map((p) => p.map(() => 1));
    const tick = () => {
      for (let i = 0; i < sheets.length - 1; i++) {
        const edge = sheets[i + 1].getBoundingClientRect().top;
        parts[i].forEach((el, k) => {
          const o = clamp((edge - el.getBoundingClientRect().bottom) / 70);
          const q = Math.round(o * 50) / 50;
          if (q === last[i][k]) return;
          last[i][k] = q;
          el.style.opacity = String(q);
          el.style.visibility = q === 0 ? 'hidden' : '';
        });
        sheets[i].toggleAttribute('data-buried', edge < sheets[i].getBoundingClientRect().top + 120);
      }
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <StackCtx.Provider value={{ progress: scrollYProgress, scaleMultiplier, totalCards }}>
      <div className={className} ref={ref} {...props}>{children}</div>
    </StackCtx.Provider>
  );
}

export function StackingCardItem({ index, className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>> & { index: number }) {
  const ctx = useContext(StackCtx);
  if (!ctx) throw new Error('StackingCardItem must be used within StackingCards');
  const { progress, scaleMultiplier, totalCards } = ctx;
  // Each sheet starts to fall back as the next one arrives, and ends smaller the deeper it is buried.
  const scaleTo = 1 - (totalCards - 1 - index) * scaleMultiplier;
  const scale = useTransform(progress, [index / totalCards, 1], [1, scaleTo]);
  // A sheet is slid on by hand: it comes up a touch askew and squares itself as it lands.
  const rotate = useTransform(progress, [Math.max(0, (index - 1) / totalCards), index / totalCards], [index ? 1.4 : 0, 0]);
  return (
    <div className={className} {...props}>
      <motion.div className="st-hold" style={still ? undefined : { scale, rotate, transformOrigin: '50% 0%' }}>
        {children}
      </motion.div>
    </div>
  );
}

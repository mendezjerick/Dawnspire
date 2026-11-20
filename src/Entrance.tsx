import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { advanceProgress } from './entranceProgress';
import './entrance.css';

type Phase = 'loading' | 'complete' | 'wipe' | 'reveal' | 'done';

export default function Entrance({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const target = useRef(0);
  const shown = useRef(0);
  const skip = useRef<HTMLButtonElement>(null);
  const blocked = phase !== 'done';

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hero = new Image();
    hero.src = '/assets/background.jpg';
    const imageReady = hero.decode().catch(() => undefined);
    const fontReady = (font: string) => document.fonts.load(font).catch(() => undefined);
    const tasks = [
      imageReady,
      fontReady('800 32px "Barlow Condensed"'),
      fontReady('600 32px "Barlow Condensed"'),
      fontReady('400 16px Barlow'),
      fontReady('600 16px Barlow'),
    ];
    let settled = 0;
    for (const task of tasks) task.finally(() => {
      if (!cancelled) target.current = ++settled / tasks.length * 100;
    });
    // A failed or stalled asset must never keep the visitor behind the intro.
    const deadline = window.setTimeout(() => { target.current = 100; }, 6000);
    return () => { cancelled = true; window.clearTimeout(deadline); };
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;
    let frame = 0;
    let previous = performance.now();
    const started = previous;
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      shown.current = advanceProgress(shown.current, target.current, elapsed, reduced);
      setProgress(Math.floor(shown.current));
      if (shown.current === 100 && now - started >= (reduced ? 0 : 700)) {
        setPhase('complete');
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reduced]);

  useEffect(() => {
    const next: Partial<Record<Phase, [Phase, number]>> = reduced
      ? { complete: ['reveal', 0], wipe: ['reveal', 0], reveal: ['done', 160] }
      : { complete: ['wipe', 180], wipe: ['reveal', 640], reveal: ['done', 660] };
    const step = next[phase];
    if (!step) return;
    const timer = window.setTimeout(() => setPhase(step[0]), step[1]);
    return () => window.clearTimeout(timer);
  }, [phase, reduced]);

  useEffect(() => {
    if (!blocked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [blocked]);

  const enter = () => {
    const restoreFocus = document.activeElement === skip.current;
    setPhase('done');
    if (restoreFocus) requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('.skip-link')?.focus({ preventScroll: true }));
  };

  return <>
    <div className="site-shell" inert={blocked} data-entrance={phase === 'reveal' || phase === 'done' ? 'ready' : 'waiting'}>
      {children}
    </div>
    {blocked && <div className="entrance" data-phase={phase} data-reduced={reduced} style={{ '--load': progress / 100, '--blur': `${10 - progress / 10}px` } as CSSProperties}>
      <div className="entrance-backdrop" aria-hidden="true" />
      <div className="entrance-noise" aria-hidden="true"><span /><span /><span /></div>
      <div className="entrance-top"><span>DAWNSPIRE INC.</span><span>SOFTWARE DEVELOPMENT</span></div>
      <div className="entrance-brand" aria-hidden="true">
        <img className="entrance-lockup" src="/brand/dawnspire-lockup-dark.svg" alt="" />
        <div className="entrance-signature"><span /><span /><span /><span /><span /><span /><span /><span /></div>
        <div className="entrance-divider" />
        <p>IDEAS INTO IMPACT.</p>
      </div>
      <div className="entrance-meter" role="progressbar" aria-label="Preparing portfolio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="entrance-meter-fill" /></div>
      <div className="entrance-counter" aria-hidden="true">
        <i /><span className="entrance-number">{progress}<small>%</small></span>
        <span className="entrance-counter-label">{progress === 100 ? 'READY TO EXPLORE' : 'PREPARING PORTFOLIO'}</span>
      </div>
      <span className="entrance-announcement" role="status">{phase === 'loading' ? 'Preparing the Dawnspire portfolio.' : 'Portfolio ready. Opening the site.'}</span>
      <div className="entrance-bottom"><span>THINK FORWARD. BUILD BEYOND.</span><button ref={skip} onClick={enter}>Skip intro</button></div>
      <div className="entrance-wipe" aria-hidden="true" />
    </div>}
  </>;
}

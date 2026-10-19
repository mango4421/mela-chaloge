const gameStyle = `
.mela-game{font-family:inherit;color:#f8e9cb;max-width:560px;margin:auto}
.mela-game *{box-sizing:border-box}.mela-game button{font:inherit;cursor:pointer;touch-action:manipulation}
.mela-game .game-intro{font-size:14px;line-height:1.6;color:#d1c4b0;margin:0 0 16px}
.mela-game .game-stats{display:flex;justify-content:space-between;gap:12px;font-size:12px;text-transform:uppercase;letter-spacing:1.4px;margin:12px 0;color:#f5bb62}
.mela-game .game-board{position:relative;overflow:hidden;border:1px solid #f5bb623b;border-radius:18px;background:radial-gradient(ellipse at top,#35434a,#101a20 74%);height:280px;isolation:isolate}
.mela-game .game-board:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 55px,#f8e9cb06 56px 57px);pointer-events:none}
.mela-game .game-status{min-height:48px;text-align:center;line-height:1.5;font-size:14px;margin:16px 0 10px}
.mela-game .game-action{display:block;margin:auto;border:1px solid #f5bb6270;border-radius:100px;background:#f5bb62;color:#172127;padding:12px 24px;min-height:46px;font-weight:700;letter-spacing:.3px}
.mela-game button:focus-visible{outline:3px solid #fff;outline-offset:4px}.mela-game button:disabled{cursor:default;opacity:.55}
.mela-game .balloon{position:absolute;width:52px;height:65px;border:0;border-radius:50% 50% 46% 46%;box-shadow:inset -10px -6px 0 #0002,0 5px 12px #0003;transform:translate(-50%,-50%);color:#fff;font-weight:700;text-shadow:0 1px 3px #0006;transition:opacity .15s}
.mela-game .balloon:before{content:'';position:absolute;left:12px;top:11px;width:10px;height:17px;background:#fff5;border-radius:50%;transform:rotate(24deg)}
.mela-game .balloon:after{content:'';position:absolute;top:100%;left:50%;height:35px;width:1px;background:#f8e9cb60}
.mela-game .balloon[disabled]{opacity:0;pointer-events:none}.mela-game .game-bunting{position:absolute;top:0;left:0;right:0;border-top:1px solid #f8e9cb40;display:flex;justify-content:space-around;color:#f5bb62;font-size:23px;line-height:25px;pointer-events:none}
.mela-game .ring-bottles{position:absolute;bottom:42px;left:0;right:0;display:flex;justify-content:space-around;padding:0 9%}
.mela-game .bottle{width:27px;height:70px;background:linear-gradient(90deg,#345e55,#83aa7e 45%,#2d584e);border-radius:7px 7px 4px 4px;position:relative;box-shadow:6px 7px 0 #0003}
.mela-game .bottle:before{content:'';position:absolute;width:12px;height:24px;left:8px;top:-19px;background:#88aa7d;border-radius:3px 3px 0 0;border-top:5px solid #e9ba5f}
.mela-game .bottle:after{content:'MELA';position:absolute;top:26px;left:0;right:0;background:#f8e9cb;color:#314b44;font-size:8px;text-align:center;padding:5px 0;letter-spacing:1px}
.mela-game .ring-shelf{position:absolute;bottom:30px;height:13px;left:0;right:0;background:linear-gradient(#c28243,#66432e);box-shadow:0 8px 20px #0005}
.mela-game .aim-track{height:10px;position:absolute;top:66px;left:8%;right:8%;background:#f8e9cb16;border-radius:10px}
.mela-game .aim-zone{position:absolute;width:20%;height:100%;left:40%;background:#f5bb6260;border-radius:10px}
.mela-game .aim-marker{position:absolute;left:50%;top:-7px;height:24px;width:5px;border-radius:4px;background:#f8e9cb;box-shadow:0 0 12px #f5bb62;transform:translateX(-50%)}
.mela-game .aim-caption{position:absolute;top:27px;left:0;right:0;text-align:center;font-size:11px;letter-spacing:2px;color:#d1c4b0}
.mela-game .toss-ring{position:absolute;width:53px;height:22px;border:5px solid #f5bb62;border-radius:50%;left:50%;bottom:40px;transform:translateX(-50%);box-shadow:0 0 14px #f5bb6230;opacity:0;pointer-events:none}
@media(max-width:420px){.mela-game .game-board{height:250px}.mela-game .balloon{width:45px;height:58px}}
@media(prefers-reduced-motion:reduce){.mela-game *{animation:none!important;transition:none!important}}
`;

/** Mount a self-contained fair game. Call the returned function when closing its dialog. */
export function mountGame(type, container, onWin = () => {}) {
  if (!container || !['balloon', 'ring'].includes(type)) return () => {};
  const root = document.createElement('section');
  root.className = 'mela-game';
  root.setAttribute('aria-label', type === 'balloon' ? 'Balloon shooting game' : 'Ring toss game');
  const style = document.createElement('style');
  style.textContent = gameStyle;
  root.append(style);
  const intro = document.createElement('p');
  intro.className = 'game-intro';
  intro.textContent = type === 'balloon'
    ? 'Five balloons. One little moment of mela magic. Tap each balloon to pop it, or use Tab and Enter.'
    : 'Three rings, one lucky hand. Throw when the moving light reaches the golden middle. Tap the button or press Space while it is focused.';
  root.append(intro);
  const stats = document.createElement('div');
  stats.className = 'game-stats';
  const tally = document.createElement('span');
  const label = document.createElement('span');
  label.textContent = 'Free to play';
  stats.append(tally, label);
  root.append(stats);
  const board = document.createElement('div');
  board.className = 'game-board';
  const bunting = document.createElement('div');
  bunting.className = 'game-bunting';
  bunting.setAttribute('aria-hidden', 'true');
  bunting.textContent = '▾     ▾     ▾     ▾     ▾     ▾     ▾';
  board.append(bunting);
  root.append(board);
  const status = document.createElement('p');
  status.className = 'game-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(status);
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'game-action';
  root.append(action);
  container.replaceChildren(root);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;
  let disposed = false;
  let won = false;
  let ringAnimation;
  const win = () => { if (!won && !disposed) { won = true; onWin(); } };

  if (type === 'balloon') {
    const colors = ['#cf775f', '#e6b353', '#779d86', '#a18caf', '#d49b76'];
    let count = 0;
    const balloons = colors.map((color, i) => {
      const balloon = document.createElement('button');
      balloon.type = 'button';
      balloon.className = 'balloon';
      balloon.style.backgroundColor = color;
      balloon.setAttribute('aria-label', `Pop balloon ${i + 1}`);
      balloon.textContent = '✦';
      balloon.addEventListener('click', () => {
        if (balloon.disabled || disposed) return;
        balloon.disabled = true;
        count += 1;
        tally.textContent = `${count} / 5 popped`;
        if (count === 5) {
          status.textContent = 'Wah! Five out of five. The stall is cheering for you!';
          action.textContent = 'Play again ↻';
          action.focus({ preventScroll: true });
          win();
        } else status.textContent = ['Shabaash! Keep going.', 'Kya nishana hai!', 'One more little pop!'][count % 3];
      });
      board.append(balloon);
      return balloon;
    });
    const reset = () => {
      count = 0;
      won = false;
      balloons.forEach(b => { b.disabled = false; });
      tally.textContent = '0 / 5 popped';
      status.textContent = 'Aim with your finger. Every balloon is a winner.';
      action.textContent = 'Start over ↻';
    };
    const animate = time => {
      if (disposed) return;
      balloons.forEach((balloon, i) => {
        balloon.style.left = `${14 + i * 18 + (reduced ? 0 : Math.sin(time / 1200 + i * 1.8) * 4)}%`;
        balloon.style.top = `${43 + (i % 2) * 23 + (reduced ? 0 : Math.sin(time / 1000 + i) * 8)}%`;
      });
      if (!reduced) frame = requestAnimationFrame(animate);
    };
    action.addEventListener('click', reset);
    reset();
    animate(0);
  } else {
    const scene = document.createElement('div');
    scene.innerHTML = '<div class="aim-caption" aria-hidden="true">FIND YOUR MOMENT</div><div class="aim-track" aria-hidden="true"><div class="aim-zone"></div><div class="aim-marker"></div></div><div class="ring-shelf" aria-hidden="true"></div><div class="ring-bottles" aria-hidden="true"><div class="bottle"></div><div class="bottle"></div><div class="bottle"></div></div><div class="toss-ring" aria-hidden="true"></div>';
    board.append(scene);
    const marker = scene.querySelector('.aim-marker');
    const ring = scene.querySelector('.toss-ring');
    let throws = 0;
    let score = 0;
    let position = 0;
    let origin = performance.now();
    const reset = () => {
      throws = 0;
      score = 0;
      won = false;
      origin = performance.now();
      ringAnimation?.cancel();
      ring.style.opacity = '0';
      tally.textContent = '3 rings · 0 points';
      status.textContent = reduced ? 'Use the golden center as your guide. Take your time.' : 'Wait for the light to enter the golden center…';
      action.textContent = 'Throw a ring →';
    };
    const animate = time => {
      if (disposed) return;
      // A slower marker keeps the timing mechanic usable with reduced motion.
      position = (Math.sin((time - origin) / (reduced ? 1500 : 650)) + 1) / 2;
      marker.style.left = `${position * 100}%`;
      frame = requestAnimationFrame(animate);
    };
    action.addEventListener('click', () => {
      if (throws >= 3) { reset(); return; }
      throws += 1;
      const hit = position >= .38 && position <= .62;
      if (hit) score += 1;
      const x = hit ? 50 : position * 78 + 11;
      ringAnimation?.cancel();
      ring.style.left = `${x}%`;
      ring.style.opacity = '1';
      if (!reduced && ring.animate) {
        ringAnimation = ring.animate([
          { transform: 'translate(-50%,130px) scale(1.7)', opacity: 1 },
          { transform: 'translate(-50%,-110px) scale(1.2)', offset: .5, opacity: 1 },
          { transform: `translate(-50%,${hit ? '-50px' : '10px'}) scale(1)`, opacity: 1 }
        ], { duration: 600, easing: 'ease-out', fill: 'forwards' });
      } else ring.style.transform = `translate(-50%,${hit ? '-50px' : '10px'})`;
      tally.textContent = `${3 - throws} rings · ${score} ${score === 1 ? 'point' : 'points'}`;
      if (throws === 3) {
        status.textContent = score ? `${score} out of 3! Shabaash, a proper mela champion.` : 'So close! The stall-wala says: ek baar aur?';
        action.textContent = 'Try again ↻';
        if (score) win();
      } else status.textContent = hit ? 'Seedha bottle pe! Beautiful throw.' : 'Oho, just missed! Wait for the golden center.';
    });
    reset();
    frame = requestAnimationFrame(animate);
  }
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    ringAnimation?.cancel();
    root.remove();
  };
}

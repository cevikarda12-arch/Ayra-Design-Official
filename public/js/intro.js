/* Ayra Design — açılış animasyonu */
(function () {
  // Ortak parçacık arka planı (intro ve giriş ekranında kullanılır)
  A.particles = function (canvas, { count = 120, converge = false, links = true } = {}) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, raf, t0 = performance.now();
    const colors = ['#9b87f5', '#c3b5ff', '#20c997', '#f06595', '#4dabf7'];
    const ps = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.max(w, h) * (0.4 + Math.random() * 0.6);
      ps.push({
        x: converge ? w / 2 + Math.cos(a) * r : Math.random() * w,
        y: converge ? h / 2 + Math.sin(a) * r : Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.6, c: colors[i % colors.length],
        a, orbit: 90 + Math.random() * 160, speed: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
      });
    }
    let mouse = { x: -999, y: -999 };
    const onMove = (e) => { const r = canvas.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', resize);
    const frame = (now) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (converge) {
          // önce merkeze doğru çekilir, sonra logonun etrafında yörüngeye girer
          p.a += p.speed * 0.01;
          const k = Math.min(1, t / 2.2);
          const ease = 1 - Math.pow(1 - k, 3);
          const tx = w / 2 + Math.cos(p.a) * p.orbit * (1 + 0.08 * Math.sin(t * 2 + p.orbit));
          const ty = h / 2 + Math.sin(p.a) * p.orbit * 0.62;
          p.x += (tx - p.x) * (0.02 + ease * 0.08);
          p.y += (ty - p.y) * (0.02 + ease * 0.08);
        } else {
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
          if (d < 120) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
          if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.shadowBlur = 8; ctx.shadowColor = p.c;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (links) {
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i], b = ps[j];
            const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
            if (d < 9000) {
              ctx.strokeStyle = `rgba(155,135,245,${0.18 * (1 - d / 9000)})`;
              ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove); window.removeEventListener('resize', resize); };
  };

  A.playIntro = function (skipAnim) {
    return new Promise((resolve) => {
      const intro = document.getElementById('intro');
      if (skipAnim) { intro.remove(); return resolve(); }
      A.syncTitleBar && A.syncTitleBar();
      const stop = A.particles(document.getElementById('introCanvas'), { count: 140, converge: true, links: true });
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        intro.classList.add('out');
        setTimeout(() => { stop(); intro.remove(); A.syncTitleBar && A.syncTitleBar(); }, 1000);
        setTimeout(resolve, 350);
      };
      document.getElementById('introSkip').onclick = finish;
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { document.removeEventListener('keydown', k); finish(); } });
      setTimeout(finish, 4600);
    });
  };
})();

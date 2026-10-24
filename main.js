(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* Reveal on scroll */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: 0.15 });
  document.querySelectorAll('.sp-reveal').forEach((el) => io.observe(el));

  /* Timeline spine draws as the reader scrolls */
  const tl = document.querySelector('.sp-timeline');
  const draw = () => {
    const r = tl.getBoundingClientRect();
    const p = (innerHeight * 0.6 - r.top) / r.height;
    tl.style.setProperty('--sp-progress', Math.max(0, Math.min(1, p)));
  };
  addEventListener('scroll', draw, { passive: true });
  addEventListener('resize', draw);
  draw();

  /* Gallery filter with FLIP */
  const items = [...document.querySelectorAll('.sp-gallery > li')];
  const chips = [...document.querySelectorAll('.sp-chip[data-filter]')];
  let filter = 'all';
  const fast = 160, base = 320;

  const applyFilter = (next) => {
    if (next === filter) return;
    filter = next;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === next)));
    const keep = (li) => next === 'all' || li.dataset.cat === next;

    if (reduce.matches) {
      items.forEach((li) => { li.hidden = !keep(li); li.classList.add('is-in'); });
      return;
    }
    const before = new Map(items.filter((li) => !li.hidden).map((li) => [li, li.getBoundingClientRect()]));
    const leaving = items.filter((li) => !li.hidden && !keep(li));
    leaving.forEach((li) => li.classList.add('is-leaving'));

    setTimeout(() => {
      leaving.forEach((li) => { li.hidden = true; li.classList.remove('is-leaving'); });
      items.forEach((li) => {
        if (keep(li) && li.hidden) { li.hidden = false; li.classList.add('is-in'); li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: base, easing: 'cubic-bezier(.22,1,.36,1)' }); }
      });
      items.filter((li) => !li.hidden && before.has(li)).forEach((li) => {
        const a = before.get(li), b = li.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: base, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
    }, leaving.length ? fast : 0);
  };
  chips.forEach((c) => c.addEventListener('click', () => applyFilter(c.dataset.filter)));

  /* Lightbox */
  const lb = document.querySelector('.lb');
  if (!lb || typeof lb.showModal !== 'function') return;
  const stage = lb.querySelector('.lb__media');
  const count = lb.querySelector('.lb__count');
  const capTitle = lb.querySelector('.lb__cap strong');
  const capMeta = lb.querySelector('.lb__cap span');
  const links = items.map((li) => li.querySelector('.sp-photo'));
  let list = [], idx = 0;

  const show = (i) => {
    idx = (i + list.length) % list.length;
    const a = list[idx];
    const img = a.querySelector('img');
    stage.replaceChildren();
    if (a.hasAttribute('data-video')) {
      const v = document.createElement('video');
      v.src = a.getAttribute('href');
      v.poster = a.dataset.poster || '';
      v.controls = true; v.playsInline = true; v.autoplay = true; v.loop = true;
      v.setAttribute('aria-label', img.alt);
      stage.append(v);
    } else {
      const full = document.createElement('img');
      full.src = a.getAttribute('href');
      full.alt = img.alt;
      stage.append(full);
    }
    capTitle.textContent = a.querySelector('.sp-photo__cap').textContent;
    capMeta.textContent = a.querySelector('.sp-photo__meta').textContent;
    count.textContent = `${idx + 1} / ${list.length}`;
    lb.querySelectorAll('.lb__nav').forEach((b) => { b.hidden = list.length < 2; });
  };

  const open = (a) => {
    const visible = links.filter((l) => !l.closest('li').hidden);
    list = visible.includes(a) ? visible : links;
    lb.showModal();
    show(list.indexOf(a));
  };

  links.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(a); }));
  document.querySelectorAll('[data-open]').forEach((t) => t.addEventListener('click', (e) => {
    const a = document.getElementById(t.dataset.open);
    if (a) { e.preventDefault(); open(a); }
  }));

  lb.addEventListener('close', () => stage.replaceChildren());
  lb.querySelector('[data-close]').addEventListener('click', () => lb.close());
  lb.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(idx + Number(b.dataset.step))));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__stage') || e.target === stage) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'ArrowLeft') show(idx - 1);
  });

  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null || e.target.tagName === 'VIDEO') return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50 && list.length > 1) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();

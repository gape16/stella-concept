/* =============================================
   STELLA CONCEPT - Parallax Steps
   ============================================= */

(function () {
  const steps = document.querySelectorAll('.parallax-step');
  if (!steps.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on entering viewport
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  );
  steps.forEach((step) => revealObserver.observe(step));

  if (prefersReduced) return;

  // Parallax on visuals + bg numbers
  const visuals = document.querySelectorAll('.parallax-step__visual');
  const numbers = document.querySelectorAll('.parallax-step__bg-number');
  let ticking = false;

  function update() {
    const viewH = window.innerHeight;
    visuals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > viewH + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      const progress = (rect.top + rect.height / 2 - viewH / 2) / viewH;
      el.style.transform = `translateY(${progress * speed * 80}px)`;
    });
    numbers.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -400 || rect.top > viewH + 400) return;
      const progress = (rect.top + rect.height / 2 - viewH / 2) / viewH;
      el.style.transform = `translate(-50%, calc(-50% + ${progress * 40}px))`;
    });
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
})();

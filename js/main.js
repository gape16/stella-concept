/* =============================================
   STELLA CONCEPT - Main JS
   ============================================= */

// --- Preloader ---
(function() {
  const preloader = document.createElement('div');
  preloader.className = 'preloader';
  preloader.innerHTML = '<div class="preloader__content"><img src="img/logotype_primaire.svg" alt="" class="preloader__logo"><div class="preloader__bar"><div class="preloader__fill"></div></div></div>';
  document.body.appendChild(preloader);
  window.addEventListener('load', () => {
    preloader.classList.add('preloader--hide');
    setTimeout(() => preloader.remove(), 600);
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  // --- Navigation sticky ---
  const nav = document.querySelector('.nav');
  const handleScroll = () => {
    if (window.scrollY > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- Hamburger toggle ---
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav__links');
  const navOverlay = document.querySelector('.nav__overlay');

  if (hamburger) {
    const syncHamburgerState = (isOpen) => {
      hamburger.classList.toggle('active', isOpen);
      navLinks.classList.toggle('active', isOpen);
      if (navOverlay) navOverlay.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      hamburger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    hamburger.addEventListener('click', () => {
      syncHamburgerState(!navLinks.classList.contains('active'));
    });

    if (navOverlay) {
      navOverlay.addEventListener('click', () => syncHamburgerState(false));
    }

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => syncHamburgerState(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        syncHamburgerState(false);
      }
    });
  }

  // --- Parallax hero ---
  const parallaxElements = document.querySelectorAll('.parallax-bg');
  if (parallaxElements.length > 0) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY;
          parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.speed) || 0.3;
            el.style.transform = `translateY(${scrolled * speed}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --- Compteurs animes ---
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 2000;
      const start = performance.now();

      const update = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(target * eased);
        el.textContent = prefix + current + suffix;
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = prefix + target + suffix;
          el.classList.add('animated');
        }
      };
      requestAnimationFrame(update);
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
  }

  // --- Smooth scroll ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Cookie Banner ---
  const cookieConsent = localStorage.getItem('cookie_consent');
  if (!cookieConsent) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-banner__inner">
        <p class="cookie-banner__text">
          Nous utilisons des cookies pour ameliorer votre experience de navigation.
          En continuant, vous acceptez notre <a href="politique-cookies.html">politique de cookies</a>.
        </p>
        <div class="cookie-banner__buttons">
          <button class="cookie-banner__btn cookie-banner__btn--accept">Accepter</button>
          <button class="cookie-banner__btn cookie-banner__btn--reject">Refuser</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('visible'));
    });

    banner.querySelector('.cookie-banner__btn--accept').addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'accepted');
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 500);
    });

    banner.querySelector('.cookie-banner__btn--reject').addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'rejected');
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 500);
    });
  }

  // --- Dark Mode Toggle ---
  const moonSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  const sunSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

  const darkToggle = document.createElement('button');
  darkToggle.className = 'dark-toggle';
  darkToggle.setAttribute('aria-label', 'Basculer le mode sombre');
  darkToggle.innerHTML = moonSVG;
  document.body.appendChild(darkToggle);

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    darkToggle.innerHTML = sunSVG;
  }

  darkToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    darkToggle.innerHTML = isDark ? sunSVG : moonSVG;
  });

  // --- Gallery Filters ---
  const filterButtons = document.querySelectorAll('.gallery-filter');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (filterButtons.length > 0) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        galleryItems.forEach(item => {
          if (filter === 'all' || item.dataset.category === filter) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

  // --- PWA Service Worker ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // --- Scroll Progress Bar ---
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });

  // --- Back to Top Button ---
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Retour en haut');
  backToTop.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
  document.body.appendChild(backToTop);
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Sticky Mobile CTA ---
  if (window.innerWidth <= 768) {
    const stickyCta = document.createElement('div');
    stickyCta.className = 'sticky-cta';
    stickyCta.innerHTML = `
      <a href="reservation.html" class="btn btn--cta">Réserver un créneau</a>
      <a href="tel:0617026769" class="btn btn--phone">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Appeler
      </a>
    `;
    document.body.appendChild(stickyCta);
    window.addEventListener('scroll', () => {
      stickyCta.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
  }

  // --- Exit Intent Popup ---
  let exitShown = false;
  document.addEventListener('mouseout', (e) => {
    if (e.clientY < 5 && !exitShown && !sessionStorage.getItem('exit_popup_shown')) {
      exitShown = true;
      sessionStorage.setItem('exit_popup_shown', 'true');
      const popup = document.createElement('div');
      popup.className = 'exit-popup';
      popup.innerHTML = `
        <div class="exit-popup__overlay"></div>
        <div class="exit-popup__content">
          <button class="exit-popup__close" aria-label="Fermer">&times;</button>
          <div class="exit-popup__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </div>
          <h3>Avant de partir...</h3>
          <p>Réservez votre <strong>appel découverte gratuit</strong> et discutons de votre projet ensemble.</p>
          <a href="reservation.html" class="btn btn--cta" style="width:100%;margin-top:1rem;">Réserver mon appel gratuit</a>
          <button class="exit-popup__skip">Non merci, peut-être plus tard</button>
        </div>
      `;
      document.body.appendChild(popup);
      requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('visible')));

      popup.querySelector('.exit-popup__close').addEventListener('click', () => {
        popup.classList.remove('visible');
        setTimeout(() => popup.remove(), 400);
      });
      popup.querySelector('.exit-popup__overlay').addEventListener('click', () => {
        popup.classList.remove('visible');
        setTimeout(() => popup.remove(), 400);
      });
      popup.querySelector('.exit-popup__skip').addEventListener('click', () => {
        popup.classList.remove('visible');
        setTimeout(() => popup.remove(), 400);
      });
    }
  });
});

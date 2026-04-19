/* =============================================
   STELLA CONCEPT - Animations JS
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  // --- Scroll Reveal (IntersectionObserver) ---
  const revealElements = document.querySelectorAll('.reveal, .reveal--left, .reveal--right, .reveal--scale, .reveal-stagger');

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // --- Carrousel témoignages ---
  const carousel = document.querySelector('.testimonials');
  if (carousel) {
    const track = carousel.querySelector('.testimonials__track');
    const slides = carousel.querySelectorAll('.testimonial');
    const dots = carousel.querySelectorAll('.testimonials__dot');
    const prevBtn = carousel.querySelector('.testimonials__btn--prev');
    const nextBtn = carousel.querySelector('.testimonials__btn--next');
    let currentSlide = 0;
    let autoPlayInterval;

    const goToSlide = (index) => {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      currentSlide = index;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
      });
    };

    const startAutoPlay = () => {
      autoPlayInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    };

    const stopAutoPlay = () => {
      clearInterval(autoPlayInterval);
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stopAutoPlay();
        goToSlide(currentSlide - 1);
        startAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        stopAutoPlay();
        goToSlide(currentSlide + 1);
        startAutoPlay();
      });
    }

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        stopAutoPlay();
        goToSlide(i);
        startAutoPlay();
      });
    });

    startAutoPlay();
  }

  // --- Accordéon FAQ ---
  const accordionItems = document.querySelectorAll('.accordion__item');
  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion__header');
    const body = item.querySelector('.accordion__body');

    // Associer body à header pour l'accessibilité
    if (body && !body.id) {
      body.id = 'acc-body-' + Math.random().toString(36).slice(2, 8);
    }
    if (body && header) {
      header.setAttribute('aria-controls', body.id);
      body.setAttribute('role', 'region');
    }

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Fermer tous les autres
      accordionItems.forEach(other => {
        other.classList.remove('active');
        const otherBody = other.querySelector('.accordion__body');
        const otherHeader = other.querySelector('.accordion__header');
        if (otherBody) otherBody.style.maxHeight = null;
        if (otherHeader) otherHeader.setAttribute('aria-expanded', 'false');
      });

      // Toggle actuel
      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
        header.setAttribute('aria-expanded', 'true');
      } else {
        header.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // --- Before/After Slider ---
  document.querySelectorAll('.ba-slider').forEach(slider => {
    const before = slider.querySelector('.ba-slider__before');
    const handle = slider.querySelector('.ba-slider__handle');
    let isDragging = false;

    const updatePosition = (x) => {
      const rect = slider.getBoundingClientRect();
      let pos = ((x - rect.left) / rect.width) * 100;
      pos = Math.max(5, Math.min(95, pos));
      before.style.width = pos + '%';
      handle.style.left = pos + '%';
    };

    slider.addEventListener('mousedown', (e) => { isDragging = true; updatePosition(e.clientX); });
    slider.addEventListener('touchstart', (e) => { isDragging = true; updatePosition(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('mousemove', (e) => { if (isDragging) updatePosition(e.clientX); });
    window.addEventListener('touchmove', (e) => { if (isDragging) updatePosition(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('touchend', () => { isDragging = false; });
  });

  // --- Validation formulaire contact ---
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const validateField = (input) => {
      const group = input.closest('.form__group');
      const error = group ? group.querySelector('.form__error') : null;
      let valid = true;
      let message = '';

      if (input.hasAttribute('required') && !input.value.trim()) {
        valid = false;
        message = 'Ce champ est requis';
      } else if (input.type === 'email' && input.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value.trim())) {
          valid = false;
          message = 'Veuillez entrer un email valide';
        }
      } else if (input.type === 'tel' && input.value.trim()) {
        const phoneRegex = /^[\d\s+()./-]{10,}$/;
        if (!phoneRegex.test(input.value.trim())) {
          valid = false;
          message = 'Veuillez entrer un numéro valide';
        }
      }

      if (error) {
        error.textContent = message;
        error.classList.toggle('visible', !valid);
      }
      input.classList.toggle('error', !valid);
      return valid;
    };

    // Validation en temps réel (au blur)
    contactForm.querySelectorAll('.form__input, .form__select, .form__textarea').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const fields = contactForm.querySelectorAll('.form__input, .form__select, .form__textarea');
      let allValid = true;

      fields.forEach(field => {
        if (!validateField(field)) {
          allValid = false;
        }
      });

      if (allValid) {
        // Simuler l'envoi
        contactForm.style.display = 'none';
        const success = document.querySelector('.form__success');
        if (success) {
          success.classList.add('visible');
        }
      }
    });
  }
});

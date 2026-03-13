/* =============================================
   STELLA CONCEPT - Booking / Reservation System
   =============================================
   Vanilla JS calendar + time-slot picker + booking form.
   Communicates with a Google Apps Script backend for
   availability and reservation creation.
   ============================================= */

(function () {
  'use strict';

  /* ------------------------------------------
     Configuration
     ------------------------------------------ */
  const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Demo slots used when no backend URL is configured
  const DEMO_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  // Subject options for the booking form
  const SUBJECTS = [
    { value: '', label: 'Choisir un objet…' },
    { value: 'Accompagnement travaux', label: 'Accompagnement travaux' },
    { value: 'Transition de vie', label: 'Transition de vie' },
    { value: 'Autre', label: 'Autre' }
  ];

  /* ------------------------------------------
     State
     ------------------------------------------ */
  let currentStep = 1;          // 1 = date, 2 = créneau, 3 = coordonnées
  let selectedDate = null;       // Date object
  let selectedSlot = null;       // "HH:MM" string
  let viewDate = new Date();     // Controls which month the calendar shows
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /* ------------------------------------------
     Helpers
     ------------------------------------------ */

  /** Format a Date as YYYY-MM-DD */
  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /** Return true if two Date objects share the same calendar day */
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  /** Simple email regex */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Simple French phone regex (10 digits, optional +33) */
  function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s.\-]/g, '');
    return /^(\+33|0)\d{9}$/.test(cleaned);
  }

  /** Get the backend URL (if configured) */
  function getScriptURL() {
    return window.BOOKING_SCRIPT_URL || null;
  }

  /* ------------------------------------------
     API layer
     ------------------------------------------ */

  /**
   * Fetch available time slots for a given date.
   * Falls back to demo slots if no backend URL is set.
   */
  async function fetchSlots(dateStr) {
    const url = getScriptURL();
    if (!url) {
      // Demo mode — simulate network delay
      await new Promise(r => setTimeout(r, 400));
      return DEMO_SLOTS;
    }

    const res = await fetch(`${url}?action=slots&date=${dateStr}`);
    if (!res.ok) throw new Error('Impossible de récupérer les créneaux.');
    const data = await res.json();
    return data.slots || [];
  }

  /**
   * Submit a booking to the backend.
   * In demo mode, always resolves with a success message.
   */
  async function submitBooking(payload) {
    const url = getScriptURL();
    if (!url) {
      await new Promise(r => setTimeout(r, 800));
      return { success: true, message: 'Réservation confirmée (mode démo).' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'book', ...payload })
    });
    if (!res.ok) throw new Error('Erreur lors de la réservation.');
    return res.json();
  }

  /* ------------------------------------------
     DOM building
     ------------------------------------------ */

  /** Create the full booking widget and return the root element */
  function buildBookingWidget() {
    const root = document.createElement('div');
    root.className = 'booking';

    // ---------- Stepper ----------
    root.appendChild(buildStepper());

    // ---------- Panels wrapper ----------
    const panels = document.createElement('div');
    panels.className = 'booking__panels';

    panels.appendChild(buildDatePanel());
    panels.appendChild(buildSlotPanel());
    panels.appendChild(buildFormPanel());

    root.appendChild(panels);

    // ---------- Success overlay ----------
    root.appendChild(buildSuccess());

    // ---------- Loading overlay ----------
    const loading = document.createElement('div');
    loading.className = 'booking__loading';
    loading.innerHTML = '<div class="booking__spinner"></div><p>Chargement…</p>';
    root.appendChild(loading);

    return root;
  }

  /* ---------- Stepper ---------- */
  function buildStepper() {
    const stepper = document.createElement('div');
    stepper.className = 'booking__stepper';

    const labels = ['Date', 'Créneau', 'Vos coordonnées'];
    labels.forEach((label, i) => {
      if (i > 0) {
        const line = document.createElement('div');
        line.className = 'booking__stepper-line';
        stepper.appendChild(line);
      }
      const step = document.createElement('div');
      step.className = 'booking__step' + (i === 0 ? ' active' : '');
      step.dataset.step = i + 1;

      const circle = document.createElement('span');
      circle.className = 'booking__step-circle';
      circle.textContent = i + 1;

      const text = document.createElement('span');
      text.className = 'booking__step-label';
      text.textContent = label;

      step.appendChild(circle);
      step.appendChild(text);
      stepper.appendChild(step);
    });

    return stepper;
  }

  /* ---------- Date panel (calendar) ---------- */
  function buildDatePanel() {
    const panel = document.createElement('div');
    panel.className = 'booking__panel active';
    panel.dataset.panel = '1';

    const cal = document.createElement('div');
    cal.className = 'calendar';
    panel.appendChild(cal);

    renderCalendar(cal);
    return panel;
  }

  /** Render (or re-render) the calendar inside its container */
  function renderCalendar(container) {
    container.innerHTML = '';

    // --- Header: prev / month-year / next ---
    const header = document.createElement('div');
    header.className = 'calendar__header';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'calendar__nav';
    prevBtn.setAttribute('aria-label', 'Mois précédent');
    prevBtn.innerHTML = '&#8249;';
    prevBtn.addEventListener('click', () => {
      viewDate.setMonth(viewDate.getMonth() - 1);
      clampViewDate();
      renderCalendar(container);
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'calendar__nav';
    nextBtn.setAttribute('aria-label', 'Mois suivant');
    nextBtn.innerHTML = '&#8250;';
    nextBtn.addEventListener('click', () => {
      viewDate.setMonth(viewDate.getMonth() + 1);
      clampViewDate();
      renderCalendar(container);
    });

    const title = document.createElement('span');
    title.className = 'calendar__title';
    title.textContent = `${MONTHS_FR[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    container.appendChild(header);

    // --- Day-of-week labels ---
    const labels = document.createElement('div');
    labels.className = 'calendar__grid calendar__grid--labels';
    DAYS_FR.forEach(d => {
      const span = document.createElement('span');
      span.className = 'calendar__day-label';
      span.textContent = d;
      labels.appendChild(span);
    });
    container.appendChild(labels);

    // --- Days grid ---
    const grid = document.createElement('div');
    grid.className = 'calendar__grid';

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // getDay() is 0=Sun, we need Mon=0 ... Sun=6
    let startDow = (firstDay.getDay() + 6) % 7;

    // Empty cells before the 1st
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('span');
      empty.className = 'calendar__day calendar__day--empty';
      grid.appendChild(empty);
    }

    // Max allowed date: 2 months from now
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const btn = document.createElement('button');
      btn.className = 'calendar__day';
      btn.textContent = d;

      const dow = (date.getDay() + 6) % 7; // 0=Mon ... 6=Sun

      // Weekend
      if (dow >= 5) btn.classList.add('calendar__day--weekend');

      // Today
      if (sameDay(date, today)) btn.classList.add('calendar__day--today');

      // Selected
      if (selectedDate && sameDay(date, selectedDate)) btn.classList.add('calendar__day--selected');

      // Disabled: past or beyond 2-month window
      if (date < today || date > maxDate) {
        btn.classList.add('calendar__day--disabled');
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => onDateSelect(date, container));
      }

      grid.appendChild(btn);
    }

    container.appendChild(grid);

    // Disable prev button if we're at the current month
    if (viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()) {
      prevBtn.disabled = true;
      prevBtn.classList.add('calendar__nav--disabled');
    }
    // Disable next if at maxDate month
    if (viewDate.getFullYear() === maxDate.getFullYear() && viewDate.getMonth() === maxDate.getMonth()) {
      nextBtn.disabled = true;
      nextBtn.classList.add('calendar__nav--disabled');
    }
  }

  /** Keep viewDate within the allowed range */
  function clampViewDate() {
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    if (viewDate < minMonth) viewDate = new Date(minMonth);
    if (viewDate > maxMonth) viewDate = new Date(maxMonth);
  }

  /* ---------- Slot panel ---------- */
  function buildSlotPanel() {
    const panel = document.createElement('div');
    panel.className = 'booking__panel';
    panel.dataset.panel = '2';

    // Back button
    const back = document.createElement('button');
    back.className = 'booking__back';
    back.innerHTML = '&larr; Choisir une autre date';
    back.addEventListener('click', () => goToStep(1));
    panel.appendChild(back);

    const heading = document.createElement('h3');
    heading.className = 'booking__slot-heading';
    panel.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'slots';
    panel.appendChild(grid);

    const noSlots = document.createElement('p');
    noSlots.className = 'booking__no-slots';
    noSlots.textContent = 'Aucun créneau disponible pour cette date.';
    noSlots.style.display = 'none';
    panel.appendChild(noSlots);

    return panel;
  }

  /* ---------- Form panel ---------- */
  function buildFormPanel() {
    const panel = document.createElement('div');
    panel.className = 'booking__panel';
    panel.dataset.panel = '3';

    // Back button
    const back = document.createElement('button');
    back.className = 'booking__back';
    back.innerHTML = '&larr; Choisir un autre créneau';
    back.addEventListener('click', () => goToStep(2));
    panel.appendChild(back);

    const heading = document.createElement('h3');
    heading.className = 'booking__form-heading';
    panel.appendChild(heading);

    const form = document.createElement('form');
    form.className = 'booking__form';
    form.setAttribute('novalidate', '');

    // --- Name ---
    form.appendChild(buildField('name', 'Nom', 'text', 'Votre nom complet'));
    // --- Phone ---
    form.appendChild(buildField('phone', 'Téléphone', 'tel', '06 12 34 56 78'));
    // --- Email ---
    form.appendChild(buildField('email', 'Email', 'email', 'vous@exemple.com'));
    // --- Subject (select) ---
    form.appendChild(buildSelect('subject', 'Objet'));

    // --- Submit ---
    const submitRow = document.createElement('div');
    submitRow.className = 'form__group';
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn--primary booking__submit';
    submitBtn.textContent = 'Confirmer la réservation';
    submitRow.appendChild(submitBtn);
    form.appendChild(submitRow);

    // --- Form error ---
    const formError = document.createElement('p');
    formError.className = 'booking__form-error';
    form.appendChild(formError);

    form.addEventListener('submit', onFormSubmit);
    panel.appendChild(form);

    return panel;
  }

  /** Create a text/email/tel input field with label */
  function buildField(name, label, type, placeholder) {
    const group = document.createElement('div');
    group.className = 'form__group';

    const lbl = document.createElement('label');
    lbl.className = 'form__label';
    lbl.setAttribute('for', `booking-${name}`);
    lbl.innerHTML = `${label} <span class="required">*</span>`;

    const input = document.createElement('input');
    input.className = 'form__input';
    input.type = type;
    input.id = `booking-${name}`;
    input.name = name;
    input.placeholder = placeholder;
    input.required = true;

    const error = document.createElement('span');
    error.className = 'form__error';
    error.dataset.for = name;

    group.appendChild(lbl);
    group.appendChild(input);
    group.appendChild(error);
    return group;
  }

  /** Create the subject select field */
  function buildSelect(name, label) {
    const group = document.createElement('div');
    group.className = 'form__group';

    const lbl = document.createElement('label');
    lbl.className = 'form__label';
    lbl.setAttribute('for', `booking-${name}`);
    lbl.innerHTML = `${label} <span class="required">*</span>`;

    const select = document.createElement('select');
    select.className = 'form__select';
    select.id = `booking-${name}`;
    select.name = name;
    select.required = true;

    SUBJECTS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.label;
      if (!s.value) opt.disabled = true, opt.selected = true;
      select.appendChild(opt);
    });

    const error = document.createElement('span');
    error.className = 'form__error';
    error.dataset.for = name;

    group.appendChild(lbl);
    group.appendChild(select);
    group.appendChild(error);
    return group;
  }

  /* ---------- Success state ---------- */
  function buildSuccess() {
    const div = document.createElement('div');
    div.className = 'booking__success';

    div.innerHTML = `
      <div class="booking__success-icon">
        <svg viewBox="0 0 52 52" class="booking__checkmark">
          <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" stroke-width="2"/>
          <path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
                stroke-linejoin="round" d="M14 27l7 7 16-16"/>
        </svg>
      </div>
      <h3 class="booking__success-title">Réservation confirmée !</h3>
      <p class="booking__success-text">Vous recevrez un email de confirmation avec les détails de votre rendez-vous.</p>
      <button class="btn btn--outline booking__restart" type="button">Faire une nouvelle réservation</button>
    `;

    return div;
  }

  /* ------------------------------------------
     Event handlers
     ------------------------------------------ */

  /** Called when a date is clicked in the calendar */
  async function onDateSelect(date, calContainer) {
    selectedDate = date;
    selectedSlot = null;

    // Re-render calendar to show selection
    renderCalendar(calContainer);

    // Move to step 2 and load slots
    goToStep(2);
    showLoading(true);

    try {
      const dateStr = formatDate(date);
      const slots = await fetchSlots(dateStr);
      renderSlots(slots, dateStr);
    } catch (err) {
      console.error('Error fetching slots:', err);
      renderSlots([], formatDate(date));
    } finally {
      showLoading(false);
    }
  }

  /** Render fetched time slots into the slot panel */
  function renderSlots(slots, dateStr) {
    const root = document.querySelector('.booking');
    const panel = root.querySelector('[data-panel="2"]');
    const heading = panel.querySelector('.booking__slot-heading');
    const grid = panel.querySelector('.slots');
    const noSlots = panel.querySelector('.booking__no-slots');

    // Parse date for display
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    heading.textContent = `Créneaux disponibles — ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;

    grid.innerHTML = '';

    if (!slots.length) {
      noSlots.style.display = 'block';
      return;
    }

    noSlots.style.display = 'none';

    slots.forEach(time => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = time;
      btn.addEventListener('click', () => {
        selectedSlot = time;
        // Remove previous selection
        grid.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');

        // After a short visual delay, advance to step 3
        setTimeout(() => goToStep(3), 300);
      });
      grid.appendChild(btn);
    });
  }

  /** Validate and submit the booking form */
  async function onFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const form = e.target;
    const name = form.querySelector('#booking-name').value.trim();
    const phone = form.querySelector('#booking-phone').value.trim();
    const email = form.querySelector('#booking-email').value.trim();
    const subject = form.querySelector('#booking-subject').value;

    let valid = true;

    if (!name) {
      showFieldError('name', 'Le nom est requis.');
      valid = false;
    }
    if (!phone) {
      showFieldError('phone', 'Le téléphone est requis.');
      valid = false;
    } else if (!isValidPhone(phone)) {
      showFieldError('phone', 'Numéro de téléphone invalide.');
      valid = false;
    }
    if (!email) {
      showFieldError('email', "L'email est requis.");
      valid = false;
    } else if (!isValidEmail(email)) {
      showFieldError('email', 'Adresse email invalide.');
      valid = false;
    }
    if (!subject) {
      showFieldError('subject', 'Veuillez choisir un objet.');
      valid = false;
    }

    if (!valid) return;

    showLoading(true);

    try {
      const result = await submitBooking({
        date: formatDate(selectedDate),
        time: selectedSlot,
        name,
        phone,
        email,
        subject
      });

      showLoading(false);

      if (result.success) {
        showSuccess();
      } else {
        showFormError(result.message || 'Une erreur est survenue.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      showLoading(false);
      showFormError('Impossible de contacter le serveur. Veuillez réessayer.');
    }
  }

  /* ------------------------------------------
     UI state helpers
     ------------------------------------------ */

  /** Navigate to a given step (1, 2, or 3) */
  function goToStep(step) {
    const root = document.querySelector('.booking');
    if (!root) return;

    currentStep = step;

    // Update stepper
    root.querySelectorAll('.booking__step').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s === step) el.classList.add('active');
      if (s < step) el.classList.add('done');
    });

    // Update stepper lines
    root.querySelectorAll('.booking__stepper-line').forEach((line, i) => {
      line.classList.toggle('done', i + 1 < step);
    });

    // Update panels
    root.querySelectorAll('.booking__panel').forEach(p => {
      const ps = parseInt(p.dataset.panel);
      p.classList.remove('active', 'slide-left', 'slide-right');
      if (ps === step) {
        p.classList.add('active');
      }
    });

    // Update form heading if going to step 3
    if (step === 3 && selectedDate && selectedSlot) {
      const heading = root.querySelector('.booking__form-heading');
      const d = selectedDate;
      heading.textContent =
        `Réservation le ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()} à ${selectedSlot}`;
    }

    // Hide success when navigating
    const success = root.querySelector('.booking__success');
    if (success) success.classList.remove('visible');
  }

  /** Show/hide the loading overlay */
  function showLoading(show) {
    const el = document.querySelector('.booking__loading');
    if (el) el.classList.toggle('visible', show);
  }

  /** Show the success state */
  function showSuccess() {
    const root = document.querySelector('.booking');
    const success = root.querySelector('.booking__success');
    success.classList.add('visible');

    // Hide panels
    root.querySelectorAll('.booking__panel').forEach(p => p.classList.remove('active'));

    // Restart button
    const restartBtn = success.querySelector('.booking__restart');
    restartBtn.onclick = () => {
      // Reset state
      selectedDate = null;
      selectedSlot = null;
      currentStep = 1;

      // Reset form
      const form = root.querySelector('.booking__form');
      if (form) form.reset();
      clearFormErrors();

      // Re-render calendar
      const cal = root.querySelector('.calendar');
      if (cal) renderCalendar(cal);

      // Go back to step 1
      success.classList.remove('visible');
      goToStep(1);
    };
  }

  /** Show a field-level error */
  function showFieldError(fieldName, message) {
    const root = document.querySelector('.booking');
    const errorEl = root.querySelector(`.form__error[data-for="${fieldName}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    const input = root.querySelector(`#booking-${fieldName}`);
    if (input) input.classList.add('error');
  }

  /** Show a form-level error */
  function showFormError(message) {
    const el = document.querySelector('.booking__form-error');
    if (el) {
      el.textContent = message;
      el.classList.add('visible');
    }
  }

  /** Clear all form errors */
  function clearFormErrors() {
    const root = document.querySelector('.booking');
    if (!root) return;
    root.querySelectorAll('.form__error').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
    root.querySelectorAll('.form__input, .form__select').forEach(el => {
      el.classList.remove('error');
    });
    const formErr = root.querySelector('.booking__form-error');
    if (formErr) {
      formErr.textContent = '';
      formErr.classList.remove('visible');
    }
  }

  /* ------------------------------------------
     Initialization
     ------------------------------------------ */

  function init() {
    // Find all placeholder elements with data-booking attribute or class "booking-mount"
    const mountPoints = document.querySelectorAll('[data-booking], .booking-mount');

    if (!mountPoints.length) {
      // If no mount point, try a generic container with id="booking"
      const container = document.getElementById('booking');
      if (container) {
        container.appendChild(buildBookingWidget());
      }
      return;
    }

    mountPoints.forEach(mount => {
      mount.appendChild(buildBookingWidget());
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

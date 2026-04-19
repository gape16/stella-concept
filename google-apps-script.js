/**
 * ============================================
 * STELLA'CONCEPT - Google Apps Script
 * Systeme de reservation connecte a Google Agenda
 * ============================================
 *
 * INSTRUCTIONS D'INSTALLATION :
 *
 * 1. Aller sur https://script.google.com
 * 2. Ouvrir le projet lie, OU creer un nouveau projet
 * 3. Copier-coller tout ce code
 * 4. Modifier CALENDAR_ID ci-dessous avec l'email du Google Agenda d'Estelle
 * 5. Modifier NOTIFICATION_EMAIL avec l'email ou recevoir les notifications
 * 6. Cliquer sur "Deployer" > "Gerer les deploiements" > creer une NOUVELLE version
 * 7. Type: "Application Web"
 * 8. Executer en tant que: "Moi"
 * 9. Acces: "Tout le monde"
 * 10. Conserver la meme URL dans reservation.html / calculateur.html
 *
 * GESTION DES CRENEAUX :
 * - Horaires par defaut : creneaux de 2h, Lundi-Jeudi 09h/11h/12h/14h/16h,
 *   Vendredi 09h/11h uniquement (pas d'apres-midi), Samedi-Dimanche ferme.
 * - Estelle peut surcharger en creant des evenements "DISPO" dans l'agenda.
 * - Les creneaux reserves (evenements non-"DISPO") sont automatiquement filtres.
 */

// ====== CONFIGURATION ======
var CALENDAR_ID = 'contact.stellaconcept@gmail.com';
var NOTIFICATION_EMAIL = 'contact.stellaconcept@gmail.com';
var SLOT_DURATION = 120; // Duree d'un creneau en minutes (2h)
var TIMEZONE = 'Europe/Paris';
var SITE_URL = 'https://www.stella-concept.fr';
var LOGO_URL = 'https://www.stella-concept.fr/img/logotype_primaire.png';
var PHONE_DISPLAY = '06 17 02 67 69';

// Creneaux par defaut de 2h, lun-jeu inclusifs, ven matin seulement, WE ferme.
var DEFAULT_SLOTS = {
  1: ['09:00', '11:00', '12:00', '14:00', '16:00'], // Lundi
  2: ['09:00', '11:00', '12:00', '14:00', '16:00'], // Mardi
  3: ['09:00', '11:00', '12:00', '14:00', '16:00'], // Mercredi
  4: ['09:00', '11:00', '12:00', '14:00', '16:00'], // Jeudi
  5: ['09:00', '11:00'],                              // Vendredi (matin uniquement)
  6: [], // Samedi
  0: []  // Dimanche
};

// ====== ROUTES ======
function doGet(e) {
  var action = e.parameter.action;

  if (action === 'slots') {
    return getSlots(e.parameter.date);
  }

  return jsonResponse({ error: 'Action non reconnue' }, 400);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  if (data.action === 'book') {
    return bookSlot(data);
  }

  if (data.action === 'callback') {
    return handleCallback(data);
  }

  return jsonResponse({ error: 'Action non reconnue' }, 400);
}

// ====== GET AVAILABLE SLOTS ======
function getSlots(dateStr) {
  try {
    var date = new Date(dateStr + 'T00:00:00');
    var dayOfWeek = date.getDay();

    var possibleSlots = DEFAULT_SLOTS[dayOfWeek] || [];
    if (possibleSlots.length === 0) {
      return jsonResponse({ slots: [] });
    }

    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (calendar) {
      var events = calendar.getEventsForDay(date);
      var dispoEvents = events.filter(function(ev) {
        return ev.getTitle().toUpperCase().indexOf('DISPO') !== -1;
      });

      // Si des evenements DISPO existent, utiliser uniquement ceux-la
      if (dispoEvents.length > 0) {
        possibleSlots = [];
        dispoEvents.forEach(function(ev) {
          var start = ev.getStartTime();
          var end = ev.getEndTime();
          var current = new Date(start);
          while (current < end) {
            var hh = ('0' + current.getHours()).slice(-2);
            var mm = ('0' + current.getMinutes()).slice(-2);
            possibleSlots.push(hh + ':' + mm);
            current = new Date(current.getTime() + SLOT_DURATION * 60000);
          }
        });
      }

      // Retirer les creneaux deja reserves (evenements NON "DISPO")
      var bookedSlots = [];
      events.forEach(function(ev) {
        if (ev.getTitle().toUpperCase().indexOf('DISPO') === -1) {
          var start = ev.getStartTime();
          var hh = ('0' + start.getHours()).slice(-2);
          var mm = ('0' + start.getMinutes()).slice(-2);
          bookedSlots.push(hh + ':' + mm);
        }
      });

      possibleSlots = possibleSlots.filter(function(slot) {
        return bookedSlots.indexOf(slot) === -1;
      });
    }

    // Retirer les creneaux passes si c'est aujourd'hui
    var now = new Date();
    if (date.toDateString() === now.toDateString()) {
      var currentHH = now.getHours();
      var currentMM = now.getMinutes();
      possibleSlots = possibleSlots.filter(function(slot) {
        var parts = slot.split(':');
        var slotHH = parseInt(parts[0]);
        var slotMM = parseInt(parts[1]);
        return (slotHH > currentHH) || (slotHH === currentHH && slotMM > currentMM);
      });
    }

    return jsonResponse({ slots: possibleSlots.sort() });

  } catch (err) {
    return jsonResponse({ error: err.message, slots: [] });
  }
}

// ====== BOOK A SLOT ======
function bookSlot(data) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      return jsonResponse({ success: false, message: 'Calendrier non trouve.' });
    }

    var civility = (data.civility || '').trim();
    var civilityLabel = formatCivility(civility);
    var fullSalutation = civilityLabel ? (civilityLabel + ' ' + data.name) : data.name;

    // Creer l'evenement (sans inviter le guest pour eviter une invitation Calendar auto)
    var startTime = new Date(data.date + 'T' + data.time + ':00');
    var endTime = new Date(startTime.getTime() + SLOT_DURATION * 60000);

    var title = "RDV Stella'Concept - " + fullSalutation;
    var description = 'Nom: ' + fullSalutation + '\n'
      + 'Telephone: ' + data.phone + '\n'
      + 'Email: ' + data.email + '\n'
      + 'Objet: ' + data.subject + '\n'
      + (data.message ? 'Message: ' + data.message : '');

    calendar.createEvent(title, startTime, endTime, {
      description: description
    });

    var dateFormatted = Utilities.formatDate(startTime, TIMEZONE, 'dd/MM/yyyy');
    var timeFormatted = Utilities.formatDate(startTime, TIMEZONE, 'HH:mm');
    var timeEndFormatted = Utilities.formatDate(endTime, TIMEZONE, 'HH:mm');

    // Notification admin
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: 'Nouvelle reservation - ' + fullSalutation,
      htmlBody: buildAdminEmail({
        title: 'Nouvelle reservation sur Stella\'Concept',
        lines: [
          { label: 'Date', value: dateFormatted + ' de ' + timeFormatted + ' a ' + timeEndFormatted },
          { label: 'Civilite', value: civilityLabel || '(non precisee)' },
          { label: 'Nom', value: data.name },
          { label: 'Telephone', value: data.phone },
          { label: 'Email', value: data.email },
          { label: 'Objet', value: data.subject || '-' },
          data.message ? { label: 'Message', value: data.message } : null
        ]
      })
    });

    // Confirmation client
    if (data.email) {
      MailApp.sendEmail({
        to: data.email,
        subject: 'Confirmation de votre rendez-vous - Stella\'Concept',
        htmlBody: buildClientEmail({
          salutation: fullSalutation,
          heading: 'Votre rendez-vous est confirme !',
          bodyHtml: ''
            + '<p>Votre appel decouverte est prevu le <strong>' + dateFormatted
            + '</strong> de <strong>' + timeFormatted + '</strong> a <strong>' + timeEndFormatted + '</strong>.</p>'
            + (data.subject ? '<p><strong>Objet :</strong> ' + escapeHtml(data.subject) + '</p>' : '')
            + '<p>Estelle vous contactera au numero que vous avez indique. Si vous souhaitez modifier ou annuler, ecrivez a '
            + '<a href="mailto:' + NOTIFICATION_EMAIL + '">' + NOTIFICATION_EMAIL + '</a> ou appelez le '
            + PHONE_DISPLAY + '.</p>'
        })
      });
    }

    return jsonResponse({
      success: true,
      message: 'Votre reservation est confirmee pour le ' + dateFormatted + ' de ' + timeFormatted + ' a ' + timeEndFormatted + '.'
    });

  } catch (err) {
    return jsonResponse({ success: false, message: 'Erreur: ' + err.message });
  }
}

// ====== HANDLE CALLBACK REQUEST (from calculator) ======
function handleCallback(data) {
  try {
    var civility = (data.civility || '').trim();
    var civilityLabel = formatCivility(civility);
    var fullSalutation = civilityLabel ? (civilityLabel + ' ' + data.name) : data.name;

    var calc = data.calculator || {};
    var estimation = '';
    if (calc.estimation_min && calc.estimation_max) {
      estimation = Math.round(calc.estimation_min).toLocaleString('fr-FR') + ' - '
                 + Math.round(calc.estimation_max).toLocaleString('fr-FR') + ' EUR';
    }

    var calcLines = [
      calc.bien ? { label: 'Type de bien', value: calc.bien } : null,
      calc.nature ? { label: 'Nature des travaux', value: calc.nature } : null,
      calc.surface ? { label: 'Surface', value: calc.surface + ' m2' } : null,
      calc.age ? { label: 'Age du batiment', value: calc.age } : null,
      calc.commune ? { label: 'Commune', value: calc.commune } : null,
      calc.finition ? { label: 'Niveau de finition', value: calc.finition } : null,
      (calc.postes && calc.postes.length) ? { label: 'Postes', value: calc.postes.join(', ') } : null,
      (calc.contraintes && calc.contraintes.length) ? { label: 'Contraintes', value: calc.contraintes.join(', ') } : null,
      estimation ? { label: 'Estimation (+/-15%)', value: estimation } : null
    ].filter(Boolean);

    // Email admin
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: 'Demande de rappel - ' + fullSalutation,
      htmlBody: buildAdminEmail({
        title: 'Demande de rappel via le calculateur',
        lines: [
          { label: 'Civilite', value: civilityLabel || '(non precisee)' },
          { label: 'Nom', value: data.name },
          { label: 'Telephone', value: data.phone },
          data.email ? { label: 'Email', value: data.email } : null,
          data.preferred_slot ? { label: 'Creneau prefere', value: data.preferred_slot } : null,
          { label: '---', value: '' },
          { label: 'Profil projet', value: '' }
        ].concat(calcLines).filter(function (l) { return l !== null; })
      })
    });

    // Confirmation client (facultative, seulement si email fourni)
    if (data.email) {
      MailApp.sendEmail({
        to: data.email,
        subject: 'Votre demande de rappel - Stella\'Concept',
        htmlBody: buildClientEmail({
          salutation: fullSalutation,
          heading: 'Votre demande de rappel est bien recue',
          bodyHtml: ''
            + '<p>Merci d\'avoir utilise mon calculateur. Je vous rappelle sous 24 a 48 heures au numero indique pour affiner votre estimation et repondre a toutes vos questions.</p>'
            + (data.preferred_slot ? '<p><strong>Creneau prefere :</strong> ' + escapeHtml(data.preferred_slot) + '</p>' : '')
            + '<p>A tres vite,</p>'
        })
      });
    }

    return jsonResponse({ success: true, message: 'Demande de rappel enregistree.' });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Erreur: ' + err.message });
  }
}

// ====== EMAIL HELPERS ======
function formatCivility(c) {
  if (!c) return '';
  var key = c.toLowerCase();
  if (key === 'madame' || key === 'mme') return 'Madame';
  if (key === 'monsieur' || key === 'm.' || key === 'mr' || key === 'm') return 'Monsieur';
  return c;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailHeader() {
  return ''
    + '<div style="text-align:center; padding: 16px 0;">'
    + '<a href="' + SITE_URL + '" target="_blank" style="display:inline-block;">'
    + '<img src="' + LOGO_URL + '" alt="Stella\'Concept" style="max-width:180px; height:auto; display:block; margin:0 auto;">'
    + '</a>'
    + '</div>';
}

function emailFooter() {
  return ''
    + '<hr style="border:none; border-top:1px solid #e8e6e9; margin:28px 0 16px;">'
    + '<p style="color:#7a7a7a; font-size:12px; margin:0; text-align:center;">'
    + 'Stella\'Concept &middot; Angouleme (Charente) &middot; '
    + '<a href="' + SITE_URL + '" style="color:#C0428A; text-decoration:none;">stella-concept.fr</a> &middot; '
    + PHONE_DISPLAY
    + '</p>';
}

function buildClientEmail(opts) {
  var body = ''
    + '<div style="font-family: Arial, sans-serif; color:#2a232c; max-width:580px; margin:0 auto; padding: 0 16px;">'
    + emailHeader()
    + '<h2 style="font-family: Arial, sans-serif; color:#544957; margin: 0 0 16px;">' + escapeHtml(opts.heading) + '</h2>'
    + '<p style="font-size:15px; line-height:1.6;">Bonjour ' + escapeHtml(opts.salutation) + ',</p>'
    + '<div style="font-size:15px; line-height:1.65;">' + opts.bodyHtml + '</div>'
    + '<p style="font-size:15px; line-height:1.6;">Estelle<br><em>Stella\'Concept</em></p>'
    + '<p style="margin-top:24px;">'
    + '<a href="' + SITE_URL + '" style="background: linear-gradient(135deg,#C0428A,#F1980D); color:#fff; padding: 10px 18px; text-decoration:none; border-radius: 8px; font-weight:600; display:inline-block;">Retourner sur stella-concept.fr</a>'
    + '</p>'
    + emailFooter()
    + '</div>';
  return body;
}

function buildAdminEmail(opts) {
  var linesHtml = '';
  opts.lines.filter(function (l) { return l != null; }).forEach(function (line) {
    if (line.label === '---') {
      linesHtml += '<tr><td colspan="2" style="padding: 12px 0;"><hr style="border:none; border-top:1px dashed #ccc; margin:0;"></td></tr>';
      return;
    }
    if (!line.value && line.value !== 0) {
      linesHtml += '<tr><td colspan="2" style="padding: 8px 0; font-weight:700; color:#544957;">' + escapeHtml(line.label) + '</td></tr>';
      return;
    }
    linesHtml += '<tr>'
      + '<td style="padding: 6px 12px 6px 0; font-weight:600; color:#544957; vertical-align:top; white-space:nowrap;">' + escapeHtml(line.label) + '</td>'
      + '<td style="padding: 6px 0; color:#2a232c; vertical-align:top;">' + escapeHtml(line.value) + '</td>'
      + '</tr>';
  });

  return ''
    + '<div style="font-family: Arial, sans-serif; color:#2a232c; max-width:580px; margin:0 auto; padding: 0 16px;">'
    + emailHeader()
    + '<h2 style="color:#544957; margin: 0 0 16px;">' + escapeHtml(opts.title) + '</h2>'
    + '<table style="border-collapse:collapse; width:100%; font-size:14px;">' + linesHtml + '</table>'
    + emailFooter()
    + '</div>';
}

// ====== UTILS ======
function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

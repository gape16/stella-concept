/**
 * ============================================
 * STELLA'CONCEPT - Google Apps Script
 * Systeme de reservation connecte a Google Agenda
 * ============================================
 *
 * INSTRUCTIONS D'INSTALLATION :
 *
 * 1. Aller sur https://script.google.com
 * 2. Creer un nouveau projet
 * 3. Copier-coller tout ce code
 * 4. Modifier CALENDAR_ID ci-dessous avec l'email du Google Agenda d'Estelle
 * 5. Modifier NOTIFICATION_EMAIL avec l'email ou recevoir les notifications
 * 6. Cliquer sur "Deployer" > "Nouveau deploiement"
 * 7. Type: "Application Web"
 * 8. Executer en tant que: "Moi"
 * 9. Acces: "Tout le monde"
 * 10. Copier l'URL du deploiement
 * 11. Coller cette URL dans reservation.html (window.BOOKING_SCRIPT_URL)
 *
 * GESTION DES CRENEAUX :
 * - Estelle definit ses disponibilites dans Google Agenda
 * - Creer des evenements intitules "DISPO" aux horaires disponibles
 * - Le systeme lira ces creneaux et les proposera aux visiteurs
 * - Quand un visiteur reserve, l'evenement "DISPO" est remplace par le RDV
 */

// ====== CONFIGURATION ======
var CALENDAR_ID = 'estelle@gmail.com'; // Remplacer par l'email du Google Agenda
var NOTIFICATION_EMAIL = 'estelle@gmail.com'; // Email pour les notifications
var SLOT_DURATION = 30; // Duree d'un creneau en minutes
var TIMEZONE = 'Europe/Paris';

// Creneaux par defaut si pas d'evenements "DISPO" dans l'agenda
// (Lundi-Vendredi, matin et apres-midi)
var DEFAULT_SLOTS = {
  1: ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'], // Lundi
  2: ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'], // Mardi
  3: ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'], // Mercredi
  4: ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'], // Jeudi
  5: ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'], // Vendredi
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

  return jsonResponse({ error: 'Action non reconnue' }, 400);
}

// ====== GET AVAILABLE SLOTS ======
function getSlots(dateStr) {
  try {
    var date = new Date(dateStr + 'T00:00:00');
    var dayOfWeek = date.getDay();

    // Pas de creneaux le weekend par defaut
    var possibleSlots = DEFAULT_SLOTS[dayOfWeek] || [];
    if (possibleSlots.length === 0) {
      return jsonResponse({ slots: [] });
    }

    // Verifier le calendrier pour les evenements "DISPO" personnalises
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

    // Creer l'evenement
    var startTime = new Date(data.date + 'T' + data.time + ':00');
    var endTime = new Date(startTime.getTime() + SLOT_DURATION * 60000);

    var title = 'RDV Stella\'Concept - ' + data.name;
    var description = 'Nom: ' + data.name + '\n'
      + 'Telephone: ' + data.phone + '\n'
      + 'Email: ' + data.email + '\n'
      + 'Objet: ' + data.subject + '\n'
      + (data.message ? 'Message: ' + data.message : '');

    calendar.createEvent(title, startTime, endTime, {
      description: description,
      guests: data.email
    });

    // Envoyer notification a Estelle
    var dateFormatted = Utilities.formatDate(startTime, TIMEZONE, 'dd/MM/yyyy');
    var timeFormatted = Utilities.formatDate(startTime, TIMEZONE, 'HH:mm');

    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: 'Nouvelle reservation - ' + data.name,
      htmlBody: '<h2>Nouvelle reservation sur Stella\'Concept</h2>'
        + '<p><strong>Date:</strong> ' + dateFormatted + ' a ' + timeFormatted + '</p>'
        + '<p><strong>Nom:</strong> ' + data.name + '</p>'
        + '<p><strong>Telephone:</strong> ' + data.phone + '</p>'
        + '<p><strong>Email:</strong> ' + data.email + '</p>'
        + '<p><strong>Objet:</strong> ' + data.subject + '</p>'
        + (data.message ? '<p><strong>Message:</strong> ' + data.message + '</p>' : '')
    });

    // Envoyer confirmation au client
    MailApp.sendEmail({
      to: data.email,
      subject: 'Confirmation de votre rendez-vous - Stella\'Concept',
      htmlBody: '<h2>Votre rendez-vous est confirme !</h2>'
        + '<p>Bonjour ' + data.name + ',</p>'
        + '<p>Votre appel decouverte est prevu le <strong>' + dateFormatted + '</strong> a <strong>' + timeFormatted + '</strong>.</p>'
        + '<p><strong>Objet:</strong> ' + data.subject + '</p>'
        + '<p>Estelle vous contactera au numero indique. Si vous avez besoin de modifier ou annuler, contactez-nous au 06 17 02 67 69.</p>'
        + '<p>A tres bientot !</p>'
        + '<p><em>Stella\'Concept</em></p>'
    });

    return jsonResponse({
      success: true,
      message: 'Votre reservation est confirmee pour le ' + dateFormatted + ' a ' + timeFormatted + '.'
    });

  } catch (err) {
    return jsonResponse({ success: false, message: 'Erreur: ' + err.message });
  }
}

// ====== UTILS ======
function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

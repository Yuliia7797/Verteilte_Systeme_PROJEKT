/*
  Datei: login.js
  Beschreibung: Diese Datei steuert die clientseitige Logik des Login-Formulars.
    Sie liest die eingegebenen Anmeldedaten (E-Mail und Passwort) aus dem Formular,
    sendet sie per HTTP-POST-Request an den Server und verarbeitet die Antwort:
    - Bei erfolgreichem Login wird der Benutzer auf die Startseite weitergeleitet.
    - Bei ungültigen Anmeldedaten wird eine Fehlermeldung angezeigt.
    - Bei einem Netzwerk- oder Serverfehler wird eine allgemeine Fehlermeldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

// Warten bis das HTML vollständig geladen ist, bevor auf DOM-Elemente zugegriffen wird
document.addEventListener('DOMContentLoaded', () => {
  // Referenzen auf das Formular und das Meldungs-Element holen
  const formular = document.getElementById('login-form');
  const meldung = document.getElementById('meldung');

  // Event-Listener für das Absenden des Login-Formulars registrieren
  formular.addEventListener('submit', async (event) => {
    // Standard-Formularverhalten (Seitenneuladen) verhindern
    event.preventDefault();

    // Meldungsfeld zurücksetzen, bevor ein neuer Login-Versuch gestartet wird
    meldung.textContent = '';
    meldung.className = 'mt-3 text-center';

    // Eingabewerte aus dem Formular auslesen
    const daten = {
      email: document.getElementById('email').value.trim(), // Leerzeichen am Rand entfernen
      passwort: document.getElementById('passwort').value
    };

    try {
      // Login-Anfrage als JSON an den Server senden
      const response = await fetch('/benutzer/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(daten)
      });

      // Antwort des Servers als JSON parsen
      const ergebnis = await response.json();

      if (response.ok) {
        // Login erfolgreich: Erfolgsmeldung anzeigen und nach 1 Sekunde weiterleiten
        meldung.textContent = 'Login erfolgreich.';
        meldung.classList.add('text-success');

        setTimeout(() => {
          weiterleiten('/static'); // Weiterleitung zur Startseite
        }, 1000);
      } else {
        // Login fehlgeschlagen: Fehlermeldung vom Server anzeigen
        meldung.textContent = ergebnis.message || 'Login fehlgeschlagen.';
        meldung.classList.add('text-danger');
      }
    } catch (error) {
      // Netzwerk- oder Serverfehler abfangen und allgemeine Meldung ausgeben
      console.error('Fehler beim Login:', error);
      meldung.textContent = 'Serverfehler. Bitte später erneut versuchen.';
      meldung.classList.add('text-danger');
    }
  });
});
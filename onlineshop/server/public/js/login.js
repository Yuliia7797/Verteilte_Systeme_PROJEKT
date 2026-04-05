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

/**
 * Initialisiert das Login-Formular nach dem Laden des DOM.
 * Registriert den Submit-Handler und verarbeitet Login-Anfragen.
 */
document.addEventListener('DOMContentLoaded', () => {
  const formular = document.getElementById('login-form');
  const meldung = document.getElementById('meldung');

  formular.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Meldungsbereich zurücksetzen
    meldung.textContent = '';
    meldung.className = 'mt-3 text-center';

    const daten = {
      email: document.getElementById('email').value.trim(),
      passwort: document.getElementById('passwort').value
    };

    try {
      const response = await fetch('/benutzer/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(daten)
      });

      const ergebnis = await response.json();

      if (response.ok) {
        meldung.textContent = 'Login erfolgreich.';
        meldung.classList.add('text-success');

        setTimeout(() => {
          weiterleiten('/static');
        }, 1000);
      } else {
        meldung.textContent = ergebnis.message || 'Login fehlgeschlagen.';
        meldung.classList.add('text-danger');
      }
    } catch (error) {
      console.error('Fehler beim Login:', error);
      meldung.textContent = 'Serverfehler. Bitte später erneut versuchen.';
      meldung.classList.add('text-danger');
    }
  });
});
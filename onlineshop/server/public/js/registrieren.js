/*
  Datei: registrieren.js
  Beschreibung: Diese Datei steuert die clientseitige Logik des Registrierungsformulars.
    Sie liest alle eingegebenen Benutzerdaten (Name, E-Mail, Passwort, Adresse) aus dem Formular,
    validiert das Passwort nach definierten Sicherheitsregeln und sendet die Daten per HTTP-POST-Request an den Server:
    - Bei erfolgreicher Registrierung wird eine Bestätigung angezeigt und das Formular geleert.
    - Bei ungültigen Daten oder bereits vorhandener E-Mail wird eine Fehlermeldung angezeigt.
    - Bei einem Netzwerk- oder Serverfehler wird eine allgemeine Fehlermeldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Initialisiert das Registrierungsformular nach dem Laden des DOM.
 * Registriert den Submit-Handler und verarbeitet Registrierungsanfragen.
 */
document.addEventListener('DOMContentLoaded', () => {
  const formular = document.getElementById('registrieren-form');
  const meldung = document.getElementById('meldung');

  formular.addEventListener('submit', async (event) => {
    event.preventDefault();

    meldung.textContent = '';
    meldung.style.color = 'black';

    const passwort = document.getElementById('passwort').value;
    const passwortRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    if (!passwortRegex.test(passwort)) {
      meldung.textContent = 'Das Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten.';
      meldung.style.color = 'red';
      return;
    }

    const daten = {
      vorname: document.getElementById('vorname').value.trim(),
      nachname: document.getElementById('nachname').value.trim(),
      email: document.getElementById('email').value.trim(),
      passwort: passwort,
      strasse: document.getElementById('strasse').value.trim(),
      hausnummer: document.getElementById('hausnummer').value.trim(),
      adresszusatz: document.getElementById('adresszusatz').value.trim(),
      postleitzahl: document.getElementById('postleitzahl').value.trim(),
      ort: document.getElementById('ort').value.trim(),
      land: document.getElementById('land').value.trim()
    };

    try {
      const response = await fetch('/benutzer/registrieren', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(daten)
      });

      const ergebnis = await response.json();

      if (response.ok) {
        meldung.textContent = 'Registrierung erfolgreich. Du kannst dich jetzt anmelden.';
        meldung.style.color = 'green';
        formular.reset();
      } else {
        meldung.textContent = ergebnis.message || 'Registrierung fehlgeschlagen.';
        meldung.style.color = 'red';
      }
    } catch (error) {
      console.error('Fehler bei der Registrierung:', error);
      meldung.textContent = 'Serverfehler. Bitte später erneut versuchen.';
      meldung.style.color = 'red';
    }
  });
});
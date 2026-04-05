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

// Warten bis das HTML vollständig geladen ist, bevor auf DOM-Elemente zugegriffen wird
document.addEventListener('DOMContentLoaded', () => {
  // Referenzen auf das Formular und das Meldungs-Element holen
  const formular = document.getElementById('registrieren-form');
  const meldung = document.getElementById('meldung');

  // Event-Listener für das Absenden des Registrierungsformulars registrieren
  formular.addEventListener('submit', async (event) => {
    // Standard-Formularverhalten (Seitenneuladen) verhindern
    event.preventDefault();

    // Meldungsfeld zurücksetzen, bevor ein neuer Versuch gestartet wird
    meldung.textContent = '';
    meldung.style.color = 'black';

    // Passwort aus dem Formular auslesen
    const passwort = document.getElementById('passwort').value;

    // Regex-Regel: mind. 8 Zeichen, ein Großbuchstabe, eine Zahl, ein Sonderzeichen
    const passwortRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    // Passwort gegen die Sicherheitsregel prüfen – bei Fehler Meldung anzeigen und abbrechen
    if (!passwortRegex.test(passwort)) {
      meldung.textContent = 'Das Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten.';
      meldung.style.color = 'red';
      return;
    }

    // Alle Formularfelder auslesen und als Objekt zusammenfassen
    const daten = {
      vorname: document.getElementById('vorname').value.trim(),
      nachname: document.getElementById('nachname').value.trim(),
      email: document.getElementById('email').value.trim(),
      passwort: passwort,
      strasse: document.getElementById('strasse').value.trim(),
      hausnummer: document.getElementById('hausnummer').value.trim(),
      adresszusatz: document.getElementById('adresszusatz').value.trim(), // optional
      postleitzahl: document.getElementById('postleitzahl').value.trim(),
      ort: document.getElementById('ort').value.trim(),
      land: document.getElementById('land').value.trim()
    };

    try {
      // Registrierungsanfrage als JSON an den Server senden
      const response = await fetch('/benutzer/registrieren', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(daten)
      });

      // Antwort des Servers als JSON parsen
      const ergebnis = await response.json();

      if (response.ok) {
        // Registrierung erfolgreich: Bestätigung anzeigen und Formular leeren
        meldung.textContent = 'Registrierung erfolgreich. Du kannst dich jetzt anmelden.';
        meldung.style.color = 'green';
        formular.reset();
      } else {
        // Registrierung fehlgeschlagen: Fehlermeldung vom Server anzeigen
        meldung.textContent = ergebnis.message || 'Registrierung fehlgeschlagen.';
        meldung.style.color = 'red';
      }
    } catch (error) {
      // Netzwerk- oder Serverfehler abfangen und allgemeine Meldung ausgeben
      console.error('Fehler bei der Registrierung:', error);
      meldung.textContent = 'Serverfehler. Bitte später erneut versuchen.';
      meldung.style.color = 'red';
    }
  });
});
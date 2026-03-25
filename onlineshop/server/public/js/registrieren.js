'use strict';

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
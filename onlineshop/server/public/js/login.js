'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const formular = document.getElementById('login-form');
  const meldung = document.getElementById('meldung');

  formular.addEventListener('submit', async (event) => {
    event.preventDefault();

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
          window.location.href = '/static';
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
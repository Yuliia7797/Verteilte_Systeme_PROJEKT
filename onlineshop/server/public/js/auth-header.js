'use strict';

document.addEventListener('includesLoaded', () => {
  aktualisiereHeader();
});

async function aktualisiereHeader() {
  const authWrapper = document.getElementById('auth-buttons-wrapper');
  const loginButton = document.getElementById('nav-login-item');
  const registrierenButton = document.getElementById('nav-registrieren-item');
  const kontoItem = document.getElementById('nav-konto-item');
  const logoutButton = document.getElementById('nav-logout-item');

  if (!authWrapper || !loginButton || !registrierenButton || !kontoItem || !logoutButton) {
    return;
  }

  try {
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (response.ok) {
      loginButton.style.display = 'none';
      registrierenButton.style.display = 'none';
      kontoItem.style.display = '';
      logoutButton.style.display = '';
    } else {
      loginButton.style.display = '';
      registrierenButton.style.display = '';
      kontoItem.style.display = 'none';
      logoutButton.style.display = 'none';
    }
  } catch (error) {
    console.error('Fehler beim Prüfen der Session:', error);
    loginButton.style.display = '';
    registrierenButton.style.display = '';
    kontoItem.style.display = 'none';
    logoutButton.style.display = 'none';
  }

  authWrapper.style.display = 'flex';
  authWrapper.classList.add('align-items-center');

  logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/benutzer/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (response.ok) {
        window.location.href = '/static/login.html';
      } else {
        alert('Logout fehlgeschlagen.');
      }
    } catch (error) {
      console.error('Fehler beim Logout:', error);
      alert('Serverfehler beim Logout.');
    }
  });
}
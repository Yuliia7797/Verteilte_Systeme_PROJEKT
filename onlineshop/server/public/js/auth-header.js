/*
  Datei: auth-header.js
  Beschreibung: Diese Datei steuert die dynamische Anzeige der Navigationsleiste je nach Login-Status.
    Sobald die Seite vollständig geladen ist, wird der Server nach einer aktiven Session gefragt:
    - Ist der Benutzer eingeloggt: Login- und Registrieren-Button werden ausgeblendet, stattdessen werden Konto- und Logout-Button angezeigt.
    - Ist kein Benutzer eingeloggt: Login- und Registrieren-Button werden angezeigt, Konto und Logout werden ausgeblendet.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Markiert eine Navigation, damit beim Verlassen der Seite
 * kein automatischer Logout ausgelöst wird.
 *
 * @function setzeNavigationsflag
 */
function setzeNavigationsflag() {
  sessionStorage.setItem('navigiert', '1');
}

// Speichert, ob der Tab gerade geschlossen oder versteckt wird
let tabWirdGeschlossen = false;

// Erkennt, ob der Tab verborgen oder wieder sichtbar ist
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    tabWirdGeschlossen = true;
  } else {
    tabWirdGeschlossen = false;
  }
});

// Führt beim echten Schließen des Tabs einen Logout per Beacon aus
window.addEventListener('pagehide', () => {
  if (tabWirdGeschlossen && !sessionStorage.getItem('navigiert')) {
    navigator.sendBeacon('/benutzer/logout');
  }

  sessionStorage.removeItem('navigiert');
  tabWirdGeschlossen = false;
});

// Markiert normale Link-Klicks als Navigation
document.addEventListener('click', (event) => {
  if (event.target.closest('a[href]')) {
    setzeNavigationsflag();
  }
});

// Markiert Browser-Navigation über Zurück/Vor als Navigation
window.addEventListener('popstate', () => {
  setzeNavigationsflag();
});

/**
 * Führt eine Weiterleitung durch und setzt vorher das Navigations-Flag.
 *
 * @function weiterleiten
 * @param {string} url - Ziel-URL für die Weiterleitung
 */
function weiterleiten(url) {
  setzeNavigationsflag();
  window.location.href = url;
}

// Aktualisiert den Header, sobald die Includes vollständig geladen sind
document.addEventListener('includesLoaded', () => {
  aktualisiereHeader();
});

/**
 * Prüft den aktuellen Session-Status und passt die sichtbaren
 * Navigationselemente entsprechend an.
 *
 * @async
 * @function aktualisiereHeader
 * @returns {Promise<void>}
 */
async function aktualisiereHeader() {
  const authWrapper = document.getElementById('auth-buttons-wrapper');
  const loginButton = document.getElementById('nav-login-item');
  const registrierenButton = document.getElementById('nav-registrieren-item');
  const kontoItem = document.getElementById('nav-konto-item');
  const adminItem = document.getElementById('nav-admin-item');
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
      const benutzer = await response.json();

      loginButton.style.display = 'none';
      registrierenButton.style.display = 'none';
      kontoItem.style.display = '';
      logoutButton.style.display = '';

      if (adminItem) {
        adminItem.style.display = benutzer.rolle === 'admin' ? '' : 'none';
      }
    } else {
      loginButton.style.display = '';
      registrierenButton.style.display = '';
      kontoItem.style.display = 'none';
      logoutButton.style.display = 'none';

      if (adminItem) {
        adminItem.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Fehler beim Prüfen der Session:', error);

    loginButton.style.display = '';
    registrierenButton.style.display = '';
    kontoItem.style.display = 'none';
    logoutButton.style.display = 'none';

    if (adminItem) {
      adminItem.style.display = 'none';
    }
  }

  authWrapper.style.display = 'flex';
  authWrapper.classList.add('align-items-center');

  // Verknüpft den Logout-Button mit der Logout-Funktion
  logoutButton.addEventListener('click', async (event) => {
    event.preventDefault();
    setzeNavigationsflag();

    try {
      const response = await fetch('/benutzer/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (response.ok) {
        weiterleiten('/static/login.html');
      } else {
        alert('Logout fehlgeschlagen.');
      }
    } catch (error) {
      console.error('Fehler beim Logout:', error);
      alert('Serverfehler beim Logout.');
    }
  });
}
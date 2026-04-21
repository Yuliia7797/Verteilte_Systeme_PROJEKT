/*
  Datei: auth-header.js
  Beschreibung: Diese Datei steuert die dynamische Anzeige der Navigationsleiste je nach Login-Status.
    Sobald die Includes vollständig geladen sind, wird die aktuelle Benutzersession geprüft:
    - Ist der Benutzer eingeloggt, werden Login und Registrieren ausgeblendet
      und stattdessen Konto, Logout und gegebenenfalls Admin angezeigt.
    - Ist kein Benutzer eingeloggt, werden Login und Registrieren angezeigt
      und geschützte Navigationseinträge ausgeblendet.
    Zusätzlich wird beim echten Schließen des Tabs ein Logout per Beacon ausgelöst.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

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

// Aktualisiert den Header, sobald die Includes vollständig geladen sind
document.addEventListener('includesLoaded', () => {
  aktualisiereHeader();
});

/**
 * Prüft den aktuellen Session-Status und passt die sichtbaren
 * Navigationselemente entsprechend an.
 *
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

  // Aktuelle Session vom Server abrufen
  const benutzer = await holeSession();

  if (benutzer) {
    // Eingeloggter Benutzer: Login/Registrieren ausblenden, Konto/Logout einblenden
    loginButton.style.display = 'none';
    registrierenButton.style.display = 'none';
    kontoItem.style.display = '';
    logoutButton.style.display = '';

    // Admin-Link nur für Benutzer mit Admin-Rolle einblenden
    if (adminItem) {
      adminItem.style.display = benutzer.rolle === 'admin' ? '' : 'none';
    }
  } else {
    // Nicht eingeloggter Benutzer: Login/Registrieren einblenden, geschützte Elemente ausblenden
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

  // Logout-Handler nur einmalig registrieren, um Doppelregistrierungen zu vermeiden
  if (!logoutButton.dataset.logoutRegistriert) {
    logoutButton.addEventListener('click', async (event) => {
      event.preventDefault();
      setzeNavigationsflag();

      const erfolgreich = await logout();

      if (erfolgreich) {
        weiterleiten('/static/login.html');
      } else {
        alert('Logout fehlgeschlagen.');
      }
    });

    logoutButton.dataset.logoutRegistriert = 'true';
  }
}

/**
 * Diese Datei steuert die dynamische Anzeige der Navigationsleiste je nach Login-Status.
 * Sobald die Seite vollständig geladen ist, wird der Server nach einer aktiven Session gefragt:
 * - Ist der Benutzer eingeloggt: Login- und Registrieren-Button werden ausgeblendet,
 *   stattdessen werden Konto- und Logout-Button angezeigt.
 * - Ist kein Benutzer eingeloggt: Login- und Registrieren-Button werden angezeigt,
 *   Konto und Logout werden ausgeblendet.
 */

'use strict';

// Hilfsfunktion: Navigation markieren, damit beforeunload keinen Logout auslöst.
// Muss vor jedem window.location.href-Aufruf und Link-Klick gesetzt werden.
function setzeNavigationsflag() {
  sessionStorage.setItem('navigiert', '1');
}

// Erkennt ob der Tab wirklich geschlossen/versteckt wird.
// visibilitychange(hidden) feuert beim Tab-Schließen.
// Beim F5-Reload bleibt der Tab sichtbar → visibilitychange feuert NICHT.
let tabWirdGeschlossen = false;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    tabWirdGeschlossen = true;
  } else {
    tabWirdGeschlossen = false;
  }
});

// pagehide feuert nach visibilitychange, daher ist tabWirdGeschlossen korrekt gesetzt.
// - Tab schließen:  visibilitychange(hidden) → pagehide → tabWirdGeschlossen=true  → Logout
// - F5:             kein visibilitychange    → pagehide → tabWirdGeschlossen=false → kein Logout
// - Link-Klick:     navigiert-Flag gesetzt   → pagehide → kein Logout
window.addEventListener('pagehide', () => {
  if (tabWirdGeschlossen && !sessionStorage.getItem('navigiert')) {
    navigator.sendBeacon('/benutzer/logout');
  }
  sessionStorage.removeItem('navigiert');
  tabWirdGeschlossen = false;
});

// Alle Link-Klicks als Navigation markieren
document.addEventListener('click', (event) => {
  if (event.target.closest('a[href]')) {
    setzeNavigationsflag();
  }
});

// Browser Zurück/Vor-Button als Navigation markieren
window.addEventListener('popstate', () => {
  setzeNavigationsflag();
});

// Alle programmatischen Weiterleitungen über diese Funktion abwickeln,
// damit das Navigations-Flag immer gesetzt wird
function weiterleiten(url) {
  setzeNavigationsflag();
  window.location.href = url;
}

// Auf das Custom-Event 'includesLoaded' warten, das ausgelöst wird sobald
// der Header-HTML-Include vollständig ins DOM eingefügt wurde
document.addEventListener('includesLoaded', () => {
  aktualisiereHeader();
});

// Prüft den Session-Status und passt die Navigationsleiste entsprechend an
async function aktualisiereHeader() {
  // Referenzen auf alle relevanten Navigationselemente holen
  const authWrapper = document.getElementById('auth-buttons-wrapper');
  const loginButton = document.getElementById('nav-login-item');
  const registrierenButton = document.getElementById('nav-registrieren-item');
  const kontoItem = document.getElementById('nav-konto-item');
  const adminItem = document.getElementById('nav-admin-item');
  const logoutButton = document.getElementById('nav-logout-item');

  // Sicherheitsprüfung: Falls ein Element fehlt (z.B. auf Seiten ohne Header), abbrechen
  if (!authWrapper || !loginButton || !registrierenButton || !kontoItem || !logoutButton) {
    return;
  }

  try {
    // Server nach aktiver Session fragen (Cookie wird automatisch mitgeschickt)
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (response.ok) {
      const benutzer = await response.json();

      // Benutzer ist eingeloggt: Login/Registrieren ausblenden, Konto/Logout einblenden
      loginButton.style.display = 'none';
      registrierenButton.style.display = 'none';
      kontoItem.style.display = '';
      logoutButton.style.display = '';

      // Admin-Link nur anzeigen, wenn der Benutzer die Rolle "admin" hat
      if (adminItem) {
        if (benutzer.rolle === 'admin') {
          adminItem.style.display = '';
        } else {
          adminItem.style.display = 'none';
        }
      }
    } else {
      // Kein aktiver Login: Login/Registrieren einblenden, Konto/Logout ausblenden
      loginButton.style.display = '';
      registrierenButton.style.display = '';
      kontoItem.style.display = 'none';
      logoutButton.style.display = 'none';

      // Admin-Link für nicht eingeloggte Benutzer ausblenden
      if (adminItem) {
        adminItem.style.display = 'none';
      }
    }
  } catch (error) {
    // Bei Netzwerkfehler: Standardansicht für nicht eingeloggte Benutzer zeigen
    console.error('Fehler beim Prüfen der Session:', error);
    loginButton.style.display = '';
    registrierenButton.style.display = '';
    kontoItem.style.display = 'none';
    logoutButton.style.display = 'none';

    // Admin-Link bei Fehler ebenfalls ausblenden
    if (adminItem) {
      adminItem.style.display = 'none';
    }
  }

  // Auth-Wrapper sichtbar machen und korrekt ausrichten
  authWrapper.style.display = 'flex';
  authWrapper.classList.add('align-items-center');

  // Logout-Button mit Click-Handler verknüpfen
  logoutButton.addEventListener('click', async (event) => {
    // Standard-Linkverhalten verhindern
    event.preventDefault();

    // Navigation-Flag setzen, damit der beforeunload-Beacon nicht zusätzlich feuert
    setzeNavigationsflag();

    try {
      // Logout-Anfrage an den Server senden – Session wird serverseitig beendet
      const response = await fetch('/benutzer/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (response.ok) {
        // Logout erfolgreich: zur Login-Seite weiterleiten
        weiterleiten('/static/login.html');
      } else {
        alert('Logout fehlgeschlagen.');
      }
    } catch (error) {
      // Netzwerk- oder Serverfehler beim Logout abfangen
      console.error('Fehler beim Logout:', error);
      alert('Serverfehler beim Logout.');
    }
  });
}
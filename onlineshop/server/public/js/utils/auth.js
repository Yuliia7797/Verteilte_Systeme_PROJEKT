/*
  Datei: auth.js
  Beschreibung: Diese Datei bündelt die zentrale Authentifizierungs- und Sitzungslogik
    des Frontends. Sie stellt Hilfsfunktionen bereit, um die aktuelle Benutzersession
    vom Server abzurufen, den Loginstatus zu prüfen sowie geschützte Bereiche
    nur für eingeloggte Benutzer oder Administratoren zugänglich zu machen.
    Zusätzlich wird die Logout-Funktionalität bereitgestellt.
    Ziel ist es, redundante Auth-Logik in mehreren Dateien zu vermeiden.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Markiert eine Navigation, damit beim Verlassen der Seite
 * kein automatischer Logout ausgelöst wird.
 *
 * @function setzeNavigationsflag
 * @returns {void}
 */
function setzeNavigationsflag() {
  sessionStorage.setItem('navigiert', '1');
}

/**
 * Leitet den Benutzer auf eine andere Seite weiter.
 * Vor der Weiterleitung wird das Navigationsflag gesetzt.
 *
 * @function weiterleiten
 * @param {string} url - Ziel-URL für die Weiterleitung
 * @returns {void}
 */
function weiterleiten(url) {
  setzeNavigationsflag();
  window.location.href = url;
}

/**
 * Lädt die aktuelle Benutzersession vom Server.
 * Gibt bei gültiger Session die Benutzerdaten zurück,
 * ansonsten null.
 *
 * @function holeSession
 * @returns {Promise<Object|null>} Benutzerobjekt oder null
 */
async function holeSession() {
  try {
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Session:', error);
    return null;
  }
}

/**
 * Prüft, ob aktuell ein Benutzer eingeloggt ist.
 *
 * @function istEingeloggt
 * @returns {Promise<boolean>} true, wenn eingeloggt, sonst false
 */
async function istEingeloggt() {
  const benutzer = await holeSession();
  return benutzer !== null;
}

/**
 * Erzwingt, dass ein Benutzer eingeloggt ist.
 * Leitet bei fehlender Session auf die Loginseite weiter.
 *
 * @function requireLogin
 * @param {string} [loginRedirectUrl='/static/login.html'] - Weiterleitungsziel bei fehlendem Login
 * @returns {Promise<Object>} Benutzerobjekt bei erfolgreichem Login
 * @throws {Error} Wenn kein Benutzer eingeloggt ist
 */
async function requireLogin(loginRedirectUrl = '/static/login.html') {
  const benutzer = await holeSession();

  if (!benutzer) {
    weiterleiten(loginRedirectUrl);
    throw new Error('Zugriff verweigert: Benutzer ist nicht eingeloggt.');
  }

  return benutzer;
}

/**
 * Erzwingt, dass der Benutzer Administrator ist.
 * Leitet bei fehlender Session zur Loginseite und bei fehlenden Rechten zur Startseite weiter.
 *
 * @function requireAdmin
 * @param {string} [loginRedirectUrl='/static/login.html'] - Weiterleitung bei fehlendem Login
 * @param {string} [forbiddenRedirectUrl='/static/index.html'] - Weiterleitung bei fehlenden Rechten
 * @returns {Promise<Object>} Benutzerobjekt bei erfolgreicher Prüfung
 * @throws {Error} Wenn kein Login oder keine Adminrechte vorliegen
 */
async function requireAdmin(
  loginRedirectUrl = '/static/login.html',
  forbiddenRedirectUrl = '/static/index.html'
) {
  const benutzer = await holeSession();

  if (!benutzer) {
    weiterleiten(loginRedirectUrl);
    throw new Error('Zugriff verweigert: Benutzer ist nicht eingeloggt.');
  }

  if (benutzer.rolle !== 'admin') {
    weiterleiten(forbiddenRedirectUrl);
    throw new Error('Zugriff verweigert: Keine Adminrechte.');
  }

  return benutzer;
}

/**
 * Führt den Logout des aktuellen Benutzers durch.
 * Gibt true bei Erfolg und false bei Fehler zurück.
 *
 * @function logout
 * @returns {Promise<boolean>} true bei erfolgreichem Logout, sonst false
 */
async function logout() {
  try {
    const response = await fetch('/benutzer/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Logout fehlgeschlagen. Status:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Fehler beim Logout:', error);
    return false;
  }
}

/**
 * Gibt die Rolle des aktuell eingeloggten Benutzers zurück.
 * Falls kein Benutzer eingeloggt ist, wird null zurückgegeben.
 *
 * @function holeBenutzerRolle
 * @returns {Promise<string|null>} Rolle des Benutzers oder null
 */
async function holeBenutzerRolle() {
  const benutzer = await holeSession();

  if (!benutzer || !benutzer.rolle) {
    return null;
  }

  return benutzer.rolle;
}

/**
 * Prüft, ob der aktuell eingeloggte Benutzer Administrator ist.
 *
 * @function istAdmin
 * @returns {Promise<boolean>} true, wenn Admin, sonst false
 */
async function istAdmin() {
  const rolle = await holeBenutzerRolle();
  return rolle === 'admin';
}

window.setzeNavigationsflag = setzeNavigationsflag;
window.weiterleiten = weiterleiten;
window.holeSession = holeSession;
window.istEingeloggt = istEingeloggt;
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.logout = logout;
window.holeBenutzerRolle = holeBenutzerRolle;
window.istAdmin = istAdmin;
/**
 * Diese Datei enthält eine Middleware zur Prüfung von Administratorrechten.
 * Sie stellt sicher, dass nur eingeloggte Benutzer mit der Rolle "admin"
 * auf bestimmte geschützte Routen zugreifen dürfen.
 */

'use strict';

/**
 * Prüft, ob ein Benutzer eingeloggt ist und die Rolle "admin" besitzt.
 * Wenn kein Benutzer eingeloggt ist, wird Status 401 zurückgegeben.
 * Wenn der Benutzer kein Admin ist, wird Status 403 zurückgegeben.
 */
function istAdmin(req, res, next) {
  // Prüfen, ob eine Session und ein eingeloggter Benutzer vorhanden sind
  if (!req.session || !req.session.benutzer) {
    return res.status(401).json({
      message: 'Nicht eingeloggt'
    });
  }

  // Prüfen, ob der eingeloggte Benutzer die Rolle "admin" hat
  if (req.session.benutzer.rolle !== 'admin') {
    return res.status(403).json({
      message: 'Kein Zugriff'
    });
  }

  // Wenn alles korrekt ist, wird die Anfrage an die nächste Funktion weitergegeben
  next();
}

module.exports = istAdmin;
/**
 * Diese Datei definiert die API-Routen für die Benutzerverwaltung und Authentifizierung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET  /benutzer                    – alle Benutzer inklusive Adressdaten laden
 * - POST /benutzer                    – neuen Benutzer anlegen (Admin)
 * - POST /benutzer/registrieren       – Registrierung mit Passwort-Hashing und Adresse
 * - POST /benutzer/login              – Login mit Session-Erstellung
 * - GET  /benutzer/session            – aktive Session abfragen
 * - POST /benutzer/logout             – Session beenden
 * - GET  /benutzer/mein-konto         – Kontodaten des eingeloggten Benutzers laden
 * - PUT  /benutzer/mein-konto         – Kontodaten und Adresse aktualisieren, Passwort optional ändern
 * - GET  /benutzer/meine-bestellungen – alle Bestellungen des eingeloggten Benutzers laden
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const bcrypt = require('bcrypt'); // Für sicheres Passwort-Hashing und -Vergleich
const { body, validationResult } = require('express-validator');
const istAdmin = require('../istAdmin');

/**
 * Gibt bei Validierungsfehlern eine 400-Antwort zurück.
 *
 * @function pruefeFehler
 * @param {Object} req - Express Request
 * @param {Object} res - Express Response
 * @returns {Object|null} Response-Objekt bei Fehler, sonst null
 */
function pruefeFehler(req, res) {
  const fehler = validationResult(req);
  if (!fehler.isEmpty()) {
    return res.status(400).json({ message: 'Ungültige Eingaben.' });
  }
  return null;
}

// Wiederverwendbare Validierungsregeln für Adressfelder
const adresseValidierung = [
  body('strasse').trim().notEmpty().isLength({ max: 100 }),
  body('hausnummer').trim().notEmpty().isLength({ max: 10 }),
  body('adresszusatz').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('postleitzahl').trim().notEmpty().isLength({ max: 10 }),
  body('ort').trim().notEmpty().isLength({ max: 100 }),
  body('land').trim().notEmpty().isLength({ max: 100 })
];

/*
  GET /benutzer
  Lädt alle Benutzer aus der Datenbank inklusive Adressdaten.
  Der Passwort-Hash wird bewusst nicht zurückgegeben.
  Dieser Endpunkt darf nur von Admins genutzt werden.

  Hinweis:
  Es wird ein LEFT JOIN verwendet, damit auch Benutzer angezeigt werden,
  für die noch keine Adresse in der Tabelle "adresse" gespeichert wurde.
*/
router.get('/', istAdmin, (_req, res) => {
  connection.query(
    `SELECT
      b.id,
      b.vorname,
      b.nachname,
      b.email,
      b.rolle,
      b.erstellungszeitpunkt,
      a.strasse,
      a.hausnummer,
      a.adresszusatz,
      a.postleitzahl,
      a.ort,
      a.land
     FROM benutzer b
     LEFT JOIN adresse a ON b.id = a.benutzer_id
     ORDER BY b.erstellungszeitpunkt DESC`,
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      res.status(200).json(results);
    }
  );
});

/*
  POST /benutzer
  Legt einen neuen Benutzer an.
  Dieser Endpunkt ist nur für Admin-Zwecke gedacht.
  Das Passwort wird serverseitig mit bcrypt gehasht – niemals den Hash direkt übergeben.

  Hinweis:
  Über diesen Endpunkt kann ein Admin aktuell Benutzer mit den Rollen
  "kunde" oder "admin" anlegen. Eine Adresse wird hier bewusst noch nicht
  gespeichert, da der Schwerpunkt auf der schnellen Anlage eines Benutzers
  über die Admin-Oberfläche liegt.
*/
router.post('/', istAdmin, async (req, res) => {
  const { vorname, nachname, email, passwort, rolle } = req.body;

  // Alle Felder sind Pflicht
  if (!vorname || !nachname || !email || !passwort || !rolle) {
    return res.status(400).json({
      message: 'Alle Felder sind Pflicht: vorname, nachname, email, passwort, rolle'
    });
  }

  // Rolle gegen erlaubte Werte prüfen
  const erlaubteRollen = ['kunde', 'admin'];
  if (!erlaubteRollen.includes(rolle)) {
    return res.status(400).json({ message: 'Ungültige Rolle. Erlaubt: kunde, admin' });
  }

  try {
    const passwortHash = await bcrypt.hash(passwort, 10);

    connection.query(
      'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
      [vorname, nachname, email.trim().toLowerCase(), passwortHash, rolle],
      (error, results) => {
        if (error) {
          // Doppelte E-Mail-Adresse erkennen (UNIQUE-Constraint in der DB)
          if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'E-Mail-Adresse bereits vergeben' });
          }

          console.error(error);
          return res.status(500).json({ message: 'Fehler beim Registrieren' });
        }

        res.status(201).json({
          message: 'Benutzer registriert',
          id: results.insertId
        });
      }
    );
  } catch (hashError) {
    console.error(hashError);
    return res.status(500).json({ message: 'Fehler beim Hashen des Passworts' });
  }
});

/*
  POST /benutzer/registrieren
  Registriert einen neuen Benutzer inklusive Adresse.
  Ablauf: Eingaben validieren → E-Mail prüfen → Passwort hashen → Benutzer speichern → Adresse speichern
*/
router.post('/registrieren',
  [
    body('vorname').trim().notEmpty().isLength({ max: 50 }),
    body('nachname').trim().notEmpty().isLength({ max: 50 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('passwort').matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/),
    ...adresseValidierung
  ],
  async (req, res) => {
    // Eingaben gegen die Validierungsregeln prüfen
    const validierungsFehler = pruefeFehler(req, res);
    if (validierungsFehler) return;

    // Alle Felder aus dem Request-Body auslesen
    const {
      vorname,
      nachname,
      email,
      passwort,
      strasse,
      hausnummer,
      adresszusatz,
      postleitzahl,
      ort,
      land
    } = req.body;

    // E-Mail normalisieren: Leerzeichen entfernen und Kleinschreibung erzwingen
    const emailBereinigt = email.trim().toLowerCase();

    try {
      // Passwort hashen vor der Transaktion
      const passwortHash = await bcrypt.hash(passwort, 10);

      // Prüfen ob die E-Mail-Adresse bereits in der Datenbank existiert
      connection.query(
        'SELECT id FROM benutzer WHERE email = ?',
        [emailBereinigt],
        (selectError, selectResults) => {
          if (selectError) {
            console.error(selectError);
            return res.status(500).json({ message: 'Datenbankfehler' });
          }

          if (selectResults.length > 0) {
            return res.status(409).json({ message: 'E-Mail-Adresse bereits vergeben' });
          }

          // Einzelne Connection aus dem Pool holen – Transaktion braucht eine feste Connection
          connection.getConnection((connFehler, conn) => {
            if (connFehler) {
              console.error(connFehler);
              return res.status(500).json({ message: 'Keine Datenbankverbindung verfügbar' });
            }

            // Transaktion starten – benutzer und adresse werden atomar gespeichert
            conn.beginTransaction((transaktionFehler) => {
              if (transaktionFehler) {
                conn.release();
                console.error(transaktionFehler);
                return res.status(500).json({ message: 'Transaktion konnte nicht gestartet werden' });
              }

              // Schritt 1: Benutzer speichern
              conn.query(
                'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
                [vorname, nachname, emailBereinigt, passwortHash, 'kunde'],
                (insertUserError, insertUserResults) => {
                  if (insertUserError) {
                    return conn.rollback(() => {
                      conn.release();
                      console.error(insertUserError);
                      res.status(500).json({ message: 'Fehler beim Speichern des Benutzers' });
                    });
                  }

                  const benutzerId = insertUserResults.insertId;

                  // Schritt 2: Adresse speichern
                  conn.query(
                    `INSERT INTO adresse
                    (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [benutzerId, strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land],
                    (insertAdresseError, insertAdresseResults) => {
                      if (insertAdresseError) {
                        return conn.rollback(() => {
                          conn.release();
                          console.error(insertAdresseError);
                          res.status(500).json({ message: 'Fehler beim Speichern der Adresse' });
                        });
                      }

                      // Beide Schritte erfolgreich – Transaktion abschließen
                      conn.commit((commitFehler) => {
                        if (commitFehler) {
                          return conn.rollback(() => {
                            conn.release();
                            console.error(commitFehler);
                            res.status(500).json({ message: 'Fehler beim Abschließen der Transaktion' });
                          });
                        }

                        conn.release();

                        res.status(201).json({
                          message: 'Registrierung erfolgreich',
                          benutzerId: benutzerId,
                          adresseId: insertAdresseResults.insertId
                        });
                      });
                    }
                  );
                }
              );
            });
          });
        }
      );
    } catch (hashError) {
      console.error(hashError);
      return res.status(500).json({ message: 'Fehler beim Hashen des Passworts' });
    }
  }
);

/*
  POST /benutzer/login
  Prüft E-Mail und Passwort und legt bei Erfolg eine Session an.
*/
router.post('/login',
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('passwort').notEmpty().isLength({ max: 200 })
  ],
  (req, res) => {
    // Eingaben gegen die Validierungsregeln prüfen
    const validierungsFehler = pruefeFehler(req, res);
    if (validierungsFehler) return;

    const { email, passwort } = req.body;

    // E-Mail normalisieren für konsistenten Datenbankvergleich
    const emailBereinigt = email.trim().toLowerCase();

    // Benutzer anhand der E-Mail in der Datenbank suchen
    connection.query(
      'SELECT id, vorname, nachname, email, passwort_hash, rolle FROM benutzer WHERE email = ?',
      [emailBereinigt],
      async (error, results) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Datenbankfehler' });
        }

        // Kein Benutzer mit dieser E-Mail gefunden
        // Bewusst generische Meldung, um keine Hinweise auf vorhandene Konten zu geben
        if (results.length === 0) {
          return res.status(401).json({ message: 'E-Mail oder Passwort ist falsch.' });
        }

        const benutzer = results[0];

        try {
          // Eingegebenes Passwort mit dem gespeicherten Hash vergleichen
          const passwortKorrekt = await bcrypt.compare(passwort, benutzer.passwort_hash);

          if (!passwortKorrekt) {
            return res.status(401).json({ message: 'E-Mail oder Passwort ist falsch.' });
          }

          // Login erfolgreich: Benutzerdaten in der Session speichern (ohne Passwort-Hash)
          req.session.benutzer = {
            id: benutzer.id,
            vorname: benutzer.vorname,
            nachname: benutzer.nachname,
            email: benutzer.email,
            rolle: benutzer.rolle
          };

          // Session explizit speichern, bevor die Antwort gesendet wird
          req.session.save((saveError) => {
            if (saveError) {
              console.error(saveError);
              return res.status(500).json({ message: 'Session konnte nicht gespeichert werden' });
            }

            return res.status(200).json({
              message: 'Login erfolgreich',
              benutzer: req.session.benutzer
            });
          });

        } catch (compareError) {
          console.error(compareError);
          return res.status(500).json({ message: 'Fehler bei der Passwortprüfung' });
        }
      }
    );
  }
);

/*
  GET /benutzer/session
  Gibt den eingeloggten Benutzer zurück, falls eine Session existiert.
  Wird vom Frontend genutzt, um den Login-Status zu prüfen.
*/
router.get('/session', (req, res) => {
  // Kein Benutzer in der Session → nicht eingeloggt
  if (!req.session.benutzer) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  return res.status(200).json(req.session.benutzer);
});

/*
  POST /benutzer/logout
  Beendet die Session des Benutzers.
*/
router.post('/logout', (req, res) => {
  // Session serverseitig löschen
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Logout fehlgeschlagen' });
    }

    // Session-Cookie im Browser löschen
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout erfolgreich' });
  });
});

/*
  GET /benutzer/mein-konto
  Lädt die Daten des eingeloggten Benutzers inklusive Adresse.
*/
router.get('/mein-konto', (req, res) => {
  // Session prüfen – nur eingeloggte Benutzer dürfen ihre Daten abrufen
  if (!req.session.benutzer) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  // Benutzer-ID aus der Session lesen
  const benutzerId = req.session.benutzer.id;

  // Benutzerdaten und Adresse laden – LEFT JOIN, falls noch keine Adresse existiert
  connection.query(
    `SELECT
      b.vorname,
      b.nachname,
      b.email,
      a.strasse,
      a.hausnummer,
      a.adresszusatz,
      a.postleitzahl,
      a.ort,
      a.land
    FROM benutzer b
    LEFT JOIN adresse a ON b.id = a.benutzer_id
    WHERE b.id = ?
    LIMIT 1`,
    [benutzerId],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Laden der Kontodaten' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
      }

      return res.status(200).json(results[0]);
    }
  );
});

/*
  PUT /benutzer/mein-konto
  Aktualisiert die Daten des eingeloggten Benutzers inklusive Adresse
  und optional das Passwort.
*/
router.put('/mein-konto',
  [
    body('vorname').trim().notEmpty().isLength({ max: 50 }),
    body('nachname').trim().notEmpty().isLength({ max: 50 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('neuesPasswort').optional({ checkFalsy: true }).matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/),
    ...adresseValidierung
  ],
  async (req, res) => {
    // Session prüfen – nur eingeloggte Benutzer dürfen ihre Daten ändern
    if (!req.session.benutzer) {
      return res.status(401).json({ message: 'Nicht eingeloggt' });
    }

    // Eingaben gegen die Validierungsregeln prüfen
    const validierungsFehler = pruefeFehler(req, res);
    if (validierungsFehler) return;

    const benutzerId = req.session.benutzer.id;

    const {
      vorname,
      nachname,
      email,
      strasse,
      hausnummer,
      adresszusatz,
      postleitzahl,
      ort,
      land,
      neuesPasswort
    } = req.body;

    const emailBereinigt = email.trim().toLowerCase();

    // E-Mail-Duplikat prüfen vor der Transaktion
    connection.query(
      'SELECT id FROM benutzer WHERE email = ? AND id <> ?',
      [emailBereinigt, benutzerId],
      async (selectError, selectResults) => {
        if (selectError) {
          console.error(selectError);
          return res.status(500).json({ message: 'Datenbankfehler' });
        }

        if (selectResults.length > 0) {
          return res.status(409).json({ message: 'E-Mail-Adresse bereits vergeben' });
        }

        try {
          // Passwort hashen vor der Transaktion (bcrypt ist async, nicht in Transaktion blockieren)
          let passwortHash = null;
          if (neuesPasswort) {
            passwortHash = await bcrypt.hash(neuesPasswort, 10);
          }

          // Einzelne Connection aus dem Pool holen – Transaktion braucht eine feste Connection
          connection.getConnection((connFehler, conn) => {
            if (connFehler) {
              console.error(connFehler);
              return res.status(500).json({ message: 'Keine Datenbankverbindung verfügbar' });
            }

            // Transaktion starten – benutzer und adresse werden atomar aktualisiert
            conn.beginTransaction((transaktionFehler) => {
              if (transaktionFehler) {
                conn.release();
                console.error(transaktionFehler);
                return res.status(500).json({ message: 'Transaktion konnte nicht gestartet werden' });
              }

              // Query dynamisch zusammensetzen – mit oder ohne Passwort-Update
              const benutzerQuery = passwortHash
                ? 'UPDATE benutzer SET vorname = ?, nachname = ?, email = ?, passwort_hash = ? WHERE id = ?'
                : 'UPDATE benutzer SET vorname = ?, nachname = ?, email = ? WHERE id = ?';

              const benutzerParams = passwortHash
                ? [vorname, nachname, emailBereinigt, passwortHash, benutzerId]
                : [vorname, nachname, emailBereinigt, benutzerId];

              // Schritt 1: Benutzerdaten aktualisieren
              conn.query(benutzerQuery, benutzerParams, (updateBenutzerError) => {
                if (updateBenutzerError) {
                  return conn.rollback(() => {
                    conn.release();
                    console.error(updateBenutzerError);
                    res.status(500).json({ message: 'Fehler beim Aktualisieren der Benutzerdaten' });
                  });
                }

                // Schritt 2: Prüfen ob bereits eine Adresse existiert
                conn.query(
                  'SELECT id FROM adresse WHERE benutzer_id = ? LIMIT 1',
                  [benutzerId],
                  (selectAdresseError, selectAdresseResults) => {
                    if (selectAdresseError) {
                      return conn.rollback(() => {
                        conn.release();
                        console.error(selectAdresseError);
                        res.status(500).json({ message: 'Fehler beim Prüfen der Adresse' });
                      });
                    }

                    const adresseParams = [strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land];

                    const adresseQuery = selectAdresseResults.length > 0
                      ? {
                          sql: 'UPDATE adresse SET strasse = ?, hausnummer = ?, adresszusatz = ?, postleitzahl = ?, ort = ?, land = ? WHERE id = ?',
                          params: [...adresseParams, selectAdresseResults[0].id]
                        }
                      : {
                          sql: 'INSERT INTO adresse (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land) VALUES (?, ?, ?, ?, ?, ?, ?)',
                          params: [benutzerId, ...adresseParams]
                        };

                    // Schritt 3: Adresse aktualisieren oder neu anlegen
                    conn.query(adresseQuery.sql, adresseQuery.params, (adresseFehler) => {
                      if (adresseFehler) {
                        return conn.rollback(() => {
                          conn.release();
                          console.error(adresseFehler);
                          res.status(500).json({ message: 'Fehler beim Aktualisieren der Adresse' });
                        });
                      }

                      // Beide Schritte erfolgreich – Transaktion abschließen
                      conn.commit((commitFehler) => {
                        if (commitFehler) {
                          return conn.rollback(() => {
                            conn.release();
                            console.error(commitFehler);
                            res.status(500).json({ message: 'Fehler beim Abschließen der Transaktion' });
                          });
                        }

                        // Connection zurück in den Pool
                        conn.release();

                        // Session aktualisieren
                        req.session.benutzer.vorname = vorname;
                        req.session.benutzer.nachname = nachname;
                        req.session.benutzer.email = emailBereinigt;

                        req.session.save((saveError) => {
                          if (saveError) {
                            console.error(saveError);
                            return res.status(500).json({ message: 'Session konnte nicht aktualisiert werden' });
                          }

                          return res.status(200).json({ message: 'Kontodaten erfolgreich aktualisiert' });
                        });
                      });
                    });
                  }
                );
              });
            });
          });
        } catch (hashError) {
          console.error(hashError);
          return res.status(500).json({ message: 'Fehler beim Verarbeiten des Passworts' });
        }
      }
    );
  }
);

/*
  GET /benutzer/meine-bestellungen
  Lädt alle Bestellungen des eingeloggten Benutzers.
*/
router.get('/meine-bestellungen', (req, res) => {
  // Session prüfen – nur eingeloggte Benutzer dürfen ihre Bestellungen abrufen
  if (!req.session.benutzer) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  // Benutzer-ID aus der Session lesen
  const benutzerId = req.session.benutzer.id;

  // Alle Bestellungen des Benutzers inkl. Lieferadresse laden, neueste zuerst
  connection.query(
    `SELECT
      b.id,
      b.bestellstatus,
      b.erstellungszeitpunkt,
      b.gesamtpreis,
      b.zahlungsmethode,
      b.zahlungsstatus,
      a.strasse,
      a.hausnummer,
      a.adresszusatz,
      a.postleitzahl,
      a.ort,
      a.land
     FROM bestellung b
     JOIN adresse a ON b.lieferadresse_id = a.id
     WHERE b.benutzer_id = ?
     ORDER BY b.erstellungszeitpunkt DESC`,
    [benutzerId],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Laden der Bestellungen' });
      }

      return res.status(200).json(results);
    }
  );
});

module.exports = router;
/**
 * Diese Datei definiert die API-Routen für die Benutzerverwaltung und Authentifizierung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET  /benutzer              – alle Benutzer laden 
 * - POST /benutzer              – neuen Benutzer anlegen (Admin)
 * - POST /benutzer/registrieren – Registrierung mit Passwort-Hashing und Adresse
 * - POST /benutzer/login        – Login mit Session-Erstellung
 * - GET  /benutzer/session      – aktive Session abfragen
 * - POST /benutzer/logout       – Session beenden
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const bcrypt = require('bcrypt'); // Für sicheres Passwort-Hashing und -Vergleich

/*
  GET /benutzer
  Lädt alle Benutzer aus der Datenbank.
  Der Passwort-Hash wird bewusst nicht zurückgegeben.
*/
router.get('/', (req, res) => {
  connection.query(
    'SELECT id, vorname, nachname, email, rolle, erstellungszeitpunkt FROM benutzer',
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
  Diese Route kann z. B. für Admin-Zwecke bleiben.
*/
router.post('/', (req, res) => {
  const { vorname, nachname, email, passwort_hash, rolle } = req.body;

  // Alle Felder sind Pflicht
  if (!vorname || !nachname || !email || !passwort_hash || !rolle) {
    return res.status(400).json({
      message: 'Alle Felder sind Pflicht: vorname, nachname, email, passwort_hash, rolle'
    });
  }

  connection.query(
    'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
    [vorname, nachname, email, passwort_hash, rolle],
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
});

/*
  POST /benutzer/registrieren
  Registriert einen neuen Benutzer inklusive Adresse.
  Ablauf: Pflichtfelder prüfen → Passwort validieren → E-Mail prüfen
          → Passwort hashen → Benutzer speichern → Adresse speichern
*/
router.post('/registrieren', async (req, res) => {
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

  // Prüfen ob alle Pflichtfelder vorhanden sind (adresszusatz ist optional)
  if (
    !vorname ||
    !nachname ||
    !email ||
    !passwort ||
    !strasse ||
    !hausnummer ||
    !postleitzahl ||
    !ort ||
    !land
  ) {
    return res.status(400).json({
      message: 'Bitte alle Pflichtfelder ausfüllen.'
    });
  }

  // Passwort-Regel: mind. 8 Zeichen, ein Großbuchstabe, eine Zahl, ein Sonderzeichen
  const passwortRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

  if (!passwortRegex.test(passwort)) {
    return res.status(400).json({
      message: 'Das Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten.'
    });
  }

  // E-Mail normalisieren: Leerzeichen entfernen und Kleinschreibung erzwingen
  const emailBereinigt = email.trim().toLowerCase();

  try {
    // Prüfen ob die E-Mail-Adresse bereits in der Datenbank existiert
    connection.query(
      'SELECT id FROM benutzer WHERE email = ?',
      [emailBereinigt],
      async (selectError, selectResults) => {
        if (selectError) {
          console.error(selectError);
          return res.status(500).json({ message: 'Datenbankfehler' });
        }

        if (selectResults.length > 0) {
          return res.status(409).json({ message: 'E-Mail-Adresse bereits vergeben' });
        }

        try {
          // Passwort mit bcrypt hashen (Kostenfaktor 10 = sicherer Standard)
          const passwortHash = await bcrypt.hash(passwort, 10);

          // Benutzer in der Datenbank speichern, Rolle wird immer als 'kunde' gesetzt
          connection.query(
            'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
            [vorname, nachname, emailBereinigt, passwortHash, 'kunde'],
            (insertUserError, insertUserResults) => {
              if (insertUserError) {
                console.error(insertUserError);
                return res.status(500).json({ message: 'Fehler beim Speichern des Benutzers' });
              }

              // Die neu generierte Benutzer-ID für die Adresse verwenden
              const benutzerId = insertUserResults.insertId;

              // Adresse des Benutzers speichern
              connection.query(
                `INSERT INTO adresse
                (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  benutzerId,
                  strasse,
                  hausnummer,
                  adresszusatz || null, // adresszusatz ist optional
                  postleitzahl,
                  ort,
                  land
                ],
                (insertAdresseError, insertAdresseResults) => {
                  if (insertAdresseError) {
                    console.error(insertAdresseError);

                    // Rollback: Benutzer wieder löschen, da die Adresse nicht gespeichert werden konnte
                    connection.query(
                      'DELETE FROM benutzer WHERE id = ?',
                      [benutzerId],
                      (deleteError) => {
                        if (deleteError) {
                          console.error('Rollback fehlgeschlagen:', deleteError);
                        }

                        return res.status(500).json({
                          message: 'Fehler beim Speichern der Adresse'
                        });
                      }
                    );
                    return;
                  }

                  // Registrierung vollständig erfolgreich
                  res.status(201).json({
                    message: 'Registrierung erfolgreich',
                    benutzerId: benutzerId,
                    adresseId: insertAdresseResults.insertId
                  });
                }
              );
            }
          );
        } catch (hashError) {
          console.error(hashError);
          return res.status(500).json({ message: 'Fehler beim Hashen des Passworts' });
        }
      }
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unbekannter Serverfehler' });
  }
});

/*
  POST /benutzer/login
  Prüft E-Mail und Passwort und legt bei Erfolg eine Session an.
*/
router.post('/login', (req, res) => {
  const { email, passwort } = req.body;

  // Beide Felder sind Pflicht
  if (!email || !passwort) {
    return res.status(400).json({
      message: 'Bitte E-Mail und Passwort eingeben.'
    });
  }

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
});

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

module.exports = router;
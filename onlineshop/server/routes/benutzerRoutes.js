'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const bcrypt = require('bcrypt');

/*
  GET /benutzer
  Lädt alle Benutzer aus der Datenbank.
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
*/
router.post('/registrieren', async (req, res) => {
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

  const passwortRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

  if (!passwortRegex.test(passwort)) {
    return res.status(400).json({
      message: 'Das Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten.'
    });
  }

  const emailBereinigt = email.trim().toLowerCase();

  try {
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
          const passwortHash = await bcrypt.hash(passwort, 10);

          connection.query(
            'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
            [vorname, nachname, emailBereinigt, passwortHash, 'kunde'],
            (insertUserError, insertUserResults) => {
              if (insertUserError) {
                console.error(insertUserError);
                return res.status(500).json({ message: 'Fehler beim Speichern des Benutzers' });
              }

              const benutzerId = insertUserResults.insertId;

              connection.query(
                `INSERT INTO adresse
                (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  benutzerId,
                  strasse,
                  hausnummer,
                  adresszusatz || null,
                  postleitzahl,
                  ort,
                  land
                ],
                (insertAdresseError, insertAdresseResults) => {
                  if (insertAdresseError) {
                    console.error(insertAdresseError);

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

module.exports = router;
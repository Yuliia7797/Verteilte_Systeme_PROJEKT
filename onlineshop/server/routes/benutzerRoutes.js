'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /benutzer
  Lädt alle Benutzer aus der Datenbank.
*/
router.get('/', (req, res) => {
  // Nur wichtige Benutzerdaten laden
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
*/
router.post('/', (req, res) => {
  // Daten aus dem Request-Body lesen
  const { vorname, nachname, email, passwort_hash, rolle } = req.body;

  // Prüfen, ob alle Pflichtfelder vorhanden sind
  if (!vorname || !nachname || !email || !passwort_hash || !rolle) {
    return res.status(400).json({
      message: 'Alle Felder sind Pflicht: vorname, nachname, email, passwort_hash, rolle'
    });
  }

  // Neuen Benutzer in der Datenbank speichern
  connection.query(
    'INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)',
    [vorname, nachname, email, passwort_hash, rolle],
    (error, results) => {
      if (error) {
        // Prüfen, ob die E-Mail schon existiert
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

module.exports = router;
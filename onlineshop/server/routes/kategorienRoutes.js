'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /kategorien
  Lädt alle Kategorien aus der Datenbank.
*/
router.get('/', (req, res) => {
  // Alle Kategorien aus der Tabelle "kategorie" laden
  connection.query('SELECT * FROM kategorie', (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Datenbankabfrage fehlgeschlagen' });
    }

    res.status(200).json(results);
  });
});

module.exports = router;
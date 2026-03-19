const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const dbInfo = {
  connectionLimit: 10,
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

const connection = mysql.createPool(dbInfo);

// GET /kategorien
router.get('/', (req, res) => {
  // Alle Kategorien aus der Datenbank laden
  connection.query('SELECT * FROM kategorie', (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Datenbankabfrage fehlgeschlagen' });
    }

    res.status(200).json(results);
  });
});

module.exports = router;
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

// GET /products
router.get('/', (req, res) => {
  connection.query('SELECT * FROM artikel', (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Database query failed' });
    }

    res.status(200).json(results);
  });
});

// GET /products/:id
router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const query = `
    SELECT
      artikel.id,
      artikel.bezeichnung,
      artikel.beschreibung,
      artikel.langbeschreibung,
      artikel.preis,
      artikel.bild_url,
      kategorie.bezeichnung AS kategorie_name,
      lagerbestand.anzahl AS lagerbestand
    FROM artikel
    LEFT JOIN kategorie ON artikel.kategorie_id = kategorie.id
    LEFT JOIN lagerbestand ON artikel.id = lagerbestand.artikel_id
    WHERE artikel.id = ?
  `;

  connection.query(query, [id], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(results[0]);
  });
});

module.exports = router;
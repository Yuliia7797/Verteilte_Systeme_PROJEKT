'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const connection = require('./db');

const artikelRoutes = require('./routes/artikelRoutes');
const kategorienRoutes = require('./routes/kategorienRoutes');
const warenkorbRoutes = require('./routes/warenkorbRoutes');
const bestellungRoutes = require('./routes/bestellungRoutes');
const lagerbestandRoutes = require('./routes/lagerbestandRoutes');
const workerRoutes = require('./routes/workerRoutes');
const benutzerRoutes = require('./routes/benutzerRoutes');
const adresseRoutes = require('./routes/adresseRoutes');

console.log('Verbinde mit Datenbank...');

// Verbindungstest
connection.query('SELECT 1 + 1 AS solution', function (error, results) {
  if (error) {
    throw error;
  }

  if (results[0].solution === 2) {
    console.log('Datenbankverbindung erfolgreich');
  } else {
    console.error('Datenbankverbindung fehlgeschlagen!');
    process.exit(5);
  }
});

// Express App
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Gemeinsamer Session-Store in MariaDB für alle Serverinstanzen
const sessionStore = new MySQLStore({
  host: process.env.MYSQL_HOSTNAME,
  port: 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

app.use(session({
  key: 'connect.sid',
  secret: 'mein_geheimes_login_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

// Rate Limiter (DoS-Schutz)
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: Number.parseInt(process.env.RATE_LIMIT_MAX || '10000', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
});

app.use(limiter);

// Startseite → statische Seite
app.get('/', (req, res) => {
  res.redirect('/static');
});

// Statische Dateien aus dem Ordner "public"
app.use('/static', express.static('public'));

// Routen einbinden
app.use('/artikel', artikelRoutes);
app.use('/kategorien', kategorienRoutes);
app.use('/warenkorb', warenkorbRoutes);
app.use('/bestellung', bestellungRoutes);
app.use('/lagerbestand', lagerbestandRoutes);
app.use('/worker', workerRoutes);
app.use('/benutzer', benutzerRoutes);
app.use('/adresse', adresseRoutes);

// Server starten
app.listen(PORT, HOST, () => {
  console.log(`Server läuft auf http://${HOST}:${PORT}`);
});
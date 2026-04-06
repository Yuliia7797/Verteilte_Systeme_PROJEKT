/*
  Datei: server.js
  Beschreibung:
    Diese Datei startet den Express-Webserver für den Online-Shop.

    Hauptaufgaben:
    - Aufbau und Test der Datenbankverbindung
    - Konfiguration von Middleware (JSON, URL-Encoding, Sessions)
    - Einrichtung eines gemeinsamen Session-Stores in MariaDB
    - Schutz vor zu vielen Anfragen (Rate Limiting / DoS-Schutz)
    - Bereitstellung statischer Dateien (Frontend)
    - Einbindung aller API-Routen (Artikel, Warenkorb, Bestellung, etc.)
    - Starten des HTTP-Servers

    Der Server dient als zentrale Schnittstelle zwischen
    Frontend, Datenbank und Worker-System.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';


// =========================
// Imports
// =========================

const express = require('express');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Eigene Module
const connection = require('./db');

// Routen
const artikelRoutes = require('./routes/artikelRoutes');
const kategorienRoutes = require('./routes/kategorienRoutes');
const warenkorbRoutes = require('./routes/warenkorbRoutes');
const bestellungRoutes = require('./routes/bestellungRoutes');
const lagerbestandRoutes = require('./routes/lagerbestandRoutes');
const workerRoutes = require('./routes/workerRoutes');
const benutzerRoutes = require('./routes/benutzerRoutes');
const adresseRoutes = require('./routes/adresseRoutes');


// =========================
// Datenbankverbindung testen
// =========================

console.log('Verbinde mit Datenbank...');

// Führt eine einfache Testabfrage aus, um sicherzustellen,
// dass die Verbindung zur Datenbank funktioniert
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


// =========================
// Express App Setup
// =========================

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const app = express();

// Middleware zum Parsen von Formulardaten (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Middleware zum Parsen von JSON-Requests
app.use(express.json());


// =========================
// Session-Konfiguration
// =========================

// Gemeinsamer Session-Store in MariaDB,
// damit Sessions bei mehreren Serverinstanzen erhalten bleiben
const sessionStore = new MySQLStore({
  host: process.env.MYSQL_HOSTNAME,
  port: 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

// Session-Middleware
app.use(session({
  key: 'connect.sid', // Name des Session-Cookies
  secret: 'mein_geheimes_login_secret', // Secret zur Signierung
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,  // Cookie nicht über JS zugreifbar (Sicherheit)
    secure: false,   // true bei HTTPS!
    maxAge: 1000 * 60 * 60 // 1 Stunde gültig
  }
}));


// =========================
// Rate Limiting (DoS-Schutz)
// =========================

// Begrenzung der Anzahl an Requests pro Zeitfenster,
// um Missbrauch und Überlastung zu verhindern
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: Number.parseInt(process.env.RATE_LIMIT_MAX || '10000', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
});

// Rate Limiter wird global angewendet
app.use(limiter);


// =========================
// Routing & statische Inhalte
// =========================

// Startseite → Weiterleitung auf statische Seite (Frontend)
app.get('/', (req, res) => {
  res.redirect('/static');
});

// Statische Dateien (z. B. HTML, CSS, JS) aus dem "public"-Ordner
app.use('/static', express.static('public'));


// =========================
// API-Routen
// =========================

// Jede Route kapselt einen bestimmten Bereich der Anwendung
app.use('/artikel', artikelRoutes);
app.use('/kategorien', kategorienRoutes);
app.use('/warenkorb', warenkorbRoutes);
app.use('/bestellung', bestellungRoutes);
app.use('/lagerbestand', lagerbestandRoutes);
app.use('/worker', workerRoutes);
app.use('/benutzer', benutzerRoutes);
app.use('/adresse', adresseRoutes);


// =========================
// Server starten
// =========================

// Startet den HTTP-Server und hört auf eingehende Anfragen
app.listen(PORT, HOST, () => {
  console.log(`Server läuft auf http://${HOST}:${PORT}`);
});
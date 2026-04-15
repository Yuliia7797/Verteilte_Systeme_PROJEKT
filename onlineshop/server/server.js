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
    - Initialisierung von Socket.IO für Echtzeit-Kommunikation
    - Verbindung zu Redis für serverübergreifende WebSocket-Synchronisation
    - Starten des HTTP-Servers

    Der Server dient als zentrale Schnittstelle zwischen
    Frontend, Datenbank, Worker-System und Echtzeit-Kommunikation.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

// =========================
// Imports
// =========================

const http = require('http');
const express = require('express');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// Eigene Module
const connection = require('./db');
const { setIo } = require('./socket');

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
// Konfiguration
// =========================

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'mein_geheimes_login_secret';

const RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '60000',
  10
);

const RATE_LIMIT_MAX = Number.parseInt(
  process.env.RATE_LIMIT_MAX || '10000',
  10
);

// Redis-Verbindung für den Socket.IO-Adapter
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// =========================
// Express App Setup
// =========================

const app = express();

// HTTP-Server wird benötigt, damit Express und Socket.IO
// denselben Server gemeinsam nutzen können.
const httpServer = http.createServer(app);

// Socket.IO-Server für Echtzeit-Kommunikation.
// Es wird ausschließlich der echte WebSocket-Transport verwendet,
// damit die Architektur mit mehreren Serverinstanzen stabil bleibt.
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  },
  transports: ['websocket']
});

// Socket.IO-Instanz global verfügbar machen,
// damit andere Module Ereignisse senden können.
setIo(io);

// =========================
// Hilfsfunktionen
// =========================

/**
 * Führt eine einfache Testabfrage aus, um sicherzustellen,
 * dass die Verbindung zur Datenbank funktioniert.
 *
 * @function testDatabaseConnection
 * @returns {Promise<void>}
 */
function testDatabaseConnection() {
  return new Promise((resolve, reject) => {
    console.log('Verbinde mit Datenbank...');

    connection.query('SELECT 1 + 1 AS solution', function (error, results) {
      if (error) {
        return reject(error);
      }

      if (results[0].solution === 2) {
        console.log('Datenbankverbindung erfolgreich');
        resolve();
      } else {
        reject(new Error('Datenbankverbindung fehlgeschlagen!'));
      }
    });
  });
}

/**
 * Erstellt den gemeinsamen Session-Store in MariaDB.
 *
 * @function createSessionStore
 * @returns {any} Konfigurierter MySQL-Session-Store
 */
function createSessionStore() {
  return new MySQLStore({
    host: process.env.MYSQL_HOSTNAME,
    port: 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
}

/**
 * Registriert alle globalen Middlewares der Anwendung.
 *
 * @function registerMiddleware
 * @param {import('express').Express} app - Express-Anwendung
 * @param {any} sessionStore - Gemeinsamer Session-Store
 * @returns {void}
 */
function registerMiddleware(app, sessionStore) {
  // Middleware zum Parsen von Formulardaten
  app.use(express.urlencoded({ extended: true }));

  // Middleware zum Parsen von JSON-Requests
  app.use(express.json());

  // Session-Middleware
  app.use(session({
    key: 'connect.sid',
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, 
      maxAge: 1000 * 60 * 60 // 1 Stunde
    }
  }));

  // Rate Limiting (DoS-Schutz)
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Zu viele Anfragen. Bitte später erneut versuchen.' }
  });

  app.use(limiter);
}

/**
 * Registriert statische Inhalte und Basis-Routing.
 *
 * @function registerStaticAndBaseRoutes
 * @param {import('express').Express} app - Express-Anwendung
 * @returns {void}
 */
function registerStaticAndBaseRoutes(app) {
  // Startseite → Weiterleitung auf statische Seite
  app.get('/', function (req, res) {
    res.redirect('/static');
  });

  // Statische Dateien aus dem "public"-Ordner bereitstellen
  app.use('/static', express.static('public'));
}

/**
 * Registriert alle API-Routen der Anwendung.
 *
 * @function registerApiRoutes
 * @param {import('express').Express} app - Express-Anwendung
 * @returns {void}
 */
function registerApiRoutes(app) {
  app.use('/artikel', artikelRoutes);
  app.use('/kategorien', kategorienRoutes);
  app.use('/warenkorb', warenkorbRoutes);
  app.use('/bestellung', bestellungRoutes);
  app.use('/lagerbestand', lagerbestandRoutes);
  app.use('/worker', workerRoutes);
  app.use('/benutzer', benutzerRoutes);
  app.use('/adresse', adresseRoutes);
}

/**
 * Initialisiert die Redis-Verbindung für Socket.IO.
 *
 * Hintergrund:
 * Bei mehreren Serverinstanzen müssen Socket-Ereignisse
 * serverübergreifend synchronisiert werden. Dafür wird Redis
 * als Pub/Sub-Kanal verwendet.
 *
 * @async
 * @function initializeSocketAdapter
 * @returns {Promise<void>}
 */
async function initializeSocketAdapter() {
  // Ein Redis-Client für das Veröffentlichen von Nachrichten
  const pubClient = createClient({
    url: REDIS_URL
  });

  // Zweiter Redis-Client für das Empfangen von Nachrichten
  const subClient = pubClient.duplicate();

  pubClient.on('error', function (error) {
    console.error('Redis Pub-Client Fehler:', error.message);
  });

  subClient.on('error', function (error) {
    console.error('Redis Sub-Client Fehler:', error.message);
  });

  await pubClient.connect();
  await subClient.connect();

  // Socket.IO mit Redis-Adapter verbinden,
  // damit alle Serverinstanzen dieselben Echtzeit-Ereignisse kennen.
  io.adapter(createAdapter(pubClient, subClient));

  console.log('Redis-Adapter für Socket.IO erfolgreich initialisiert');
}

/**
 * Registriert alle Socket.IO-Ereignisse.
 *
 * @function registerSocketEvents
 * @returns {void}
 */
function registerSocketEvents() {
  io.on('connection', function (socket) {
    console.log(`Neuer Socket verbunden: ${socket.id}`);

    // Wird aufgerufen, wenn ein Worker eine Änderung am Worker-Status meldet
    socket.on('worker_event', function (daten) {
      io.emit('worker_aktualisiert', daten);
    });

    // Wird aufgerufen, wenn ein Worker oder Server eine Aufgabenänderung meldet
    socket.on('aufgabe_event', function (daten) {
      io.emit('aufgabe_aktualisiert', daten);
    });

    // Wird aufgerufen, wenn sich ein Bestellstatus geändert hat
    socket.on('bestellung_event', function (daten) {
      io.emit('bestellung_aktualisiert', daten);
    });

    socket.on('disconnect', function () {
      console.log(`Socket getrennt: ${socket.id}`);
    });
  });
}

/**
 * Startet den HTTP-Server.
 *
 * @function startHttpServer
 * @returns {void}
 */
function startHttpServer() {
  httpServer.listen(PORT, HOST, function () {
    console.log(`Server läuft auf http://${HOST}:${PORT}`);
  });
}

/**
 * Initialisiert die Anwendung in der korrekten Reihenfolge.
 *
 * @async
 * @function start
 * @returns {Promise<void>}
 */
async function start() {
  await testDatabaseConnection();
  await initializeSocketAdapter();

  // Health-Check vor aller Middleware – kein Session-Overhead
  app.get('/health', function (req, res) {
    res.status(200).json({ status: 'ok' });
  });

  const sessionStore = createSessionStore();

  registerMiddleware(app, sessionStore);
  registerStaticAndBaseRoutes(app);
  registerApiRoutes(app);
  registerSocketEvents();
  startHttpServer();
}

// =========================
// Start
// =========================

start().catch(function (error) {
  console.error('Server konnte nicht gestartet werden:', error.message);
  process.exit(1);
});
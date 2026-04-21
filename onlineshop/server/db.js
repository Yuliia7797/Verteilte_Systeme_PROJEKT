/*
  Datei: db.js
  Beschreibung:
    Diese Datei erstellt die zentrale Datenbankverbindung für den gesamten Server.

    Es wird ein gemeinsamer Connection-Pool angelegt, der von allen Routen
    und Modulen des Servers genutzt wird. Die Zugangsdaten werden ausschließlich
    aus Umgebungsvariablen gelesen.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

const mysql = require('mysql');

/*
  Zentrale Datenbank-Konfiguration.
  Alle Zugangsdaten werden aus den Umgebungsvariablen gelesen.
*/
const dbInfo = {
  connectionLimit: 10,
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

/*
  Gemeinsamer Connection-Pool für das gesamte Projekt.
  Dadurch muss die Datenbankverbindung nicht in jeder Route
  erneut definiert werden.
*/
const connection = mysql.createPool(dbInfo);

module.exports = connection;
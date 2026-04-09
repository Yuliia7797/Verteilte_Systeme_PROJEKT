/*
  Datei: socket.js
  Beschreibung:
    Diese Datei stellt eine zentrale Socket.IO-Instanz bereit.

    Zweck:
    - Socket.IO-Instanz einmal zentral speichern
    - Socket.IO-Instanz in anderen Modulen verfügbar machen
    - Echtzeit-Ereignisse aus Routen oder anderen Servermodulen senden

    Diese Datei ist wichtig, damit nicht jede Route ihren eigenen
    Socket-Server erstellt, sondern alle dieselbe Instanz verwenden.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 09.04.2026
*/

'use strict';

// Zentrale Referenz auf die Socket.IO-Instanz
let io = null;

/**
 * Speichert die Socket.IO-Instanz zentral ab.
 *
 * @function setIo
 * @param {import('socket.io').Server} ioInstance - Socket.IO-Instanz
 * @returns {void}
 */
function setIo(ioInstance) {
  io = ioInstance;
}

/**
 * Liefert die zentrale Socket.IO-Instanz zurück.
 *
 * @function getIo
 * @returns {import('socket.io').Server} Socket.IO-Instanz
 * @throws {Error} Falls Socket.IO noch nicht initialisiert wurde
 */
function getIo() {
  if (!io) {
    throw new Error('Socket.IO wurde noch nicht initialisiert.');
  }

  return io;
}

module.exports = {
  setIo,
  getIo
};
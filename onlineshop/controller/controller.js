/*
  Datei: controller.js
  Beschreibung:
    Diese Datei implementiert den Controller für das Worker-System.

    Der Controller übernimmt die zentrale Koordination zwischen Aufgaben
    (aufgabe) und Workern (worker). Er überwacht Worker anhand von Heartbeats,
    gibt blockierte Aufgaben frei und verteilt neue Aufgaben an freie Worker.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';


// =========================
// Imports & Konfiguration
// =========================

const mysql = require('mysql');

const dbInfo = {
    connectionLimit: 10,
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);

console.log('Controller startet und verbindet sich mit der Datenbank...');


// =========================
// Datenbank-Helfer
// =========================

/**
 * Führt eine SQL-Abfrage über den Connection-Pool aus.
 *
 * @function query
 * @param {string} sql - SQL-Abfrage
 * @param {Array<any>} [params=[]] - Parameter für die Abfrage
 * @returns {Promise<any>} Ergebnis der SQL-Abfrage
 */
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, function (error, results) {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

/**
 * Holt eine einzelne Datenbankverbindung aus dem Pool.
 *
 * @function getConnection
 * @returns {Promise<any>} Datenbankverbindung
 */
function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            } else {
                resolve(connection);
            }
        });
    });
}


// =========================
// Aufgaben & Worker abrufen
// =========================

/**
 * Holt die nächste wartende Aufgabe.
 *
 * @async
 * @function getWaitingTask
 * @returns {Promise<Object|null>} Nächste Aufgabe oder null
 */
async function getWaitingTask() {
    const results = await query(
        `SELECT *
         FROM aufgabe
         WHERE status = 'wartend'
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}

/**
 * Holt einen freien aktiven Worker.
 * Ein Worker ist frei, wenn ihm aktuell keine aktive Aufgabe
 * zugewiesen ist.
 *
 * @async
 * @function getFreeWorker
 * @returns {Promise<Object|null>} Freier Worker oder null
 */
async function getFreeWorker() {
    const results = await query(
        `SELECT *
         FROM worker
         WHERE status = 'aktiv'
           AND id NOT IN (
             SELECT worker_id
             FROM aufgabe
             WHERE status IN ('zugewiesen', 'in_bearbeitung')
               AND worker_id IS NOT NULL
           )
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}

/**
 * Prüft, ob es aktuell mindestens eine wartende Aufgabe gibt.
 *
 * @async
 * @function hasWaitingTask
 * @returns {Promise<boolean>} true, wenn eine wartende Aufgabe existiert
 */
async function hasWaitingTask() {
    const results = await query(
        `SELECT id
         FROM aufgabe
         WHERE status = 'wartend'
         LIMIT 1`
    );

    return results.length > 0;
}

/**
 * Prüft, ob es aktuell mindestens einen freien Worker gibt.
 *
 * @async
 * @function hasFreeWorker
 * @returns {Promise<boolean>} true, wenn ein freier Worker existiert
 */
async function hasFreeWorker() {
    const worker = await getFreeWorker();
    return worker !== null;
}


// =========================
// Aufgabenverwaltung
// =========================

/**
 * Weist atomar eine wartende Aufgabe einem freien Worker zu.
 * Setzt den Status von 'wartend' auf 'zugewiesen'.
 *
 * Diese Funktion verwendet eine Transaktion, damit nicht zwei
 * Controller-Durchläufe dieselbe Aufgabe oder denselben Worker
 * gleichzeitig verwenden.
 *
 * @async
 * @function assignNextTaskToFreeWorker
 * @returns {Promise<Object|null>} Zuweisungsobjekt oder null
 */
async function assignNextTaskToFreeWorker() {
    const conn = await getConnection();

    return new Promise((resolve, reject) => {
        conn.beginTransaction(function (err) {
            if (err) {
                conn.release();
                return reject(err);
            }

            conn.query(
                `SELECT *
                 FROM worker
                 WHERE status = 'aktiv'
                   AND id NOT IN (
                     SELECT worker_id
                     FROM aufgabe
                     WHERE status IN ('zugewiesen', 'in_bearbeitung')
                       AND worker_id IS NOT NULL
                   )
                 ORDER BY id ASC
                 LIMIT 1
                 FOR UPDATE`,
                [],
                function (err, workerResults) {
                    if (err) {
                        return conn.rollback(() => {
                            conn.release();
                            reject(err);
                        });
                    }

                    if (workerResults.length === 0) {
                        return conn.rollback(() => {
                            conn.release();
                            resolve(null);
                        });
                    }

                    const worker = workerResults[0];

                    conn.query(
                        `SELECT *
                         FROM aufgabe
                         WHERE status = 'wartend'
                         ORDER BY id ASC
                         LIMIT 1
                         FOR UPDATE`,
                        [],
                        function (err, taskResults) {
                            if (err) {
                                return conn.rollback(() => {
                                    conn.release();
                                    reject(err);
                                });
                            }

                            if (taskResults.length === 0) {
                                return conn.rollback(() => {
                                    conn.release();
                                    resolve(null);
                                });
                            }

                            const task = taskResults[0];

                            conn.query(
                                `UPDATE aufgabe
                                 SET worker_id = ?, status = 'zugewiesen'
                                 WHERE id = ?
                                   AND status = 'wartend'
                                   AND worker_id IS NULL`,
                                [worker.id, task.id],
                                function (err, updateResult) {
                                    if (err) {
                                        return conn.rollback(() => {
                                            conn.release();
                                            reject(err);
                                        });
                                    }

                                    if (!updateResult.affectedRows) {
                                        return conn.rollback(() => {
                                            conn.release();
                                            resolve(null);
                                        });
                                    }

                                    conn.commit(function (err) {
                                        conn.release();

                                        if (err) {
                                            return reject(err);
                                        }

                                        resolve({
                                            taskId: task.id,
                                            workerId: worker.id
                                        });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

/**
 * Weist so viele wartende Aufgaben wie möglich an freie Worker zu.
 *
 * @async
 * @function assignTasksToFreeWorkers
 * @returns {Promise<number>} Anzahl der durchgeführten Zuweisungen
 */
async function assignTasksToFreeWorkers() {
    let anzahlZuweisungen = 0;

    while (true) {
        const zuweisung = await assignNextTaskToFreeWorker();

        if (!zuweisung) {
            break;
        }

        anzahlZuweisungen++;
        console.log(
            `Aufgabe ${zuweisung.taskId} wurde Worker ${zuweisung.workerId} zugewiesen`
        );
    }

    return anzahlZuweisungen;
}


// =========================
// Worker-Überwachung
// =========================

/**
 * Markiert Worker als inaktiv, wenn ihr letzter Heartbeat zu alt ist.
 *
 * @async
 * @function markInactiveWorkers
 * @returns {Promise<void>}
 */
async function markInactiveWorkers() {
    await query(
        `UPDATE worker
         SET status = 'inaktiv'
         WHERE status = 'aktiv'
           AND letzter_heartbeat < DATE_SUB(NOW(), INTERVAL 60 SECOND)`
    );
}

/**
 * Holt alle inaktiven Worker.
 *
 * @async
 * @function getInactiveWorkers
 * @returns {Promise<Array<Object>>} Liste inaktiver Worker
 */
async function getInactiveWorkers() {
    const results = await query(
        `SELECT *
         FROM worker
         WHERE status = 'inaktiv'
         ORDER BY id ASC`
    );

    return results;
}


// =========================
// Fehlerbehandlung / Recovery
// =========================

/**
 * Gibt Aufgaben wieder frei, die von inaktiven Workern blockiert wurden.
 *
 * Aufgaben mit Status 'zugewiesen' oder 'in_bearbeitung' werden wieder
 * auf 'wartend' gesetzt und von der Worker-ID gelöst.
 *
 * @async
 * @function releaseTasksFromInactiveWorkers
 * @returns {Promise<void>}
 */
async function releaseTasksFromInactiveWorkers() {
    await query(
        `UPDATE aufgabe
         SET worker_id = NULL,
             status = 'wartend',
             startzeitpunkt = NULL
         WHERE worker_id IN (
             SELECT id
             FROM worker
             WHERE status = 'inaktiv'
         )
           AND status IN ('zugewiesen', 'in_bearbeitung')`
    );
}

/**
 * Setzt fehlgeschlagene Aufgaben ohne zugewiesenen Worker optional wieder
 * auf 'wartend', damit sie neu verteilt werden können.
 *
 * Diese Funktion ist nur dann sinnvoll, wenn fehlgeschlagene Aufgaben
 * erneut verarbeitet werden sollen. Bei Bedarf kann sie später erweitert
 * werden, z. B. mit einem Max-Retry-Limit.
 *
 * @async
 * @function retryReleasedFailedTasks
 * @returns {Promise<void>}
 */
async function retryReleasedFailedTasks() {
    await query(
        `UPDATE aufgabe
         SET status = 'wartend',
             worker_id = NULL,
             startzeitpunkt = NULL,
             endzeitpunkt = NULL
         WHERE status = 'fehlgeschlagen'
           AND worker_id IS NULL
           AND versuch_anzahl < 3`
    );
}


// =========================
// Controller-Logik
// =========================

/**
 * Führt einen einzelnen Verteilungszyklus des Controllers aus.
 *
 * Reihenfolge:
 * 1. Inaktive Worker markieren
 * 2. Blockierte Aufgaben freigeben
 * 3. Optional fehlgeschlagene Aufgaben erneut freigeben
 * 4. Wartende Aufgaben an freie Worker verteilen
 *
 * @async
 * @function runControllerCycle
 * @returns {Promise<void>}
 */
async function runControllerCycle() {
    await markInactiveWorkers();
    await releaseTasksFromInactiveWorkers();
    await retryReleasedFailedTasks();

    const anzahlZuweisungen = await assignTasksToFreeWorkers();

    if (anzahlZuweisungen === 0) {
        process.stdout.write('.');
    }
}

/**
 * Hauptschleife des Controllers.
 * Überwacht Worker und verteilt Aufgaben.
 *
 * @async
 * @function controllerLoop
 * @returns {Promise<void>}
 */
async function controllerLoop() {
    console.log('Controller-Loop gestartet. Prüfe alle 5 Sekunden auf freie Worker und wartende Aufgaben...');

    while (true) {
        try {
            await runControllerCycle();
        } catch (error) {
            console.error('Fehler im Controller-Loop:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}


// =========================
// Startlogik
// =========================

/**
 * Startet den Controller-Prozess.
 * Führt bei Fehlern automatische Wiederholungsversuche durch.
 *
 * @async
 * @function start
 * @returns {Promise<void>}
 */
async function start() {
    let versuch = 0;

    while (true) {
        try {
            versuch++;
            console.log(`Verbindungsversuch ${versuch}...`);

            await new Promise(resolve => setTimeout(resolve, 5000));
            await controllerLoop();
        } catch (error) {
            console.error(`Versuch ${versuch} fehlgeschlagen: ${error.message}`);
            console.log('Warte 5 Sekunden und versuche erneut...');

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}


// =========================
// Graceful Shutdown
// =========================

/**
 * Behandelt das saubere Beenden des Controller-Prozesses.
 *
 * @function handleShutdown
 * @param {string} signal - Empfangendes Prozesssignal
 * @returns {void}
 */
function handleShutdown(signal) {
    console.log(`\nSignal empfangen: ${signal}. Controller wird sauber beendet...`);

    pool.end(function () {
        process.exit(0);
    });
}

process.on('SIGINT', function () {
    handleShutdown('SIGINT');
});

process.on('SIGTERM', function () {
    handleShutdown('SIGTERM');
});

start();
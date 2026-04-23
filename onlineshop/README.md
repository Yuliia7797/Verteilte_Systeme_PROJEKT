# MyShop – Verteiltes Online-Bestellsystem mit Node.js, MariaDB und Docker

## Allgemein

In diesem Projekt wird ein verteiltes Online-Bestellsystem umgesetzt. Die Anwendung basiert auf einem Node.js-Server mit Express, einer MariaDB-Datenbank, einem Nginx-Load-Balancer sowie zusätzlichen Worker- und Controller-Komponenten.

Der Webserver stellt die Benutzeroberfläche und die API-Endpunkte bereit. Die Datenbank speichert Benutzer, Adressen, Artikel, Kategorien, Bestellungen, Bestellpositionen, Warenkörbe, Lagerbestände sowie Informationen zu Workern und Aufgaben. Über den Nginx-Container werden die eingehenden Anfragen an den Backend-Service weitergeleitet.

Die Anwendung wurde so aufgebaut, dass typische Funktionen eines kleinen Online-Shops umgesetzt werden können. Dazu gehören unter anderem Registrierung und Login, Artikelanzeige, Kategorien, Suche, Warenkorb, Checkout, Bestellungen, Rechnungen sowie ein Admin-Bereich zur Verwaltung.

Zusätzlich unterstützt das Projekt Echtzeit-Kommunikation mit Socket.IO. Dadurch können Änderungen, zum Beispiel bei Worker-Status, Aufgaben oder Bestellstatus, direkt in der Oberfläche aktualisiert werden.

## Projektaufbau

Die wichtigsten Ordner und Dateien im Projekt sind:

- `server`  
  Enthält den Node.js-Webserver, die API-Routen, die Session-Verwaltung, die Socket.IO-Integration sowie die statischen Dateien der Benutzeroberfläche.

- `worker`  
  Enthält die Worker-Logik für Hintergrundverarbeitung, zum Beispiel für Bestellstatus, E-Mail-Versand, Rechnungs-Erstellung und das Leeren des Warenkorbs.

- `controller`  
  Enthält die zentrale Steuerungslogik für das Worker-System. Der Controller überwacht Worker, gibt blockierte Aufgaben frei und verteilt neue Aufgaben.

- `db`  
  Enthält die Docker-Konfiguration der Datenbank sowie das SQL-Dump `onlinebestellsystem.sql`.

- `docker-compose.yaml`  
  Definiert alle Container und deren Zusammenspiel.

- `nginx.conf`  
  Konfiguration des Nginx-Load-Balancers inklusive Weiterleitung von WebSocket-Verbindungen.

## Datenbank

Die Datenbank ist eine `MariaDB`-Datenbank.  
Alle Datenbankskripte befinden sich im Ordner `db`.

Die Datei `onlinebestellsystem.sql` enthält das aktuelle Datenbankschema sowie Beispieldaten. Dieses SQL-Dump wird beim ersten Erstellen des Datenbank-Containers automatisch importiert.

Wichtig ist dabei:

- Beim **ersten** Start wird die Datenbank mit den Inhalten aus `onlinebestellsystem.sql` aufgebaut.
- Bei späteren Starts bleiben die bereits vorhandenen Daten erhalten.
- Wenn die Datenbank komplett neu erstellt werden soll, müssen die Container und Volumes entfernt werden.
- Das Schema enthält neben Shop-Daten auch Tabellen für Sessions, Worker, Aufgaben und Rechnungen.

## Server

Der Server wurde mit `Express` umgesetzt und stellt sowohl die statischen Seiten als auch die API-Routen bereit.

Im Ordner `server` befinden sich unter anderem:

- `server.js`  
  Startpunkt des Webservers mit Middleware, Session-Handling, Rate Limiting, Health-Check und Socket.IO-Initialisierung

- `routes/`  
  Enthält die API-Routen, zum Beispiel für:
  - Artikel
  - Kategorien
  - Benutzer
  - Adressen
  - Warenkorb
  - Bestellungen
  - Lagerbestand
  - Worker

- `public/`  
  Enthält die HTML-, CSS- und JavaScript-Dateien der Oberfläche

- `socket.js`  
  Stellt die zentrale Socket.IO-Instanz für Echtzeit-Ereignisse bereit

## Benutzeroberfläche

Die statischen Seiten liegen im Ordner `server/public`.

Wichtige Seiten sind zum Beispiel:

- `index.html` – Startseite
- `artikel.html` – Artikeldetails
- `kategorie.html` – Anzeige nach Kategorien
- `suche.html` – Suchseite
- `warenkorb.html` – Warenkorb
- `kasse.html` – Checkout
- `bestellungAbgeschlossen.html` – Bestellbestätigung nach erfolgreichem Abschluss
- `login.html` – Login
- `registrieren.html` – Registrierung
- `mein-konto.html` – Benutzerkonto mit Bestellübersicht und Rechnungsdownload

Zusätzlich gibt es Admin-Seiten:

- `admin.html` – Überblick über den Admin-Bereich
- `adminartikel.html` – Artikelverwaltung
- `adminkategorien.html` – Kategorienverwaltung
- `adminlager.html` – Lagerverwaltung
- `adminbestellungen.html` – Bestellverwaltung
- `adminbestelldetails.html` – Detailansicht einzelner Bestellungen
- `adminbenutzer.html` – Benutzerverwaltung
- `adminworker.html` – Worker- und Aufgabenübersicht

## Admin-Bereich

Der Admin-Bereich enthält zusätzliche Verwaltungsfunktionen, die nur für Benutzer mit der Rolle `admin` vorgesehen sind.

Aktuell können dort unter anderem folgende Bereiche genutzt werden:

- Artikel ansehen, erstellen, bearbeiten und deaktivieren
- Kategorien ansehen, erstellen und löschen
- Lagerbestand ansehen und ändern
- Bestellungen ansehen, Details prüfen und Status verwalten
- Registrierte Benutzer ansehen und neue Benutzer mit Rolle `admin` oder `kunde` anlegen
- Worker und Aufgaben überwachen sowie Worker-Status ändern

Der Admin-Bereich ist nicht nur im Frontend geschützt, sondern zusätzlich auch im Backend abgesichert. Das bedeutet, dass normale Benutzer keine Admin-Funktionen ausführen können, selbst wenn sie versuchen, eine Admin-Seite oder eine geschützte Route direkt über einen Link aufzurufen.

## Testzugang

Zum Testen des Admin-Bereichs kann folgender Benutzer verwendet werden:

- E-Mail: `admin@test.de`
- Passwort: `admin123`

Nach dem Login sind die Admin-Funktionen verfügbar.

## Rate Limiting

Der Server verwendet `express-rate-limit`, um zu viele Anfragen in kurzer Zeit zu begrenzen.

Für Tests wurden die Werte bewusst großzügig gesetzt:

- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=10000`

Diese Werte können bei Bedarf in der `docker-compose.yaml` angepasst werden.

## PhpMyAdmin

Zusätzlich wird ein `phpMyAdmin`-Container gestartet.  
Dieser erleichtert die Ansicht und Kontrolle der Datenbank während der Entwicklung.

PhpMyAdmin ist nach dem Start erreichbar unter:

`http://localhost:8085/`

## Ausführung mit Docker und docker-compose

Das Projekt wird über Docker gestartet.  
Die zentrale Datei dafür ist `docker-compose.yaml`.

Mit folgendem Befehl kann das Projekt gebaut und gestartet werden:

`docker compose up --build`

Dabei werden folgende Container gestartet:

`nginx`  
`server`  
`worker`  
`controller`  
`onlinebestellsystem`  
`redis`  
`mailhog`  
`phpmyadmin`

Die Anwendung ist danach erreichbar unter:

`http://localhost/`

Da Nginx auf Port 80 läuft, muss hier normalerweise kein zusätzlicher Port angegeben werden.

Zusätzlich sind nach dem Start erreichbar:

- MailHog unter `http://localhost:8025/`
- PhpMyAdmin unter `http://localhost:8085/`

Wichtiger Hinweis zur Datenbank

Wenn Änderungen an der Datei `onlinebestellsystem.sql` vorgenommen wurden und diese neu eingespielt werden sollen, reicht ein normales `docker compose up --build` nicht immer aus.

In diesem Fall müssen die Container und Datenbankdaten zuerst entfernt werden, damit die Initialisierung erneut ausgeführt wird.

Lokale Entwicklung

Eine direkte lokale Ausführung ohne Docker ist grundsätzlich möglich, wird in diesem Projekt aber nicht empfohlen, da mehrere Container miteinander zusammenarbeiten.

Insbesondere werden benötigt:

- eine erreichbare MariaDB-Datenbank
- ein Redis-Dienst für die serverübergreifende Socket.IO-Synchronisation
- ein SMTP-Testserver wie MailHog für den E-Mail-Versand
- die korrekten Environment-Variablen
- die passende Container-Struktur
- ein gemeinsames Volume für erzeugte Rechnungen

Deshalb sollte das Projekt bevorzugt mit Docker gestartet werden.

Ziel des Projekts

Das Ziel des Projekts ist die Umsetzung eines Online-Shops mit grundlegenden Shop-Funktionen und einer verteilten Architektur. Gleichzeitig soll gezeigt werden, wie mehrere Komponenten wie Webserver, Datenbank, Worker, Controller, Redis und Load-Balancer zusammenarbeiten können.

Ein weiterer Schwerpunkt liegt auf der Trennung von synchronen und asynchronen Prozessen. Während Bestellungen über den Server entgegengenommen werden, laufen Folgeaufgaben wie E-Mail-Versand, Rechnungserstellung und Teile der Statusverarbeitung im Worker-System im Hintergrund.

Technologien

In diesem Projekt werden unter anderem folgende Technologien verwendet:

- Node.js
- Express
- MariaDB
- MySQL-Client für Node.js
- Express Session
- express-rate-limit
- Socket.IO
- Redis
- Nodemailer
- PDFKit
- Docker
- Docker Compose
- Nginx
- MailHog
- phpMyAdmin
- Bootstrap
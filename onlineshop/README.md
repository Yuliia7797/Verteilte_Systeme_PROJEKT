# MyShop – Verteiltes Online-Bestellsystem mit Node.js, MariaDB und Docker

## Allgemein

In diesem Projekt wird ein verteiltes Online-Bestellsystem umgesetzt. Die Anwendung basiert auf einem Node.js-Server mit Express, einer MariaDB-Datenbank, einem Nginx-Load-Balancer sowie zusätzlichen Worker- und Controller-Komponenten.

Der Webserver stellt die Benutzeroberfläche und die API-Endpunkte bereit. Die Datenbank speichert Benutzer, Artikel, Kategorien, Bestellungen, Warenkörbe und Lagerbestände. Über den Nginx-Container werden die eingehenden Anfragen an die Serverinstanzen weitergeleitet.

Die Anwendung wurde so aufgebaut, dass typische Funktionen eines kleinen Online-Shops umgesetzt werden können. Dazu gehören unter anderem Registrierung und Login, Artikelanzeige, Kategorien, Warenkorb, Bestellungen sowie ein Admin-Bereich zur Verwaltung.

## Projektaufbau

Die wichtigsten Ordner und Dateien im Projekt sind:

- `server`  
  Enthält den Node.js-Webserver, die Routen, Modelle und die statischen Dateien der Benutzeroberfläche.

- `worker`  
  Enthält die Worker-Logik. Diese Komponente ist für Hintergrundverarbeitung vorgesehen.

- `controller`  
  Enthält zusätzliche Steuerungslogik für die verteilte Architektur.

- `db`  
  Enthält die Docker-Konfiguration der Datenbank sowie das SQL-Dump `onlinebestellsystem.sql`.

- `docker-compose.yaml`  
  Definiert alle Container und deren Zusammenspiel.

- `nginx.conf`  
  Konfiguration des Nginx-Load-Balancers.

## Datenbank

Die Datenbank ist eine `MariaDB`-Datenbank.  
Alle Datenbankskripte befinden sich im Ordner `db`.

Die Datei `onlinebestellsystem.sql` enthält das aktuelle Datenbankschema sowie Beispieldaten. Dieses SQL-Dump wird beim ersten Erstellen des Datenbank-Containers automatisch importiert.

Wichtig ist dabei:

- Beim **ersten** Start wird die Datenbank mit den Inhalten aus `onlinebestellsystem.sql` aufgebaut.
- Bei späteren Starts bleiben die bereits vorhandenen Daten erhalten.
- Wenn die Datenbank komplett neu erstellt werden soll, müssen die Container und Volumes entfernt werden.

## Server

Der Server wurde mit `Express` umgesetzt und stellt sowohl die statischen Seiten als auch die API-Routen bereit.

Im Ordner `server` befinden sich unter anderem:

- `server.js`  
  Startpunkt des Webservers

- `routes/`  
  Enthält die API-Routen, zum Beispiel für:
  - Artikel
  - Kategorien
  - Benutzer
  - Warenkorb
  - Bestellungen
  - Lagerbestand

- `models/`  
  Enthält die Datenmodelle

- `public/`  
  Enthält die HTML-, CSS- und JavaScript-Dateien der Oberfläche

## Benutzeroberfläche

Die statischen Seiten liegen im Ordner `server/public`.

Wichtige Seiten sind zum Beispiel:

- `index.html` – Startseite
- `artikel.html` – Artikeldetails
- `kategorie.html` – Anzeige nach Kategorien
- `suche.html` – Suchseite
- `warenkorb.html` – Warenkorb
- `login.html` – Login
- `registrieren.html` – Registrierung
- `mein-konto.html` – Benutzerkonto

Zusätzlich gibt es Admin-Seiten:

- `admin.html` – Überblick über den Admin-Bereich
- `adminartikel.html` – Artikelverwaltung
- `adminkategorien.html` – Kategorienverwaltung
- `adminlager.html` – Lagerverwaltung

## Admin-Bereich

Der Admin-Bereich enthält zusätzliche Verwaltungsfunktionen, die nur für Benutzer mit der Rolle `admin` vorgesehen sind.

Aktuell können dort unter anderem folgende Bereiche genutzt werden:

- Artikel ansehen, erstellen, bearbeiten und löschen
- Kategorien ansehen, erstellen und löschen
- Lagerbestand ansehen und ändern
- Bestellungen ansehen und verwalten

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

docker-compose up --build

Dabei werden folgende Container gestartet:

nginx
server
worker
controller
onlinebestellsystem
phpmyadmin

Die Anwendung ist danach erreichbar unter:

http://localhost/

Da Nginx auf Port 80 läuft, muss hier normalerweise kein zusätzlicher Port angegeben werden.

Wichtiger Hinweis zur Datenbank

Wenn Änderungen an der Datei onlinebestellsystem.sql vorgenommen wurden und diese neu eingespielt werden sollen, reicht ein normales docker-compose up --build nicht immer aus.

In diesem Fall müssen die Container und Datenbankdaten zuerst entfernt werden, damit die Initialisierung erneut ausgeführt wird.

Lokale Entwicklung

Eine direkte lokale Ausführung ohne Docker ist grundsätzlich möglich, wird in diesem Projekt aber nicht empfohlen, da mehrere Container miteinander zusammenarbeiten.

Insbesondere werden benötigt:

eine erreichbare MariaDB-Datenbank
die korrekten Environment-Variablen
die passende Container-Struktur

Deshalb sollte das Projekt bevorzugt mit Docker gestartet werden.

Ziel des Projekts

Das Ziel des Projekts ist die Umsetzung eines Online-Shops mit grundlegenden Shop-Funktionen und einer verteilten Architektur. Gleichzeitig soll gezeigt werden, wie mehrere Komponenten wie Webserver, Datenbank, Worker, Controller und Load-Balancer zusammenarbeiten können.

Technologien

In diesem Projekt werden unter anderem folgende Technologien verwendet:

Node.js
Express
MariaDB
MySQL-Client für Node.js
Docker
Docker Compose
Nginx
phpMyAdmin
Bootstrap
-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: testdb
-- Erstellungszeit: 14. Mrz 2026 um 17:03
-- Server-Version: 12.0.2-MariaDB-ubu2404
-- PHP-Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `onlinebestellsystem`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `adresse`
--

CREATE TABLE `adresse` (
  `id` int(11) NOT NULL,
  `benutzer_id` int(11) NOT NULL,
  `strasse` varchar(255) NOT NULL,
  `hausnummer` varchar(20) NOT NULL,
  `adresszusatz` varchar(255) DEFAULT NULL,
  `postleitzahl` varchar(20) NOT NULL,
  `ort` varchar(100) NOT NULL,
  `land` varchar(100) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `artikel`
--

CREATE TABLE `artikel` (
  `id` int(11) NOT NULL,
  `kategorie_id` int(11) NOT NULL,
  `bezeichnung` varchar(255) NOT NULL,
  `beschreibung` text DEFAULT NULL,
  `preis` decimal(10,2) NOT NULL,
  `bild_url` varchar(500) DEFAULT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `aufgabe`
--

CREATE TABLE `aufgabe` (
  `id` int(11) NOT NULL,
  `bestellung_id` int(11) DEFAULT NULL,
  `worker_id` int(11) DEFAULT NULL,
  `typ` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `versuch_anzahl` int(11) NOT NULL DEFAULT 0,
  `fehlermeldung` text DEFAULT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `startzeitpunkt` timestamp NULL DEFAULT NULL,
  `endzeitpunkt` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `benutzer`
--

CREATE TABLE `benutzer` (
  `id` int(11) NOT NULL,
  `vorname` varchar(100) NOT NULL,
  `nachname` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwort_hash` varchar(255) NOT NULL,
  `rolle` varchar(50) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `bestellposition`
--

CREATE TABLE `bestellposition` (
  `id` int(11) NOT NULL,
  `bestellung_id` int(11) NOT NULL,
  `artikel_id` int(11) NOT NULL,
  `anzahl` int(11) NOT NULL,
  `einzelpreis` decimal(10,2) NOT NULL,
  `gesamtpreis` decimal(10,2) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `bestellung`
--

CREATE TABLE `bestellung` (
  `id` int(11) NOT NULL,
  `benutzer_id` int(11) NOT NULL,
  `lieferadresse_id` int(11) NOT NULL,
  `gesamtpreis` decimal(10,2) NOT NULL,
  `zahlungsmethode` varchar(50) NOT NULL,
  `zahlungsstatus` varchar(50) NOT NULL,
  `bestellstatus` varchar(50) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `kategorie`
--

CREATE TABLE `kategorie` (
  `id` int(11) NOT NULL,
  `bezeichnung` varchar(255) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `lagerbestand`
--

CREATE TABLE `lagerbestand` (
  `id` int(11) NOT NULL,
  `artikel_id` int(11) NOT NULL,
  `anzahl` int(11) NOT NULL,
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `warenkorb`
--

CREATE TABLE `warenkorb` (
  `id` int(11) NOT NULL,
  `benutzer_id` int(11) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `warenkorb_position`
--

CREATE TABLE `warenkorb_position` (
  `id` int(11) NOT NULL,
  `warenkorb_id` int(11) NOT NULL,
  `artikel_id` int(11) NOT NULL,
  `anzahl` int(11) NOT NULL,
  `einzelpreis` decimal(10,2) NOT NULL,
  `gesamtpreis` decimal(10,2) NOT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `worker`
--

CREATE TABLE `worker` (
  `id` int(11) NOT NULL,
  `typ` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `letzter_heartbeat` timestamp NULL DEFAULT NULL,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `adresse`
--
ALTER TABLE `adresse`
  ADD PRIMARY KEY (`id`),
  ADD KEY `benutzer_id` (`benutzer_id`);

--
-- Indizes für die Tabelle `artikel`
--
ALTER TABLE `artikel`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kategorie_id` (`kategorie_id`);

--
-- Indizes für die Tabelle `aufgabe`
--
ALTER TABLE `aufgabe`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bestellung_id` (`bestellung_id`),
  ADD KEY `worker_id` (`worker_id`);

--
-- Indizes für die Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indizes für die Tabelle `bestellposition`
--
ALTER TABLE `bestellposition`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bestellung_id` (`bestellung_id`),
  ADD KEY `artikel_id` (`artikel_id`);

--
-- Indizes für die Tabelle `bestellung`
--
ALTER TABLE `bestellung`
  ADD PRIMARY KEY (`id`),
  ADD KEY `benutzer_id` (`benutzer_id`),
  ADD KEY `lieferadresse_id` (`lieferadresse_id`);

--
-- Indizes für die Tabelle `kategorie`
--
ALTER TABLE `kategorie`
  ADD PRIMARY KEY (`id`);

--
-- Indizes für die Tabelle `lagerbestand`
--
ALTER TABLE `lagerbestand`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `artikel_id` (`artikel_id`);

--
-- Indizes für die Tabelle `warenkorb`
--
ALTER TABLE `warenkorb`
  ADD PRIMARY KEY (`id`),
  ADD KEY `benutzer_id` (`benutzer_id`);

--
-- Indizes für die Tabelle `warenkorb_position`
--
ALTER TABLE `warenkorb_position`
  ADD PRIMARY KEY (`id`),
  ADD KEY `warenkorb_id` (`warenkorb_id`),
  ADD KEY `artikel_id` (`artikel_id`);

--
-- Indizes für die Tabelle `worker`
--
ALTER TABLE `worker`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `adresse`
--
ALTER TABLE `adresse`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `artikel`
--
ALTER TABLE `artikel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `aufgabe`
--
ALTER TABLE `aufgabe`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `bestellposition`
--
ALTER TABLE `bestellposition`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `bestellung`
--
ALTER TABLE `bestellung`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `kategorie`
--
ALTER TABLE `kategorie`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `lagerbestand`
--
ALTER TABLE `lagerbestand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `warenkorb`
--
ALTER TABLE `warenkorb`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `warenkorb_position`
--
ALTER TABLE `warenkorb_position`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `worker`
--
ALTER TABLE `worker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `adresse`
--
ALTER TABLE `adresse`
  ADD CONSTRAINT `adresse_ibfk_1` FOREIGN KEY (`benutzer_id`) REFERENCES `benutzer` (`id`);

--
-- Constraints der Tabelle `artikel`
--
ALTER TABLE `artikel`
  ADD CONSTRAINT `artikel_ibfk_1` FOREIGN KEY (`kategorie_id`) REFERENCES `kategorie` (`id`);

--
-- Constraints der Tabelle `aufgabe`
--
ALTER TABLE `aufgabe`
  ADD CONSTRAINT `aufgabe_ibfk_1` FOREIGN KEY (`bestellung_id`) REFERENCES `bestellung` (`id`),
  ADD CONSTRAINT `aufgabe_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `worker` (`id`);

--
-- Constraints der Tabelle `bestellposition`
--
ALTER TABLE `bestellposition`
  ADD CONSTRAINT `bestellposition_ibfk_1` FOREIGN KEY (`bestellung_id`) REFERENCES `bestellung` (`id`),
  ADD CONSTRAINT `bestellposition_ibfk_2` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`);

--
-- Constraints der Tabelle `bestellung`
--
ALTER TABLE `bestellung`
  ADD CONSTRAINT `bestellung_ibfk_1` FOREIGN KEY (`benutzer_id`) REFERENCES `benutzer` (`id`),
  ADD CONSTRAINT `bestellung_ibfk_2` FOREIGN KEY (`lieferadresse_id`) REFERENCES `adresse` (`id`);

--
-- Constraints der Tabelle `lagerbestand`
--
ALTER TABLE `lagerbestand`
  ADD CONSTRAINT `lagerbestand_ibfk_1` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`);

--
-- Constraints der Tabelle `warenkorb`
--
ALTER TABLE `warenkorb`
  ADD CONSTRAINT `warenkorb_ibfk_1` FOREIGN KEY (`benutzer_id`) REFERENCES `benutzer` (`id`);

--
-- Constraints der Tabelle `warenkorb_position`
--
ALTER TABLE `warenkorb_position`
  ADD CONSTRAINT `warenkorb_position_ibfk_1` FOREIGN KEY (`warenkorb_id`) REFERENCES `warenkorb` (`id`),
  ADD CONSTRAINT `warenkorb_position_ibfk_2` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

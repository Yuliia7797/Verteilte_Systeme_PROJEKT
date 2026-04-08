-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: onlinebestellsystem
-- Erstellungszeit: 07. Apr 2026 um 17:45
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

--
-- Daten für Tabelle `adresse`
--

INSERT INTO `adresse` (`id`, `benutzer_id`, `strasse`, `hausnummer`, `adresszusatz`, `postleitzahl`, `ort`, `land`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(1, 1, 'Straße', '1', NULL, '1234567', 'Stuttgart', 'Deutschland', '2026-03-29 14:49:19', '2026-03-29 14:49:19'),
(2, 6, 'A', '1', NULL, '12345', 'Stuttgart', 'Deutschland', '2026-04-05 20:41:37', '2026-04-05 20:41:37'),
(3, 4, 'TestStr.', '1', NULL, '12345', 'TestOrt', 'DE', '2026-04-07 16:53:03', '2026-04-07 16:53:03'),
(4, 7, 'Hegensberger Straße', '34', NULL, '73730', 'Esslingen am Neckar', 'DE', '2026-04-07 17:17:42', '2026-04-07 17:17:42');

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
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `langbeschreibung` text DEFAULT NULL,
  `ist_aktiv` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `artikel`
--

INSERT INTO `artikel` (`id`, `kategorie_id`, `bezeichnung`, `beschreibung`, `preis`, `bild_url`, `erstellungszeitpunkt`, `aenderungszeitpunkt`, `langbeschreibung`, `ist_aktiv`) VALUES
(1, 1, 'Harry Potter und der Stein der Weisen', 'Fantasy-Roman von J.K. Rowling.', 14.99, 'images/produkte/harry-potter-und-der-stein-der-weisen.jpeg', '2026-03-17 19:39:02', '2026-03-18 18:26:11', 'Detailreiche und prachtvoll veredelte Neugestaltung aller sieben Bände. Bis zu seinem elften Geburtstag glaubt Harry, er sei ein ganz normaler Junge. Doch dann erfährt er, dass er sich an der Schule für Hexerei und Zauberei einfinden soll - denn er ist ein Zauberer! In Hogwarts stürzt Harry von einem Abenteuer ins nächste und muss gegen Bestien, Mitschüler*innen und Fabelwesen kämpfen. Da ist es gut, dass er schon Freund*innen gefunden hat, die ihm im Kampf gegen die dunklen Mächte zur Seite stehen. Ein generationenübergreifender Fantasy-Klassiker. Millionen von Leser*innen in mehreren Generationen sind mit den Geschichten von Harry Potter aufgewachsen. J.K. Rowling hat mit Hogwarts ein Universum geschaffen, das einzigartig ist und eine große kulturelle Bedeutung erlangt hat. Neben der magischen Welt und spannenden Abenteuern spielen auch moralische Werte wie Freundschaft, Toleranz, Loyalität und der Einsatz für das Gute in ihren Büchern eine wichtige Rolle. Diese vom griechischen Illustrator George Caltsoudas neu gestaltete Ausgabe des ersten Bandes der Harry-Potter-Serie wird Leser*innen jeden Alters verzaubern.', 1),
(2, 1, 'The Hobbit & The Lord of the Rings Boxed Set', 'Boxed Set mit Tolkiens Klassikern in einer illustrierten Geschenkausgabe. Sprache - Englisch', 99.99, 'images/produkte/the-hobbit-the-lord-of-the-rings-boxed-set.jpeg', '2026-03-17 19:39:02', '2026-03-18 19:21:21', 'Boxed gift set von Tolkiens klassischen Meisterwerken, vollständig mit Aquarellillustrationen des gefeierten und preisgekrönten Künstlers Alan Lee ausgestattet. Alan Lee war zudem Conceptual Designer für Peter Jacksons THE HOBBIT-Filme. Diese edle Ausgabe enthält The Hobbit sowie The Lord of the Rings und ist ein besonderes Sammlerstück für alle Fantasy- und Tolkien-Fans.', 1),
(3, 6, 'Erwachsenenpuzzle 3000 Teile - Bibliothek des Drachens', 'Magisches Ravensburger Erwachsenenpuzzle mit 3000 Teilen und fantasievollem Motiv.', 34.99, 'images/produkte/bibliothek-des-drachens.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', '3000 bunte Puzzleteile von Ravensburger sind genau das Richtige für jeden Puzzlefan, der faszinierende Landschaftsmotive, magische Fantasiewelten oder bunte Collagen liebt. Ravensburger Puzzle sind das beste Geschenk zu jedem Anlass: Geburtstag, Weihnachten, Ostern oder einfach als tolle Freizeitbeschäftigung. Entdecke die Ravensburger Qualitätsmerkmale auf einen Blick: Formenvielfalt durch handgefertigte Stanzmesser, passgenaue Puzzleteile, reflexfreies Puzzlebild durch Naturleinenprägung, knickstabile Puzzleteile, hergestellt aus recycelter Pappe. Inhalt: 3000 Teile Ravensburger Puzzle, im Format 121,00 cm x 80,00 cm, ab 14 Jahren geeignet. Gepuzzelt und geklebt macht sich ein Ravensburger Puzzle auch hervorragend als Wanddekoration.', 1),
(4, 2, 'KIKO Milano Lip Volume Transparent', 'Perfektionierende Lippencreme mit Volumeneffekt für gepflegte und voller wirkende Lippen.', 8.99, 'images/produkte/kiko-milano-lip-volume-transparent.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Perfektionierende Lippencreme mit voluminisierender Wirkung: nährt und spendet Feuchtigkeit und belebt die natürliche Farbe der Lippen. Die spezielle Formel, angereichert mit Sesamsamenextrakt und Hyaluronsäurekugeln, verleiht einen glänzenden Volumeneffekt, spendet Feuchtigkeit und definiert die Lippen neu. Dank des Applikators mit beflockter Spitze lässt sich die weiche und umhüllende Textur sehr leicht auf den Lippen verteilen und optimiert deren Beschaffenheit. Dermatologisch getestet.', 1),
(5, 5, 'SONGMICS Hantel-Set, 3 Paar, 1 kg-3 kg', 'Hantel-Set mit 6 Kurzhanteln und Ständer für Krafttraining zu Hause oder im Fitnessstudio.', 49.99, 'images/produkte/songmics-hantel-set.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Ein Set mit 6 Kurzhanteln: 2 x 1 kg, 2 x 2 kg und 2 x 3 kg, erfüllt Ihre unterschiedlichen Trainingsbedürfnisse. Ob Fitness-Enthusiast oder Anfänger, Sie können im Büro oder im Fitnessstudio mit dem Training beginnen – jederzeit und überall. Der zuverlässige Kunststoff-Ständer ermöglicht einen einfachen Zugriff auf Ihre Hanteln und kann mit der kompakten Form in jeder Ecke Ihres Zuhauses platziert werden. Die aus Gusseisen gefertigten Hanteln sind robust und langlebig; dank der sechseckigen Form sind die Hanteln rollsicher, was für ein sicheres und stabiles Training sorgt. Der ergonomisch geformte Griff erhöht die Griffigkeit der Hanteln; die matte Oberfläche ist hautfreundlich und verhindert effektiv ein Abrutschen, sodass auch schwitzige Hände beim Hanteltraining kein Problem sind. Jede Hantel ist deutlich mit ihrem Gewicht markiert und mit leuchtenden Farben für eine schnelle Unterscheidung verschiedener Gewichte versehen. Dies wirkt sich positiv auf Ihre Stimmung aus und ermöglicht ein effizientes Training.', 1),
(6, 3, 'TECKNET Bluetooth Maus, kabellos, 4800 DPI', 'Ergonomische kabellose Maus mit Bluetooth, 2,4G und leisen Klicks für Büro und Alltag.', 19.99, 'images/produkte/tecknet-bluetooth-maus.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Die kabellose Bluetooth-Maus von TECKNET unterstützt Bluetooth 5.0 oder 3.0 sowie 2,4-GHz-Konnektivität, sodass Sie flexibel zwischen den drei Modi wechseln können. Der Bluetooth-Modus spart USB-Anschlüsse, während die 2,4-GHz-USB-Empfängertechnologie Plug-and-Play ermöglicht. Beide Verbindungsarten können gleichzeitig verwendet werden, sodass bis zu 2 Geräte parallel verbunden werden können. Mit 6 einstellbaren DPI-Stufen (4800/3200/2400/1600/1200/800) bietet die Maus eine präzise und flüssige Steuerung auf verschiedenen Oberflächen. Das geräuschlose Design reduziert Klickgeräusche deutlich und eignet sich ideal für Bibliotheken, Büros, Heimbüros oder Cafés. Die ergonomische Form und die gummierten Griffe sorgen für hohen Komfort auch bei längerer Nutzung. Die Maus ist kompatibel mit Windows, Mac OS, Linux, Android und iOS und eignet sich perfekt für Zuhause, Büro oder unterwegs.', 1),
(7, 3, 'One Fire Tischlampe Kabellos LED Tischlampe Akku', 'Faltbare und tragbare LED-Tischlampe mit Akku, Dimmfunktion und augenschonendem Licht.', 24.99, 'images/produkte/one-fire-tischlampe-kabellos.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Die One Fire LED Tischlampe kabellos ist eine faltbare und tragbare Akku-Lampe mit augenschonendem, flimmerfreiem und blendfreiem Licht. Dank der Dimmfunktion können durch langes Berühren des Ein-/Aus-Schalters mehr als 9 Helligkeitsstufen ausgewählt werden. Die Lampe eignet sich ideal für Zuhause, Büro oder Wohnheim und ist besonders praktisch für Studenten und Berufstätige. Die integrierte 3600-mAh-Batterie ermöglicht nach dem Aufladen eine lange Nutzungsdauer, sodass die Lampe flexibel auch ohne Kabel verwendet werden kann. Durch das faltbare Design lässt sich die Tischlampe zu einem runden, kompakten Format zusammenklappen und einfach in einer Tasche oder Schublade verstauen. Zusätzlich verfügt sie über eine Memory-Funktion, die den zuletzt verwendeten Beleuchtungsmodus speichert. Damit ist sie eine vielseitige, platzsparende und benutzerfreundliche Leselampe und Schreibtischlampe für den Alltag.', 1),
(8, 4, 'Vileda Mikrofaser Allzwecktücher Colors, 14er-Pack', 'Mikrofasertücher im Maxi-Pack für die trockene und feuchte Reinigung vieler Oberflächen im Haushalt.', 12.99, 'images/produkte/vileda-mikrofaser-allzwecktuecher-colors.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Mit den Vileda Mikrofaser Allzwecktüchern Colors im 14er-Megapack haben Sie immer ein passendes Tuch zur Hand, um Schmutz und Fett von verschiedensten Oberflächen im Haushalt zu entfernen. Die Tücher bestehen aus 100 % Mikrofaser und sind besonders reinigungsstark sowie saugfähig. Sie reinigen Oberflächen aus Kunststoff, Holz, Edelstahl, Keramik und Glas streifen- und fusselfrei. Die Mikrofasertücher können je nach Bedarf sowohl trocken als auch nass verwendet werden und eignen sich beispielsweise zum Staubwischen oder Fensterputzen. Das Megapack enthält 14 bunte Tücher im Format 30 x 30 cm, sodass für verschiedene Einsatzbereiche leicht unterschiedliche Farben genutzt werden können. Die langlebigen Tücher sind bei bis zu 60 °C in der Waschmaschine waschbar und dadurch immer wiederverwendbar.', 1),
(9, 7, 'Tangle Teezer Ultimate Detangler Haarbürste', 'Entwirrungsbürste für nasses und trockenes Haar mit zweistufigen Borsten für alle Haartypen.', 16.99, 'images/produkte/tangle-teezer-ultimate-detangler.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Der Tangle Teezer Ultimate Detangler eignet sich für glattes, welliges und lockiges Haar und unterstützt eine gesunde Haarpflege. Die Bürste kann auf nassem Haar, trockenen Locken sowie bei Haarverlängerungen und Perücken verwendet werden. Mit 325 zweistufigen, flexiblen Borsten gleitet sie mühelos durch das Haar, reduziert Haarbruch und hilft dabei, Knoten sanft zu entwirren. Gleichzeitig ist sie schonend zur Kopfhaut, kann die Durchblutung anregen und Irritationen minimieren. Dadurch eignet sie sich auch gut für empfindliche Kopfhaut. Die Bürste ist ein praktischer Bestandteil der täglichen Haarpflege-Routine und sorgt für glatteres und glänzenderes Haar.', 1),
(10, 8, 'HMIYA Weite Hosen Damen', 'Leichte Damen-Stoffhose mit hoher Taille, weitem Bein und Taschen für Alltag und Freizeit.', 29.99, 'images/produkte/hmiya-weite-hosen-damen.jpg', '2026-03-17 19:39:02', '2026-03-18 20:11:04', 'Die HMIYA weite Damenhose ist eine lässige und leichte Stoffhose mit hoher Taille und praktischen Taschen. Sie eignet sich ideal für Freizeit, Alltag sowie für die Übergangszeiten im Frühling und Herbst. Das Material aus Polyester ist pflegeleicht, knitterarm und angenehm zu tragen. Die Hose ist sauber verarbeitet, bleibt auch nach mehreren Wäschen gut in Form und überzeugt durch Strapazierfähigkeit sowie Atmungsaktivität. Durch den lockeren Schnitt und den schönen Fall bietet sie ein modisches und zugleich komfortables Tragegefühl.', 1);

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

--
-- Daten für Tabelle `benutzer`
--

INSERT INTO `benutzer` (`id`, `vorname`, `nachname`, `email`, `passwort_hash`, `rolle`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(1, 'Lea', 'Seiler', 'lea@1', '$2b$10$LzOZ5jVZ/if3dTa9YT0Fk.SE5hURCuZWR1NJl6U8VH/Jj0oSNOSG2', 'kunde', '2026-03-29 14:49:19', '2026-03-29 14:49:19'),
(4, 'Admin', 'Demo', 'admin@test.de', '$2b$12$W2IKRxkWZLYzdxp9dn2QzurFzxB1RgzxALQobSD1I9gUWDHHZ2ucG', 'admin', '2026-03-29 12:40:25', '2026-04-05 11:57:33'),
(6, 'Lea', 'Seiler', 'leas2000@gmx.de', '$2b$10$U/hWvHAA2Cs1moksBpmsWOv1HMDZumxCMfZ2.WQY5nIvLGnZVXzCK', 'kunde', '2026-04-05 20:41:37', '2026-04-05 20:41:37'),
(7, 'Yuliia', 'Shostak', 'iushostak7@gmail.com', '$2b$10$c7RBr1KAihELS9L6gv8J7OIqVBQKAFViapuOUdoSwOSLMyJD4oxWm', 'kunde', '2026-04-07 17:17:42', '2026-04-07 17:17:42');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `bestellposition`
--

INSERT INTO `bestellposition` (`id`, `bestellung_id`, `artikel_id`, `anzahl`, `einzelpreis`, `gesamtpreis`, `erstellungszeitpunkt`) VALUES
(1, 1, 2, 8, 99.99, 799.92, '2026-04-05 20:42:30');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `bestellung`
--

INSERT INTO `bestellung` (`id`, `benutzer_id`, `lieferadresse_id`, `gesamtpreis`, `zahlungsmethode`, `zahlungsstatus`, `bestellstatus`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(1, 6, 2, 799.92, 'paypal', 'bezahlt', 'bestaetigt', '2026-04-05 20:42:30', '2026-04-07 16:41:15');

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

--
-- Daten für Tabelle `kategorie`
--

INSERT INTO `kategorie` (`id`, `bezeichnung`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(1, 'Bücher', '2026-03-17 19:39:02', '2026-03-17 19:39:02'),
(2, 'Kosmetik', '2026-03-17 19:39:02', '2026-03-17 19:39:02'),
(3, 'Technik', '2026-03-17 19:39:02', '2026-03-17 19:39:02'),
(4, 'Haushalt', '2026-03-17 19:39:02', '2026-03-17 19:39:02'),
(5, 'Sport', '2026-03-17 19:39:02', '2026-03-17 19:39:02'),
(6, 'Spielwaren', '2026-03-18 19:27:32', '2026-03-18 19:27:32'),
(7, 'Haarpflege', '2026-03-18 19:58:59', '2026-03-18 19:58:59'),
(8, 'Kleidung', '2026-03-18 20:01:28', '2026-03-18 20:01:28');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `lagerbestand`
--

CREATE TABLE `lagerbestand` (
  `id` int(11) NOT NULL,
  `artikel_id` int(11) NOT NULL,
  `anzahl` int(11) NOT NULL,
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `lagerbestand`
--

INSERT INTO `lagerbestand` (`id`, `artikel_id`, `anzahl`, `aenderungszeitpunkt`) VALUES
(1, 1, 10, '2026-03-17 19:39:02'),
(2, 2, 500, '2026-04-07 16:51:19'),
(3, 3, 25, '2026-03-17 19:39:02'),
(4, 4, 15, '2026-03-17 19:39:02'),
(5, 5, 12, '2026-03-17 19:39:02'),
(6, 6, 9, '2026-03-17 19:39:02'),
(7, 7, 30, '2026-03-17 19:39:02'),
(8, 8, 7, '2026-03-17 19:39:02'),
(9, 9, 20, '2026-03-17 19:39:02'),
(10, 10, 18, '2026-03-17 19:39:02');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `warenkorb`
--

CREATE TABLE `warenkorb` (
  `id` int(11) NOT NULL,
  `benutzer_id` int(11) NOT NULL,
  `gesamtpreis` decimal(10,2) NOT NULL DEFAULT 0.00,
  `erstellungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp(),
  `aenderungszeitpunkt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `warenkorb`
--

INSERT INTO `warenkorb` (`id`, `benutzer_id`, `gesamtpreis`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(1, 1, 0.00, '2026-03-30 16:47:38', '2026-03-30 17:02:22'),
(2, 6, 0.00, '2026-04-05 20:41:51', '2026-04-07 16:41:25'),
(3, 4, 179.89, '2026-04-07 16:51:40', '2026-04-07 17:05:31');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Daten für Tabelle `warenkorb_position`
--

INSERT INTO `warenkorb_position` (`id`, `warenkorb_id`, `artikel_id`, `anzahl`, `einzelpreis`, `gesamtpreis`, `erstellungszeitpunkt`, `aenderungszeitpunkt`) VALUES
(2, 3, 10, 1, 29.99, 29.99, '2026-04-07 16:51:40', '2026-04-07 16:51:40'),
(3, 3, 1, 10, 14.99, 149.90, '2026-04-07 16:51:47', '2026-04-07 16:52:12');

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
-- Indizes für die Tabelle `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT für Tabelle `artikel`
--
ALTER TABLE `artikel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT für Tabelle `aufgabe`
--
ALTER TABLE `aufgabe`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT für Tabelle `benutzer`
--
ALTER TABLE `benutzer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT für Tabelle `bestellposition`
--
ALTER TABLE `bestellposition`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT für Tabelle `bestellung`
--
ALTER TABLE `bestellung`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT für Tabelle `kategorie`
--
ALTER TABLE `kategorie`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT für Tabelle `lagerbestand`
--
ALTER TABLE `lagerbestand`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT für Tabelle `warenkorb`
--
ALTER TABLE `warenkorb`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT für Tabelle `warenkorb_position`
--
ALTER TABLE `warenkorb_position`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT für Tabelle `worker`
--
ALTER TABLE `worker`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

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

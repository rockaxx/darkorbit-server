# DarkOrbit 10 na tomto pocitaci

Dvojklik na `Start-DarkOrbit.cmd` spusti databazu, herny server, web a samostatne okno hry. Klient automaticky prihlasi vytvoreny testovaci ucet. `Stop-DarkOrbit.cmd` zostavu zastavi. Skripty nemenia systemovu politiku PowerShellu ani neinstaluju Windows sluzby.

Web: http://127.0.0.1/ . Prihlasovacie udaje su v `.local/credentials.json` (polozky `username` a `password`). Toto je lokalny testovaci server. Flash klient je pribaleny v samostatnom okne, bezny moderny prehliadac staci na webovy hangar a login.

Testovaci aj novy ucet ma Goliath, MMO, premium, 1 miliardu uridia aj kreditov, 50 LF-4, 60 BO2, 20 rychlostnych generatorov, 8 Iris + Apis + Zeus, 10 Havoc a 10 Hercules, PET, odomknute podporovane lode a ich dizajny a maximalne pilotne schopnosti. Obe konfiguracie su vybavene: prva kombinuje stity a rychlost s Havoc, druha ma rychlost a Hercules. Municia sa v povodnom emulatore neodpocitava; platia iba casove odstupy strelby a schopnosti. Formacie a implementovane techniky su dostupne bez nakupu.

Grafika je napevno 2D. Prepinac 3D je odstraneny a API ho nemoze zapnut. `scripts/starter-profile.php` definuje vychodzi profil. `scripts/seed-starter.php` nastavi databazove defaulty pre nove ucty a resetuje testovaci ucet; pri beznom starte sa nespusta. PET ma rezimy, ktore podporuje povodny emulator (pasivny a ochranny).

## Lokalne komponenty

| Komponent | Adresa / umiestnenie |
| --- | --- |
| Web PHP 7.4.33 | 127.0.0.1:80 |
| MariaDB 10.11.16 | 127.0.0.1:3307, databaza `darkorbit_local` |
| DarkOrbit 10 emulator | 127.0.0.1:8080 |
| Chat | 127.0.0.1:9338 |
| CMS socket | 127.0.0.1:4301 |
| Klient | Electron 11.5.0 + Pepper Flash 32.0.0.344 |
| Logy a snimky klienta | `.local/logs/` |
| Databazove subory | `.local/db/` |

Adresar `.local` obsahuje stiahnute komponenty, databazu, session a hesla a je v `.gitignore`. Neodstranovat, ak chces zachovat tuto zostavu. Prenos repozitara bez `.local` neprenasa nainstalovany server.

## Povolene lokalne upravy

CMS v `.local/cms`: databaza na porte 3307, pevna lokalna URL, automaticke overenie testovacich uctov a vypnute odosielanie e-mailov. PHP router chrani konfiguraciu, SQL dump a `.git` pred HTTP pristupom. Klient nacitava iba lokalny web a ma vypnutu Node integraciu v strankach.

MariaDB ma `old_mode=UTF8_IS_UTF8MB3,NO_NULL_COLLATION_IDS`; vsetky tabulky boli konvertovane na `utf8mb4_bin`, aby fungoval pribaleny starsi MySQL .NET ovladac. C# cita `DO_DB_USER`, `DO_DB_PASSWORD`, `DO_DB_NAME`, `DO_DB_PORT` a `DO_BIND_ADDRESS` z prostredia. Start ich nastavi automaticky. EOF konzoly uz neukonci proces bez okna.

## Overenie a build

Pri zatvorenom okne hry:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1 -NoClient
node scripts/verify.js
.local/php/php.exe scripts/verify-defaults.php
```

Test overi chranene subory, nespravne heslo, spravny webovy login, neplatnu hernu session, vynutene 2D, inicializaciu lode aj PET cez skutocny binarny protokol a dostupnost SWF. Druhy test vlozi novy ucet a vybavu s vychodzimi hodnotami a transakciu vrati spat. Prihlasovaci test rotuje session, preto ho nespustaj pocas hrania.

Po zmene C# zastav zostavu a spusti:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

Build pouziva lokalne Visual Studio/Roslyn a DLL z `DarkOrbit 10.0/bin/Debug`. Povodny projekt ma neplatne historicke NuGet cesty; tento skript ich obchadza bez stahovania dalsich balikov.

## Zdroje

- CMS, SQL a herne SWF: https://github.com/yusufsahinhamza/darkorbit-cms (commit `a9397ef7929fafda4c7792e680c70e9445a5fcf1`).
- MariaDB ZIP: https://archive.mariadb.org/mariadb-10.11.16/winx64-packages/mariadb-10.11.16-winx64.zip
- PHP ZIP: https://downloads.php.net/~windows/releases/archives/php-7.4.33-nts-Win32-vc15-x64.zip
- Electron: https://github.com/electron/electron/releases/tag/v11.5.0
- Flash plugin zo zostavy klienta: https://github.com/kaiserdj/Darkorbit-client
- Kompatibilita MySQL ovladaca: https://mariadb.com/docs/server/server-management/variables-and-modes/old_mode

Zostava pouziva povodny historicky emulator; overeny je lokalny start, login a nacitanie mapy, nie vsetky herne eventy a mechaniky.

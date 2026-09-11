# DarkOrbit 10 na tomto pocitaci

## Web UI

The redesigned CMS templates and shared theme live in `web/cms`. `scripts/start.ps1` applies them automatically to `.local/cms`. To update an already running website, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/apply-web-ui.ps1`, then refresh the browser. Original overwritten files are saved once in `.local/ui-originals`; database and credentials are unaffected.

The theme covers login/registration, pilot overview, fleet, equipment page, shop, skills, clan pages and settings. Fleet artwork resolves corporation-specific support ships and the Pusat/Razer filename aliases from the installed CMS assets. The equipment editor itself continues to use the Windows client's bundled Flash runtime; modern browsers show a client download link.

Browser verification requires Node.js 22.12 or newer (Puppeteer); the game gateway retains its existing Node.js requirement.

Verification: `.local/php/php.exe test/ship-art.test.php` checks ship artwork. `npm run verify:ui` uses Chrome (`CHROME_PATH` can override its executable) and a temporary account to test registration, login, ship selection, shop dialog, images, desktop/mobile layouts and navigation. The temporary pilot is deleted afterward. Screenshots are written to `.local/logs/ui-*.png`. Install dependencies with `npm install` first.

Dvojklik na `Start-DarkOrbit.cmd` spusti databazu, herny server, web a samostatne okno hry. Klient automaticky prihlasi vytvoreny testovaci ucet. `Stop-DarkOrbit.cmd` zostavu zastavi. Skripty nemenia systemovu politiku PowerShellu ani neinstaluju Windows sluzby.

Web: http://127.0.0.1/ . Prihlasovacie udaje su v `.local/credentials.json` (polozky `username` a `password`). Toto je lokalny testovaci server. Flash klient je pribaleny v samostatnom okne, bezny moderny prehliadac staci na webovy hangar a login.

Testovaci aj novy ucet ma Goliath, MMO, premium, 1 miliardu uridia aj kreditov, 50 LF-4, 60 BO2, 20 rychlostnych generatorov, 8 Iris + Apis + Zeus, 10 Havoc a 10 Hercules, PET, odomknute podporovane lode a ich dizajny a maximalne pilotne schopnosti. LF-4, BO2, Iris, Apis a Zeus su level 16; permanentne boostre davaju +25 % damage, +25 % shield a +20 % HP. Obe konfiguracie su vybavene: prva kombinuje stity a rychlost s Havoc, druha ma rychlost a Hercules. Municia sa v povodnom emulatore neodpocitava; platia iba casove odstupy strelby a schopnosti. Formacie a implementovane techniky su dostupne bez nakupu.

Na hernej mape je vpravo hore `1v1 Arena`. Zadaj presny nick online hraca; superovi pride pozvanka s tlacidlami Prijat/Odmietnut. Po prijati hra vyberie volnu izolovanu arena mapu, spusti 25-sekundovu ochranu a po skonceni vrati pripojenych hracov na povodne miesto s plnym HP a stitmi. Pozvanka vyprsi po 60 sekundach.

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

## Verejne hranie cez bezplatny tunnel

Na docasne hranie s ostatnymi spusti `Start-DarkOrbit-Tunnel.cmd`. Skript spusti lokálnu zostavu, gateway a Cloudflare Quick Tunnel, potom vypíše odkaz v tvare `https://....trycloudflare.com`. Odkaz otvorí web klienta a podporuje aj herný/chatový WebSocket cez rovnakú adresu. Cloudflare Quick Tunnel je určený na testovanie, URL sa po reštarte zmení a služba nemá garantovanú dostupnosť.

Chýbajúci `cloudflared` skript automaticky stiahne do `.local`. Tunnel zastaví `Stop-DarkOrbit-Tunnel.cmd`; lokálny server sa zastavuje samostatne cez `Stop-DarkOrbit.cmd`. Verejný odkaz sa uloží aj do `.local/public-url.txt` a logy sú v `.local/logs/tunnel.err.log`.

Pri štarte tunnelu sa vytvorí Windows ZIP na `/downloads/DarkOrbit-Client.zip`. Tlačidlo na domovskej stránke po prihlásení používa čas zostavenia v URL, aby hráč dostal aktuálny balík. ZIP obsahuje Electron, Pepper Flash, dve samostatné karty Domov/Hra a tlačidlo Hangár. Prepnutie karty zachová bežiacu mapu. Hráč balík rozbalí a spustí `Start-Client.cmd`.

Staré SWF vytvárajú HTTP adresy napevno. `scripts/client-transport.js` preto poskytuje klientovi loopback web na `127.0.0.2:80`, herný most na portoch 8080/9338 a socket policy na 843. HTTP, API a binárne súbory prenáša cez verejný HTTPS tunnel, herné spojenia cez WSS. Adresa `.2` umožňuje hrať aj na počítači, kde server počúva na `.1`. Používateľské dáta a log sú v `%APPDATA%/DarkOrbit-Tunnel-Client`. Naraz spúšťaj jednu kópiu tohto klienta.

Ak lokálna služba `PEMHTTPD-x64` drží Flash port 8080, launcher si vyžiada Windows administrátorské oprávnenie, službu zastaví iba počas behu klienta a po zatvorení ju znovu spustí.

Pri oprave hangára boli opravené XML deklarácie v lokálnom CMS: `flashinput/translationEquipment.php`, `flashinput/translationGalaxygates.php` a `swf_global/flashinput/getMainNavRes.php`. PHP ich musí vypísať ako XML, nie interpretovať `<?xml` ako krátky PHP otvárací tag.

Overenie prenosu pri zatvorenom klientovi: `node --test test/client-transport.test.js`. Na diagnostiku Flashu možno výslovne spustiť klienta s `--remote-debugging-port=9223` a použiť `test/flash-client-diagnostic.js`; bežný launcher tento port nezapína.

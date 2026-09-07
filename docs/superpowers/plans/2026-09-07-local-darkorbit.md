# Local DarkOrbit 10 setup

Goal: Run the existing emulator and matching author CMS locally with a random test account.
Architecture: Portable MariaDB and PHP under ignored .local, existing C# emulator compiled using installed Roslyn. All listeners bind loopback. Existing CMS schema and game client assets are preferred over reconstruction.

- Inspect matching CMS schema, login flow, and client availability.
- Install portable dependencies and import into a fresh dedicated database.
- Configure loopback endpoints, build emulator, create random test account through the CMS flow.
- Add start/stop scripts and local setup documentation.
- Verify web login, database state, TCP listeners and game protocol login. Clearly record any missing client assets.

No publication, remote account creation or machine-wide services. Keep credentials and downloaded dependencies out of git.

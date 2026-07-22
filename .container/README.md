# Techmedia container deployment

Run `bash install.sh` from the Techmedia repository after cloning `framework`, `ui`, and `core`
beside it. Images build directly from source; no registry login is needed.

The standalone application stack owns API host port `18050`, Web port `18060`, and its own named
storage volume. It uses the single shared `codexsun-mariadb`, `codexsun-redis`, and
`codexsun-media` infrastructure containers. The module-owned tenant seeder creates Techmedia's
default tenant for `app.techmedia.in` and provisions its isolated tenant database.

All application services join the shared `codexsun-network`; only Web is exposed through Traefik.
Persistent application storage remains in the `techmedia-platform-data` volume.

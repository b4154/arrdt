# ArrDT
A WIP tool for Sonarr that scrapes torrents from torrentio, checks for availability on RealDebrid, scores them using Sonarr's torrent parsing API (Custom Formats are supported), maps them to Sonarr episodes using IMDB and TVDB IDs, then adds to RealDebrid and create symlinks. Supports multi-season torrents as it bypasses Sonarr's fetching logic.

This was primarily made for my specific use case so there are a couple things to note.
1. If it finds all the episodes for a series, it will replace anything that's already there
2. It will not add content unless the entire series is available on RD (no missing episodes).
3. Some series may not be able to be fetched as they may be missing on the Cinemeta API, which this tool uses to map IMDB IDs to TVDB IDs.
4. mass_series_search will only search from shows that have ended.

## TODO
* Move to blackhole import
* Wait for symlinks to be available in mount before creating them.
* Turn into a proper CLI
* Series folder mapping in the case the sonarr series path isn't the same where the script is running.
* Create a Docker image

## Getting Started
```
git clone https://github.com/b4154/arrdt
cd arrdt
pnpm install or npm install
mv config.example.yaml config.yaml
```

Once you add the relevant info to the config, you can then run these commands.

```
npx tsx series.ts <tvdb_id> [--no-cache]
npx tsx mass_series_search.ts [--no-cache]
```
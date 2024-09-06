# ArrDT
A WIP tool for Sonarr that scrapes torrents from torrentio, checks for availability on RealDebrid, scores them using Sonarr's torrent parsing API (Custom Formats are supported), maps them to Sonarr episodes using IMDB and TVDB IDs, then adds to RealDebrid and create symlinks. Supports multi-season torrents as it bypasses Sonarr's fetching logic.

This was primarily made for my specific use case so there are a couple things to note.
1. If it finds all the episodes for a series, it will replace anything that's already there
2. It will not add content unless the entire series is available on RD (no missing episodes).
3. Some series may not be able to be fetched as they may be missing on the Cinemeta API, which this tool uses to map IMDB IDs to TVDB IDs.

TODO:
* Move to torrents to blackhole import
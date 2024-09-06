import * as path from "path";
import { getSeriesMeta } from "../apis/cinemeta";
import * as RD from "../apis/realdebrid";
import { command, getEpisodes, getSeries, parseTitle } from "../apis/sonarr";
import { getTorrent } from "../apis/torrentio";
import { toMagnetURI, toTorrentFile } from 'parse-torrent'
import { promises as fsPromise, existsSync } from 'fs';
import { validTorrentName } from "../utils/sonarr";
import { getSeriesTorrents } from "../utils/torrentio";
import config from "../utils/config";

const mount_path = config.remote_mount_path;

export default async function series (id, no_cache = false) {
	
	let tvdb_id = parseInt(id);
	//Get series from sonarr
	let series = (await getSeries(tvdb_id))[0];
	if (!series) throw new Error('Series not found')
	console.log(`Found series "${series.title}"`)
	//Get episode list from sonarr
	let episodes = await getEpisodes(series.id)
	// console.log('episodes', episodes)

	//Fetch series meta from stremio cinemeta.
	let seriesMeta = await getSeriesMeta(series.imdbId).catch(() => {});
	if (!seriesMeta) return;

	//Array of torrents (already checked for availability)
	let torrents = await getSeriesTorrents(series, seriesMeta, episodes, no_cache);

	torrents = (await Promise.all(torrents.map(async (torrent) => {
		(torrent as any).queriedTitle = validTorrentName(series.title, series.alternateTitles.map((alias) => alias.title), torrent.title);
		let parsed = await parseTitle(validTorrentName(series.title, series.alternateTitles.map((alias) => alias.title), torrent.title));
		if (parsed.series == undefined) return null;
		return {...torrent, score: parsed.customFormatScore * torrent.files.length}
	}))).filter((torrent) => torrent !== null)

	//Sort highest score
	torrents = torrents.filter((torrent) => torrent.score >= 5).sort((a, b) => b.score - a.score)
	
	console.log(torrents);

	let episodeTorrents = episodes.map((episode) => {
		let file = torrents
			.flatMap((torrent) => 
				torrent.files?.map(file => ({ infoHash: torrent.infoHash, ...file })) || []
			).find((file) => file.episode === episode.episodeNumber && file.season === episode.seasonNumber);

		return file;
	}).filter((file) => file !== undefined)

	const insertBatches = Object.groupBy(episodeTorrents, ({ infoHash }) => infoHash);

	let symlinks: { [destination: string]: string } = {};
	//Add torrents to RealDebrid
	for (let [infoHash, files] of Object.entries(insertBatches)) {
		console.log(`Inserting ${infoHash} into RD`);
		let magnet = toMagnetURI({ infoHash: infoHash });
		let magnetInsert = await RD.addMagnet(magnet);
		let torrent = await RD.getTorrent(magnetInsert.id)

		let selectedFiles = torrents.find((torrent) => torrent.infoHash === infoHash).files.map((file) => (file.idx + 1).toString());
		await RD.selectFiles(torrent.id, selectedFiles);

		torrent = await RD.getTorrent(torrent.id)

		// console.log(torrent, selectedFiles)

		for (let file of files) {
			let fileId = (file.idx + 1).toString();

			if (!selectedFiles.includes(fileId)) continue;

			let fileInfo = torrent.files.find((f) => f.id.toString() === fileId);
			
			symlinks[path.join(series.path, `${series.cleanTitle} - S${file.season}E${file.episode}${path.extname(fileInfo.path)}`)] = path.join(mount_path, torrent.filename, path.basename(fileInfo.path));
		}
	}

	console.log(symlinks)
	if (Object.entries(symlinks).length <= 0) throw new Error('No content found')

	if (existsSync(series.path)) await fsPromise.rm(series.path, { recursive: true });
	await fsPromise.mkdir(series.path);

	for (let [destination, source] of Object.entries(symlinks)) {
		console.log(`Creating symlink ${destination} -> ${source}`)
		await fsPromise.symlink(source, destination, 'file');
	}

	await command({ name:"RefreshSeries", seriesId: series.id })

	console.log('Finished!')

}
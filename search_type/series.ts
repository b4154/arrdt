import * as path from "path";
import { getSeriesMeta } from "../apis/cinemeta/index.ts";
import * as RD from "../apis/realdebrid/index.ts";
import { command, getEpisodes, getSeries, parseTitle } from "../apis/sonarr/index.ts";
import { toMagnetURI, toTorrentFile } from "parse-torrent";
import { promises as fsPromise, existsSync } from "fs";
import { validTorrentName } from "../utils/sonarr.ts";
import { getSeriesTorrents } from "../utils/torrent_search.ts";
import config from "../utils/config.ts";
import { waitForFile } from "../utils/fs.ts";

const mount_path = config.remote_mount_path;

export default async function series(id, no_cache = false) {
	let tvdb_id = parseInt(id);
	//Get series from sonarr
	let series = (await getSeries(tvdb_id))[0];
	if (!series) throw new Error("Series not found");
	console.log(`Found series "${series.title}"`);
	//Get episode list from sonarr
	let episodes = await getEpisodes(series.id);

	//Fetch series meta from stremio cinemeta.
	let seriesMeta = await getSeriesMeta(series.imdbId).catch(() => {});
	if (!seriesMeta) return;

	//Array of torrents (already checked for availability)
	let torrents = await getSeriesTorrents(
		series,
		seriesMeta,
		episodes,
		no_cache
	);

	torrents = (
		await Promise.all(
			torrents.map(async (torrent) => {
				let queriedTitle = validTorrentName(series, torrent.title);
				let parsed = await parseTitle(queriedTitle);
				console.log(queriedTitle, parsed);
				if (parsed.series == undefined || parsed.series.id !== series.id) return null;
				return {
					...torrent,
					score: parsed.customFormatScore * torrent.files.length,
				};
			})
		)
	).filter((torrent) => torrent !== null);

	//Sort highest score
	torrents = torrents
		.filter((torrent) => torrent.score >= 5)
		.sort((a, b) => b.score - a.score);

	console.log(torrents);

	let episodeTorrents = episodes
		.map((episode) => {
			if (episode.title === "TBA") return;
			let file = torrents
				.flatMap(
					(torrent) =>
						torrent.files?.map((file) => ({
							infoHash: torrent.infoHash,
							score: torrent.score,
							...file,
						})) || []
				)
				.sort((a, b) => b.score - a.score)
				.find(
					(file) =>
						file.episode === episode.episodeNumber &&
						file.season === episode.seasonNumber
				);

			return file;
		})
		.filter((file) => file !== undefined);

	const insertBatches = Object.groupBy(
		episodeTorrents,
		({ infoHash }) => infoHash
	);

	let symlinks: { [destination: string]: string } = {};
	//Add torrents to RealDebrid
	for (let [infoHash, files] of Object.entries(insertBatches)) {
		console.log(`Inserting ${infoHash} into RD`);
		let magnet = toMagnetURI({ infoHash: infoHash });
		let magnetInsert = await RD.addMagnet(magnet);
		let torrent = await RD.getTorrent(magnetInsert.id);

		let selectedFiles = torrents
			.find((torrent) => torrent.infoHash === infoHash)
			.files.map((file) => (file.idx + 1).toString());
		await RD.selectFiles(torrent.id, selectedFiles);

		torrent = await RD.getTorrent(torrent.id);

		for (let file of files) {
			let fileId = (file.idx + 1).toString();

			if (!selectedFiles.includes(fileId)) continue;

			let fileInfo = torrent.files.find(
				(f) => f.id.toString() === fileId
			);

			symlinks[path.join(series.path, `${series.cleanTitle} - S${file.season}E${file.episode} [${infoHash}]${path.extname(fileInfo.path)}`)] = path.join(mount_path, torrent.filename, path.basename(fileInfo.path));
		}
	}

	if (Object.entries(symlinks).length <= 0)
		throw new Error("No content found");

	if (existsSync(series.path))
		await fsPromise.rm(series.path, { recursive: true });
	await fsPromise.mkdir(series.path);

	console.log(symlinks);

	console.log('Waiting for files...')
	return await Promise.all(
		Object.entries(symlinks).map(([destination, source]) => {
			return waitForFile(source, 1000 * 60 * 4).then(async () => {
				console.log(`Creating symlink ${destination} -> ${source}`);
				await fsPromise.symlink(source, destination, "file");
			});
		})
	).then(async () => {
		await command({ name: "RefreshSeries", seriesId: series.id });
		console.log(`Finished series: ${series.title} (${series.id})`);
		return series.id;
	});
}
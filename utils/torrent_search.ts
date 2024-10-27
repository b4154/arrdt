import { SeriesMeta } from "../apis/cinemeta/index.ts";
import { Episodes, Series } from "../apis/sonarr/index.ts";
import { getTorrent } from "../apis/torrentio/index.ts";
import * as RD from "../apis/realdebrid/index.ts";

export async function getSeriesTorrents (series: Series, seriesMeta: SeriesMeta, episodes: Episodes, no_cache: boolean): Promise<Torrent[]> {
	let torrents: {
		[infoHash: string]: Torrent
	} = {};

	for (let episode of episodes) {
		if (episode.monitored === false  || episode.title === "TBA") continue;

		console.log(`Finding torrents for S${episode.seasonNumber}E${episode.episodeNumber}`)

		let episodeMeta = seriesMeta.meta.videos.find((v) => v.tvdb_id == episode.tvdbId) || seriesMeta.meta.videos.find((v) => v.season == episode.seasonNumber && v.episode == episode.episodeNumber);

		if (!episodeMeta) {
			episodeMeta = {
				id: `${seriesMeta.meta.imdb_id}:${episode.seasonNumber}:${episode.episodeNumber}`
			}
		}

		if (!episodeMeta) {
			console.log(`WARNING: Episode meta missing... skipping episode`)
			continue;
		}

		let streams = (await getTorrent(episodeMeta.id, no_cache)).streams;

		if (series.ended && streams.length <= 0) throw new Error(`Stream for S${episode.seasonNumber} E${episode.episodeNumber} not found.`)

		for (let stream of streams) {
			// if (!stream?.url) continue;
			// console.log(stream)

			let hash = stream.infoHash;
			let id = stream.fileIdx;

			//Anime OVA's will never not be considered Specials in sonarr. This should prevent false matches.
			if (stream.title.toLowerCase().includes('OVA') && episode.seasonNumber !== 0) continue;

			if (!torrents[hash]) torrents[hash] = {
				title: stream.title.split('\n')[0],
				name: stream.name,
				score: -1,
				infoHash: hash,
				bingeGroup: `${stream?.behaviorHints?.bingeGroup}|${hash}`,
				files: []
			}

			torrents[hash].files.push({
				idx: id,
				filename: stream.title.split('\n')[1],
				episode: episode.episodeNumber,
				season: episode.seasonNumber
			})
		}
	}

	if (Object.keys(torrents).length <= 0) return [];

	let availability = await RD.multiInstantAvailability(...Object.keys(torrents))

	for (let [infoHash, torrent] of Object.entries(torrents)) {
		//Show fileLists with ONLY video files
		let fileLists = availability[infoHash]?.rd ? availability[infoHash].rd
			.filter(
				(fileList) => Object.values(fileList).every((file) => 
					file.filename?.includes('.avi') || file.filename?.includes('.mkv') || file.filename?.includes('.mp4') || file.filename?.includes('.wmv')
				) 
			) 
		: []
		//Get all file ids needed for torrent
		let fileIds = torrent.files.map((file) => (file.idx + 1).toString())
		//Fetch fileList with every file ID within it.
		let filesListIndex = fileLists.map((f) => Object.keys(f)).findIndex((fileList) => fileIds.every((id) => fileList.includes(id)))
		//Delete from torrents object if it doesn't meet this criteria
		if (filesListIndex == -1) delete torrents[infoHash];
	}

	return Object.values(torrents);
}

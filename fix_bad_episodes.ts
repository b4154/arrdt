import { command, deleteEpisodeFile, deleteEpisodesFilesForShow, getEpisodeFile, getEpisodeFiles, getEpisodes, getSeries } from "./apis/sonarr/index.ts";


let series = await getSeries();

let seriesFiltered = series
	// .filter((s) => !s.ended);

for (let series of seriesFiltered) {
	// console.log(series.title, series.id)
	let seriesEpisodes = await getEpisodes(series.id)
	let seriesEpisodeFiles = await getEpisodeFiles(series.id);

	for (let episode of seriesEpisodes) {
		let file = seriesEpisodeFiles.find((file) => file.id === episode.episodeFileId);
		if (!file) continue;

		if (!file.mediaInfo?.audioLanguages || !file.mediaInfo?.subtitles) continue;
		let languages = file.mediaInfo.audioLanguages.split('/');
		let subtitleLanguages = file.mediaInfo.subtitles.split('/');
		if (!(languages.includes('eng') || languages.includes('en')) && !(subtitleLanguages.includes('eng') || languages.includes('en'))) {
			console.log(series.cleanTitle, file.id, languages, subtitleLanguages)
			await deleteEpisodeFile(file.id)
			// await command({ name:"EpisodeSearch", episodeIds:[episode.id] })
		}
	}
}
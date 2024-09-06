import { deleteEpisodesFilesForShow, getSeries } from "./apis/sonarr";

let series = await getSeries();

let seriesFiltered = series.filter((s) => s.ended && s.statistics?.percentOfEpisodes !== 100 && s.statistics?.percentOfEpisodes !== 0);

for (let series of seriesFiltered) {
	console.log(series.title, series.id)
	await deleteEpisodesFilesForShow(series.id)
}
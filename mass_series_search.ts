import { getSeries } from "./apis/sonarr";

import series from "./search_type/series"
import * as fs from 'fs';
import config from "./utils/config";
import path from "path";

let seriesFinished: { [id: string]: number } = {}

const cachePath = path.join(config.cache_dir, 'seriesFinished.json');

if (fs.existsSync(cachePath)) {
	seriesFinished = JSON.parse(fs.readFileSync(cachePath, { encoding: 'utf8', flag: 'r' }))
}

let seriesList = await getSeries();
let seriesFiltered = seriesList.filter((s) => s.ended && s.statistics.percentOfEpisodes !== 100);
seriesFiltered.sort((s1, s2) => s1.statistics.totalEpisodeCount - s2.statistics.totalEpisodeCount)

for (let [index, s] of seriesFiltered.entries()) {
	if (seriesFinished[s.id]) continue;
	try {
		await series(s.tvdbId, process.argv.includes('--no-cache'))
	} catch (e) {
		continue;
	} finally {
		console.log(`Completed (${index + 1}/${seriesFiltered.length})`)
	}

	seriesFinished[s.id] = Date.now();

	fs.writeFileSync(cachePath, JSON.stringify(seriesFinished), { encoding: 'utf8' });
}
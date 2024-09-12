import { getSeries } from "./apis/sonarr";

import series from "./search_type/series"
import * as fs from 'fs';
import config from "./utils/config";
import path from "path";
import { chunks } from "./utils/generic";

let seriesFinished: { [id: string]: number } = {}

const cachePath = path.join(config.cache_dir, 'seriesFinished.json');

if (fs.existsSync(cachePath)) {
	seriesFinished = JSON.parse(fs.readFileSync(cachePath, { encoding: 'utf8', flag: 'r' }))
}

let seriesList = await getSeries();
let seriesFiltered = seriesList.filter((s) => s.ended && s.statistics.percentOfEpisodes !== 100);
seriesFiltered.sort((s1, s2) => s1.statistics.totalEpisodeCount - s2.statistics.totalEpisodeCount)
seriesFiltered = seriesFiltered.filter((s) => !seriesFinished[s.id])

for (let [index, s] of seriesFiltered.entries()) {
	//TODO add batching
	let finished = await Promise.allSettled([series(s.tvdbId, process.argv.includes('--no-cache'))])

	finished.forEach((finished) => {
		if (finished.status == "fulfilled") seriesFinished[finished.value] = Date.now();
	})

	fs.writeFileSync(cachePath, JSON.stringify(seriesFinished), { encoding: 'utf8' });
}
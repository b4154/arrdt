import { getSeries } from "./apis/sonarr";

import series from "./search_type/series"
import * as fs from 'fs';
import config from "./utils/config";
import path from "path";
import { chunks } from "./utils/generic";

// let seriesFinished: { [id: string]: number } = {}

// const cachePath = path.join(config.cache_dir, 'seriesFinished.json');

// if (fs.existsSync(cachePath)) {
// 	seriesFinished = JSON.parse(fs.readFileSync(cachePath, { encoding: 'utf8', flag: 'r' }))
// }

let seriesList = await getSeries();
let seriesFiltered = seriesList.filter((s) => s.statistics && s.statistics.percentOfEpisodes !== 100);
seriesFiltered.sort((s1, s2) => (s2.ratings.value * s2.ratings.votes) - (s1.ratings.value * s1.ratings.votes))
//seriesFiltered = seriesFiltered.filter((s) => !seriesFinished[s.id])

for (let s of seriesFiltered) {
	try {
		await series(s.tvdbId, process.argv.includes('--no-cache'));
		//seriesFinished[s.tvdbId] = Date.now();
	} catch (e) {
		console.error(e)
	}

	//fs.writeFileSync(cachePath, JSON.stringify(seriesFinished), { encoding: 'utf8' });
}
import rateLimit from 'axios-rate-limit';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as fs from 'node:fs';
import config from '../../utils/config';
import path from 'node:path';

fs.mkdir(path.join(config.cache_dir, 'torrentio'), { recursive: true }, (err) => {
	if (err) throw err;
});

const client = rateLimit(axios.create({
	baseURL: 'https://torrentio.strem.fun',
}), { maxRequests: 1, perMilliseconds: 2000 })

axiosRetry(client, {
	retries: Infinity,
	// shouldResetTimeout: true,
	retryDelay: (retryCount) => {
		console.log('Retry delay 15s')
		return 15000;
	},
	retryCondition: (error) => {
		console.log(error.response?.data)
		// Only retry if the API call recieves an error code of 429
		// this logic can be replaced with whatever approach is necessary for your connector
		return error.response!.status === 429
	}
})

export async function getTorrent (imdb_id: string, no_cache: boolean): Promise<{ streams: {
	name: string;
	title: string;
	infoHash: string;
	fileIdx: number;
	behaviorHints: {
		bingeGroup: string;
	}
}[] }> {

	const cachePath = path.join(config.cache_dir, `torrentio/${imdb_id}.json`);

	if (fs.existsSync(cachePath) && !no_cache) return JSON.parse(fs.readFileSync(cachePath, { encoding: 'utf8', flag: 'r' }))
	
	let req = await client.get(`/stream/series/${imdb_id}.json`);

	fs.writeFileSync(cachePath, JSON.stringify(req.data), { encoding: 'utf8' });

	return req.data;
}
import axios from "axios";

const metaClient = axios.create({
	baseURL: 'https://v3-cinemeta.strem.io/meta'
})

export type SeriesMeta = {
	meta: {
		releaseInfo: string;
		videos : {
			id: string;
			season: number;
			episode: number;
			tvdb_id: number;
		}[]
	}
}

export async function getSeriesMeta (imdb_id: string): Promise<SeriesMeta>  {
	return (await metaClient.get(`/series/${imdb_id}.json`)).data
}
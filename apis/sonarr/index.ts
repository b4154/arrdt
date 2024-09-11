import axios from "axios";
import config from '../../utils/config';

const client = axios.create({
	baseURL: config.sonarr.endpoint,
	headers: {
		'X-Api-Key': config.sonarr.api_key
	}
})

export type Series = {
	id: number;
	title: string;
	sortTitle: string;
	cleanTitle: string;
	imdbId: string;
	tvdbId: string;
	path: string;
	ended: boolean;
	year: number;
	statistics: {
		percentOfEpisodes: number;
		totalEpisodeCount: number;
	}
	alternateTitles: {
		title: string
		seasonNumber: number
		sceneSeasonNumber: number
		sceneOrigin: string
		comment: string	
	}[]
};

export async function getSeries (tvdbId?: number): Promise<Series[]> {
	return (await client.get('/api/v3/series', { params: { tvdbId } })).data;
}

export type Episodes = {
	id: number;
	tvdbId: number;
	monitored: boolean;
	seasonNumber: number;
	episodeNumber: number;
	episodeFileId: number
}[]

export async function getEpisodes (seriesId?: number): Promise<Episodes> {
	return (await client.get('/api/v3/episode', { params: { seriesId } })).data;
}

export async function getEpisodeFiles (seriesId?: number): Promise<{
	id: number;
	mediaInfo: {
		audioLanguages: string;
		subtitles: string;
	}
}[]> {
	return (await client.get('/api/v3/episodeFile', { params: { seriesId } })).data;
}

export async function getEpisodeFile (fileId?: number): Promise<{
	id: number;
	mediaInfo: {
		audioLanguages: string;
		subtitles: string;
	}
}> {
	if (!fileId) return;
	return (await client.get('/api/v3/episodeFile', { params: { episodeFileIds: fileId } })).data?.[0];
}

export async function deleteEpisodesFilesForShow (seriesId: number) {
	let episodeFiles = (await client.get('/api/v3/episodefile', { params: { seriesId } })).data.map((e) => e.id);
	if (episodeFiles.length <= 0) return;
	(await client.delete('/api/v3/episodefile/bulk', { 
		data: { 
			episodeFileIds: episodeFiles
		} 
	}));
}

export async function deleteEpisodeFile (fileId: number) {
	(await client.delete(`/api/v3/episodefile/${fileId}`, { 
		params: {
			episodeEntity: 'episodes'
		}
	}));
}

export async function command (command) {
	(await client.post('/api/v3/command', command));
}

export async function parseTitle (title): Promise<{ customFormatScore: number, series: any }> {
	return (await client.get('/api/v3/parse', { params: { title }})).data
}
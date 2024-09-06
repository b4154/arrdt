import axios from "axios";
import rateLimit from 'axios-rate-limit';
import _ from 'lodash';
import config from '../../utils/config';

const client = axios.create({
	baseURL: 'https://api.real-debrid.com/rest/1.0/',
	headers: {
		Authorization: `Bearer ${config.realdebrid.api_key}`
	}
})

export async function addMagnet (magnet: string): Promise<{ id: string, uri: string }> {
	var bodyFormData = new FormData();
	bodyFormData.append('magnet', magnet)
	return (await client.post('/torrents/addMagnet', bodyFormData, {
		headers: {
			"Content-Type": "multipart/form-data"
		}
	})).data
}

export async function getTorrent (id: string): Promise<{ 
	id: string;
	filename: string;
	original_filename: string;
	hash: string;
	files: {
		id: number
		path: string;
		selected: boolean;
	}[]
}> {
	return (await client.get(`/torrents/info/${id}`)).data
}

export async function instantAvailability (hash: string): Promise<{
	[file_id: string]: {
		filename: string;
		filesize: number;
	}
}[]> {
	return (await client.get(`/torrents/instantAvailability/${hash}`)).data?.[hash]?.rd;
}

export async function multiInstantAvailability (...hash: string[]): Promise<{
	[hash: string]: {
		rd: {
			[file_id: string]: {
				filename: string;
				filesize: number;
			}
		}[]
	}
}> {

	let outputs = []
	let chunks = _.chunk(hash, 100)

	for (let chunk of chunks) {
		outputs.push((await client.get(`/torrents/instantAvailability/${chunk.join('/')}`)).data)
	}

	const output = {};

	return _.merge(output, ...outputs);
}


export async function selectFiles (id: string, files: string[]) {
	var bodyFormData = new FormData();
	bodyFormData.append('files', files.join(','))
	return (await client.post(`/torrents/selectFiles/${id}`, bodyFormData))
}
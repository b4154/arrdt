import axios from "axios";
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';
import _ from 'lodash';
import config from '../../../utils/config.ts';
import { toMagnetURI, toTorrentFile } from "parse-torrent";

const client = rateLimit(axios.create({
	baseURL: 'https://api.real-debrid.com/rest/1.0/',
	headers: {
		Authorization: `Bearer ${config.realdebrid.api_key}`
	}
}), { maxRequests: 250, perMilliseconds: 60000 })

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
	status: 'magnet_error' | 'downloaded' | 'waiting_files_selection'
	files: {
		id: number
		path: string;
		selected: boolean;
	}[]
}> {
	let torrent = (await client.get(`/torrents/info/${id}`)).data;
	torrent.files = torrent.files.map((file) => ({...file, id: file.id - 1}))
	return torrent;
}

export const VIDEO_EXTENSIONS = [
    "mp4", "mkv", "avi", "mov", "wmv", "flv",
    "m4v", "webm", "mpg","mpeg", "m2ts", "ts",
];

let CACHED_HASHES = [];

export async function instantAvailability (hash: string): Promise<boolean> {
	hash = hash.toLowerCase();

	if (CACHED_HASHES[hash]) return true;

	let magnet = toMagnetURI({ infoHash: hash });

	let addedTorrent = await addMagnet(magnet);

	let torrent = await getTorrent(addedTorrent.id);

	let files = torrent.files.filter((file) => VIDEO_EXTENSIONS.some((ext) => file.path.includes(ext))).map((file) => file.id)

	await selectFiles(addedTorrent.id, files)

	torrent = await getTorrent(addedTorrent.id);

	if (torrent.status == 'downloaded') {
		CACHED_HASHES[hash] = true;

		await deleteTorrent(torrent.id);
		return true;
	}

	CACHED_HASHES[hash] = false;

	await deleteTorrent(torrent.id)

	return false;
}

export async function deleteTorrent (id: string) {
	return (await client.delete(`/torrents/delete/${id}`))
}

export async function selectFiles (id: string, files: number[]) {
	let selectedFiles = files.map(file => (file + 1).toString());
	var bodyFormData = new FormData();
	bodyFormData.append('files', selectedFiles.join(','))
	return (await client.post(`/torrents/selectFiles/${id}`, bodyFormData))
}
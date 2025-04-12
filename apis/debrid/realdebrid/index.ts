import axios from "axios";
import rateLimit from 'axios-rate-limit';
import _ from 'lodash';
import config from '../../../utils/config.ts';
import { toMagnetURI, toTorrentFile } from "parse-torrent";

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
	status: 'magnet_error' | 'downloaded' | 'waiting_files_selection'
	files: {
		id: number
		path: string;
		selected: boolean;
	}[]
}> {
	let torrent = (await client.get(`/torrents/info/${id}`)).data;
	torrent.files = torrent.files.map((file) => ({...file, id: file.id + 1}))
	return torrent;
}

export const VIDEO_EXTENSIONS = [
    "mp4", "mkv", "avi", "mov", "wmv", "flv",
    "m4v", "webm", "mpg","mpeg", "m2ts", "ts",
];

let CACHED_HASHES = [];

export async function instantAvailability (hash: string): Promise<boolean> {
	let magnet = toMagnetURI({ infoHash: hash });

	let addedTorrent = await addMagnet(magnet);

	let torrent = await getTorrent(addedTorrent.id);

	let files = torrent.files.filter((file) => VIDEO_EXTENSIONS.some((ext) => file.path.includes(ext))).map((file) => file.id)

	await selectFiles(addedTorrent.id, files)

	torrent = await getTorrent(addedTorrent.id);

	if (torrent.status == 'downloaded') {
		CACHED_HASHES[torrent.hash] = true;

		await deleteTorrent(torrent.id);
		return true;
	}

	CACHED_HASHES[torrent.hash] = false;

	await deleteTorrent(torrent.id)

	return false;
}

export async function deleteTorrent (id: string) {
	return (await client.delete(`/torrents/delete/${id}`))
}

export async function selectFiles (id: string, files: number[]) {
	files = files.map(file => file + 1);
	var bodyFormData = new FormData();
	bodyFormData.append('files', files.join(','))
	return (await client.post(`/torrents/selectFiles/${id}`, bodyFormData))
}
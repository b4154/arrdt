type TorrentFile = {
	idx: number
	filename?: string
	episode: number
	season: number
}

type Torrent = {
	name: string
	title: string
	score: number
	infoHash: string
	bingeGroup: string
	files: TorrentFile[]
}

type Stream = {
	fileId: number;
	name: string;
	title: string;
	episodeNumber: number;
	seasonNumber: number;
	bingeGroup: string;
	infoHash: string
}
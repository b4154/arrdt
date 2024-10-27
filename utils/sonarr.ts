import type { Series } from '../apis/sonarr/index.ts';
//Injects "S01" into string where show name is to make it a valid sonarr torrent title
export function validTorrentName (series: Series, torrentTitle: string) {
	torrentTitle = torrentTitle.toLowerCase().replaceAll('.', ' ')
	
	let showNames = [series.title.toLowerCase(), series.cleanTitle.toLowerCase(), series.sortTitle.toLowerCase(), ...series.alternateTitles.map((alias) => alias.title.toLowerCase())]

	if (series.title.includes(':')) showNames.push(series.title.toLowerCase().split(':')[0].trim())

	if (showNames.some((name) => torrentTitle.includes(name))) {	
		let parsedTitle = torrentTitle.matchAll(/(?:\[.*?\]|\(.*?\))|([^\[\]\(\)]+)/gm);
		let titleSegments = [...parsedTitle].map((segment) => segment[0])
		let newTitle = [];
		if (titleSegments[0].startsWith('[')) newTitle.push(titleSegments.shift());

		let episodes = torrentTitle.match(/s(\d+)e(\d+)/);
		let episodesAbsolute = torrentTitle.match(/((?<start>\d{1,4})\s?-\s?(?<end>\d{1,4}))/)

		newTitle.push(
			series.sortTitle, 
			episodes ? episodes[0] : episodesAbsolute ? episodesAbsolute[0] : `S01`, 
			`(${series.year})`, 
			...titleSegments.filter((segment) => segment.startsWith('(') || segment.startsWith('[')), 
			'[RD+]'
		);

		return newTitle.join(' ');
	}

	return `${torrentTitle} [RD+]`;
}
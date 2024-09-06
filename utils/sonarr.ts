//Injects "S01" into string where show name is to make it a valid sonarr torrent title
export function validTorrentName (showName: string, aliases: string[], title: string) {
	showName = showName.toLowerCase()
	let name = title.toLowerCase().replaceAll('.', ' ');

	if (name.match(/(- (?<absolute>\d{1,4}))/)) {
		return "[RD] " + name
	} else {
		name = name.replaceAll(/(s(?<season>\d{1,4}))?(e(?<episode>\d{1,4}))?/g, '').replace(showName, showName + " S01")
	}

	for (let alias of aliases) {
		alias = alias.toLowerCase()
		name = name.replace(alias, alias + " S01")
	}

	return "[RD] " + name
}
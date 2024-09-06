import series from "./search_type/series"

await series(process.argv[2], process.argv.includes('--no-cache'))
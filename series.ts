import series from "./search_type/series.ts"

await series(process.argv[2], process.argv.includes('--no-cache'))
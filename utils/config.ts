import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml'

const configPath = path.join(os.homedir(), 'arrdt', 'config.yaml');

let config = null;

if (fs.existsSync(configPath)) {
	config = YAML.parse(fs.readFileSync(configPath, { encoding: 'utf-8' }))
} else if (fs.existsSync(path.join(process.cwd(), 'config.yaml'))) {
	config = YAML.parse(fs.readFileSync(path.join(process.cwd(), 'config.yaml'), { encoding: 'utf-8' }))
}

if (config?.cache_dir && config.cache_dir.startsWith('~')) {
	config.cache_dir = path.join(os.homedir(), config.cache_dir.slice(1));
}

export default config as {
	cache_dir: string
	remote_mount_path: string;
	realdebrid: {
		api_key: string
	}
	sonarr: {
		endpoint: string
		api_key: string
	}
};
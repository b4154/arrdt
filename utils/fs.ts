import fs from 'fs';

export function waitForFile(filePath, timeout = 5000) {
	return new Promise<void>((resolve, reject) => {
	  const startTime = Date.now();
  
	  const checkFile = () => {
		fs.access(filePath, fs.constants.F_OK, (err) => {
		  if (!err) {
			resolve();
		  } else if (Date.now() - startTime > timeout) {
			reject(new Error(`Timeout waiting for file: ${filePath}`));
		  } else {
			setTimeout(checkFile, 1000); // Check again after 100ms
		  }
		});
	  };
  
	  checkFile();
	});
}
require('dotenv').config()
const fetch = require('node-fetch');
const fs = require('fs');
const shell = require('shelljs');
const StyleDictionary = require('style-dictionary').extend('./config.json');

const getStylesArtboard = require('./lib/get-styles-artboard.js');
const getSpacers = require('./lib/get-spacers.js');
const getBorderRadius = require('./lib/get-border-radius.js');

const headers = new fetch.Headers();

const devToken = process.env.DEV_TOKEN;
const fileKey = process.env.FILE_KEY;
const borderRadiusId = process.env.BORDER_RADIUS
const spacersId = process.env.SPACERS;

const version = process.argv[6];

headers.append('X-Figma-Token', devToken);

let query = {
	url: {
		host: 'api.figma.com',
		protocol: 'https',
	}
}

if (version) {
	query.url = {
		...query.url,
		query: {
			version
		}
	}
}

async function main() {
	console.log('> We start, please wait...');
	// await getImage(fileKey, nodeIdImage);
	// console.log('> Image is Start!!!');
	const style = await getStylesArtboard(fileKey, query.url);

	

	let result = style;

	if (spacersId) {
		const spacers = await getSpacers(spacersId, fileKey, query.url);
		result = {
			...style,
			size: {
				...style.size,
				spacers
			}
		}
	}

	if (borderRadiusId) {
		const borderRadius = await getBorderRadius(borderRadiusId, fileKey, query.url);
		result = {
			...result,
			size: {
				...result.size,
				borderRadius
			}
		}
	}


	shell.exec('rm -rf ./properties/token.json');

	const pathWriteFile = `./properties/token.json`;

	fs.writeFile(pathWriteFile, JSON.stringify(result), (err) => {
		StyleDictionary.cleanAllPlatforms();
		if (err) console.log(err);
		console.log(`> Ok, we finish! And wrote file ${pathWriteFile}`);
		console.log('> Now, we will compile the styles for you! -->');
		shell.exec('style-dictionary build');

		// StyleDictionary.buildAllPlatforms();
		// main();
	});
}

main().catch((err) => {
	console.error(err);
	console.error(err.stack);
});
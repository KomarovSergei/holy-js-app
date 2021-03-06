const styleType = process.argv[2] || null;
const prefixNameStyle = process.argv[3] || null;
const important = process.argv[4] || null;


const fs = require('fs');
const dotenv = require('dotenv');
const dotenvOptions = {};

if (prefixNameStyle) {
	dotenvOptions.path = `.env.${prefixNameStyle}`;
}
dotenv.config(dotenvOptions)
const fetch = require('node-fetch');
const shell = require('shelljs');

const generateConfig = require('./lib/generate-config')

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
	shell.exec('rm -rf ./properties/token.json');
	const style = await getStylesArtboard(fileKey, query.url, styleType);

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



	const pathWriteFile = `./properties/token.json`;

	fs.writeFile(pathWriteFile, JSON.stringify(result), (err) => {
		const StyleDictionary = require('style-dictionary').extend(generateConfig({prefix: prefixNameStyle, type: styleType}));

		StyleDictionary.registerFormat({
			name: 'my/theme',
			formatter: function(dictionary) {
				const { allProperties } = dictionary;

				return allProperties.reduce((acc, item, index) => {
					acc += `\t--${item.name}: ${item.value}${important ? ' !important' : ''};\n`;
					if (index === dictionary.allProperties.length-1) {
						acc += '}'
					}
					return acc;
				}, `[${prefixNameStyle}] * {\n`)
			}
		});

		StyleDictionary.cleanAllPlatforms();
		shell.exec(`yarn prettier --write ./properties/token.json`);
		if (err) console.log(err);
		console.log(`> Ok, we finish! And wrote file ${pathWriteFile}`);
		console.log('> Now, we will compile the styles for you! -->');

		StyleDictionary.buildAllPlatforms();
		const getCssFiles = source => fs.readdirSync(source);
		const indexCss = getCssFiles('./src/variables/').map(item => `@import 'variables/${item}';\n`).join('');
		fs.writeFile(`./src/variables.css`, indexCss, (err) => {
			if (err) console.log(err);
			shell.exec(`yarn prettier --write ./src/variables.css`);
			console.log(`wrote ./src/variables.css`);
		});
		// main();
	});
}

main().catch((err) => {
	console.error(err);
	console.error(err.stack);
});

const alert = require('cli-alerts');
const fs = require('fs');
const jimp = require('jimp');
const path = require('path');

const decrypt = async flags => {
	
	if (flags.encrypt) {
		alert({
			type: `warning`,
			name: `Invalid combination of flags`,
			msg: `Cannot use both --encrypt and --decrypt flags together`
		});
		process.exit(1);
	}


	const filePath = flags.decrypt;

	if (!filePath) {
		alert({
			type: `warning`,
			name: `Invalid file path`,
			msg: `Please provide a valid file path`
		});
		process.exit(1);
	}

	
	if (!fs.existsSync(filePath)) {
		alert({
			type: `warning`,
			name: `Invalid file path`,
			msg: `Please provide a valid file path`
		});
		process.exit(1);
	}


	if (!flags.key) {
		alert({
			type: `warning`,
			name: `Invalid key`,
			msg: `Please provide a valid key with --key/-k`
		});
		process.exit(1);
	}

	try {
		const ora = (await import('ora')).default;

		const spinner = ora(`Reading Image...`).start();

		const image = await jimp.read(filePath);

		const extension = image.getExtension();

		const rgba = image.bitmap.data;

		const length = rgba.length;

		spinner.succeed(`Image read successfully`);

		const spinner2 = ora(`Getting the key`).start();

		const keyPath = flags.key;

		if (!fs.existsSync(keyPath)) {
			spinner2.fail(`Invalid key path`);
			alert({
				type: `error`,
				name: `Invalid key path`,
				msg: `Please provide a valid key path with --key/-k`
			});
			process.exit(1);
		}

		const key = fs.readFileSync(keyPath, 'utf8');

		const keyDecoded = Buffer.from(key, 'base64');

		const keyArray = Array.from(keyDecoded);

		if (keyArray.length !== length) {
			spinner2.fail(`Invalid key`);
			alert({
				type: `error`,
				name: `Invalid key`,
				msg: `The key is not valid`
			});

			process.exit(1);
		}

		spinner2.succeed(`Key read successfully`);

		const spinner3 = ora(`Decrypting...`).start();

		for (let i = 0; i < length; i++) {
			const k = keyArray[i];
			rgba[i] = rgba[i] ^ k;
		}

		image.bitmap.data = rgba;

		spinner3.succeed(`Decryption successful`);


		const spinner4 = ora(`Saving image...`).start();

		const fileName = path
			.basename(filePath)

			.replace(/\_encrypted$/, '');

		let fileNameWithoutExtension = `${fileName.split('.')[0]}_decrypted`;

		if (flags.outputImageFileName) {
			fileNameWithoutExtension = flags.outputImageFileName.split('.')[0];
		}

		if (fs.existsSync(`${fileNameWithoutExtension}.${extension}`)) {
			console.log(flags);
			spinner4.fail(`Output image file already exists`);
			alert({
				type: `error`,
				name: `Output image file already exists: ${fileNameWithoutExtension}.${extension}`,
				msg: `Please provide a different file name with --outputImageFileName/-i flag`
			});
			process.exit(1);
		}

		image.write(`${fileNameWithoutExtension}.${extension}`);

		spinner4.succeed(`Image saved successfully`);

		alert({
			type: `success`,
			name: `Success`,
			msg: `Image decrypted successfully\n
			Decrypted Image: ${fileNameWithoutExtension}.${extension}`
		});
	} catch (err) {
		alert({
			type: `error`,
			name: `Error`,
			msg: `${err}`
		});
	}
};

module.exports = decrypt;

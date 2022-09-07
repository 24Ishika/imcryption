const alert = require('cli-alerts');
const fs = require('fs');
const jimp = require('jimp');
const path = require('path');
const readline = require('readline');


function askQuestion(query) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise(resolve =>
		rl.question(query, ans => {
			rl.close();
			resolve(ans);
		})
	);
}

const encrypt = async flags => {

	if (flags.decrypt) {
		alert({
			type: `warning`,
			name: `Invalid combination of flags`,
			msg: `Cannot use both --encrypt and --decrypt flags together`
		});
		process.exit(1);
	}

	const filePath = flags.encrypt;

	if (!filePath) {
		alert({
			type: `warning`,
			name: `Invalid file path`,
			msg: `Please provide a valid file path`
		});
		process.exit(1);
	}

	const cwd = process.cwd();

	const fullPath = path.join(cwd, filePath);

	if (!fs.existsSync(fullPath)) {
		alert({
			type: `warning`,
			name: `Invalid file path`,
			msg: `Please provide a valid file path`
		});
		process.exit(1);
	}


	try {
		const ora = (await import('ora')).default;

		const fileName = path.basename(fullPath);

		const fileNameWithoutExtension = fileName.split('.')[0];

		const spinner = ora(`Reading Image...`).start();

		const image = await jimp.read(fullPath);

		const extension = image.getExtension();

		if (extension === `jpeg` || extension === `jpg`) {
			spinner.stop();
			const proceed = await askQuestion(
				`The image you are trying to encrypt is a jpeg/jpg. Some information may be lost while encryption/decryption. Do you want to proceed? (y/n) \n`
			);

			if (proceed !== `y`) {
				process.exit(0);
			}
			spinner.start();
		}

		spinner.succeed(`Image read successfully`);

		let outputImageFile = `${fileNameWithoutExtension}_encrypted.${extension}`;
		const spinner2 = ora(`Checking for output image file name`).start();
		if (flags.outputImageFileName) {
			outputImageFile = path.basename(flags.outputImageFileName);

			if (!outputImageFile.includes('.')) {
				outputImageFile = `${outputImageFile}.${extension}`;
			} else {
				outputImageFile =
					outputImageFile.split('.')[0] + `.${extension}`;
			}
		}

		if (fs.existsSync(outputImageFile)) {
			spinner2.fail(`Output image file already exists`);

			alert({
				type: `error`,
				name: `Invalid output image file name`,
				msg: `The output image file name already exists: ${outputImageFile}
				\nPlease provide a different output image file name with --outputImageFileName/-i flag`
			});
			process.exit(1);
		}

		spinner2.succeed(`Output image file name is valid`);

		let outputKeyFile = `${fileNameWithoutExtension}_key.txt`;
		const spinner3 = ora(`Checking for output key file name`).start();

		if (flags.outputKeyFileName) {
			outputKeyFile = path.basename(flags.outputKeyFileName);
		}

		if (fs.existsSync(outputKeyFile)) {
			spinner3.fail(`Output key file already exists`);
			alert({
				type: `error`,
				name: `Invalid output key file name`,
				msg: `The output key file name already exists: ${outputKeyFile}
				\nPlease provide a different output key file name with --outputKeyFileName/-p flag`
			});
			process.exit(1);
		}

		spinner3.succeed(`Output key file name is valid`);

		const spinner4 = ora(`Encrypting image: Reading Image Data`).start();

		const rgba = image.bitmap.data;

		const length = rgba.length;

		spinner4.succeed(`Image data read successfully`);

		const spinner5 = ora(`Encrypting image: Generating key`).start();

		const key = [];
		for (let i = 0; i < length; i++) {
			key.push(Math.floor(Math.random() * 256));
		}

		spinner5.succeed(`Key generated successfully`);

		const spinner6 = ora(`Encrypting image: Encrypting image`).start();

		await new Promise(resolve => {
			for (let i = 0; i < length; i++) {
				const k = key[i];
				rgba[i] = rgba[i] ^ k;
			}

			image.bitmap.data = rgba;
			resolve();
		});

		spinner6.succeed(`Image encrypted successfully`);

		const spinner7 = ora(`Encrypting image: Saving image`).start();

		image.write(outputImageFile);

		spinner7.succeed(`Image saved successfully`);


		const spinner8 = ora(`Encrypting image: Saving key`).start();

		fs.writeFileSync(outputKeyFile, Buffer.from(key).toString('base64'));

		spinner8.succeed(`Key saved successfully`);

		alert({
			type: `success`,
			name: `Image encrypted successfully`,
			msg: `Image encrypted successfully:\n
			Encrypted Image: ${outputImageFile}\n
			Key: ${outputKeyFile}`
		});

	} catch (error) {
		alert({
			type: `error`,
			name: `Error`,
			msg: `${error || 'Unknown error'}`
		});
		process.exit(1);
	}
};

module.exports = encrypt;

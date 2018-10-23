/* eslint no-console: 0, no-process-exit: 0 */
'use strict';

const shell = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const css = require('./src/css');
const uglifycss = require('uglifycss');
const { hashElement } = require('folder-hash');

const NODE_PATH = '';

const env = Object.create(process.env);
env.NPM_CONFIG_COLOR = 'always';
env.NODE_PATH = __dirname + '/src';

const _execute = function(cmd, cb) {
	console.log(cmd);
	const obj = shell.exec(
		cmd,
		{
			env: env,
		},
		cb,
	);
	obj.stdout.pipe(process.stdout);
	obj.stderr.pipe(process.stderr);
};

const rules = {
	'test-dev': function(cb) {
		const cmd = `echo "There are no tests :)"`;
		_execute(cmd, cb);
	},

	'build-vendor': function(cb) {
		const vendor_bundle = process.env.npm_package_config_bundles_vendor;
		const cmd = `${NODE_PATH} browserify ${_vendor_exports().join(' ')} | babel-minify --mangle true > ${vendor_bundle}`;
		_execute(cmd, cb);
	},
	'build-prod': function(cb) {
		rules['build-vendor'](function(error) {
			if (error) {
				return cb(error);
			}
			const entry = process.env.npm_package_config_bundles_main_entry;
			const bundle = process.env.npm_package_config_bundles_main_out;
			const cmd = `${NODE_PATH} browserify ${_vendor_imports().join(' ')} ${entry} | babel-minify --mangle true > ${bundle}`;
			_execute(cmd, cb);
		});
	},
	build: function(cb) {
		const entry = process.env.npm_package_config_bundles_main_entry;
		const bundle = process.env.npm_package_config_bundles_main_out;
		const cmd = `${NODE_PATH} browserify ${_dev_flags()} ${_vendor_imports().join(' ')} ${entry} | babel-minify --mangle true > ${bundle}`;
		initConfigFiles((err) => {
			if (err) {
				console.error('ERROR', err);
				process.exit(0);
			}
			build_css((err) => {
				if (err) {
					console.error('ERROR', err);
					process.exit(0);
				}
				rules['build-vendor']((err) => {
					if (err) {
						console.error('ERROR', err);
						process.exit(0);
					}
					_execute(cmd, (err) => {
						if (err) {
							console.error('ERROR', err);
							process.exit(0);
						}
						updateServiceWorker(cb);
					});
				});
			});
		});
	},

	watch: function(cb) {
		const entry = process.env.npm_package_config_bundles_main_entry;
		const bundle = process.env.npm_package_config_bundles_main_out;
		const cmd = `${NODE_PATH} watchify ${_dev_flags()} ${_vendor_imports().join(' ')} ${entry} -o ${bundle}`;
		_execute(cmd, cb);
	},
	'build-css': function(cb) {
		build_css(cb);
	},

	'clean-dev': function(cb) {
		const main_bundle = process.env.npm_package_config_bundles_main_out;
		const cmd = `rm -f ${main_bundle}`;
		_execute(cmd, cb);
	},
	clean: function(cb) {
		const vendor_bundle = process.env.npm_package_config_bundles_vendor;
		const main_bundle = process.env.npm_package_config_bundles_main_out;
		const cmd = `rm -f ${vendor_bundle} ${main_bundle}`;
		_execute(cmd, cb);
	},
};
const rule = argv._.shift();
if (rules[rule]) {
	rules[rule](function(error) {
		if (error) {
			return process.exit(error.code);
		} else {
			return process.exit(0);
		}
	});
} else {
	console.log('Invalid rule in site/scripts.js :', rule, argv);
	console.log('Valid rules:', Object.keys(rules));
	process.exit(1);
}

function _vendor_modules() {
	let base = 'npm_package_config_vendor_modules_',
		out = [],
		i = 0;
	while (process.env[base + i]) {
		out.push(process.env[base + i]);
		i += 1;
	}
	return out;
}

function _vendor_exports() {
	return _vendor_modules().map(function(m) {
		return '-r ' + m;
	});
}

function _vendor_imports() {
	return [' -t [ babelify --sourceMapsAbsolute --presets [ @babel/preset-react ] ] '].concat(
		_vendor_modules().map(function(m) {
			return '-x ' + m;
		}),
	);
}

function _dev_flags() {
	return ['-v', '--debug', '--full-paths'].join(' ');
}

function build_css(cb) {
	const pre_css_folder = './src/css/';
	const dest_css_filename = './assets/main.css';

	const _output_file = function(output) {
		console.log('pre.css output: ', dest_css_filename);
		fs.writeFile(dest_css_filename, output, (err) => {
			if (err) {
				console.log('ERROR []', err);
				process.exit(0);
			}
			const uglified = uglifycss.processFiles([dest_css_filename], { maxLineLen: 500, expandVars: true });
			fs.writeFile(dest_css_filename, uglified, cb);
		});
	};

	const _compile_file = function(pre_css_filename, _cb) {
		console.log('pre.css build: ', pre_css_filename);
		fs.readFile(pre_css_filename, (err, data) => {
			if (err) {
				console.error('Error reading pre.css file', pre_css_filename, err);
				process.exit(0);
			} else {
				const output = data
					.toString()
					.split('\n')
					.map((line) => {
						const m = line.match(/\$[^ ';]*/);
						if (m) {
							const css_variable = m[0];
							const arr = css_variable
								.slice(1)
								.split('.')
								.slice(1);
							let result = css;
							for (const i in arr) {
								try {
									result = result[arr[i]];
								} catch (e) {
									console.error('Error parsing line ' + i + ' in ' + pre_css_filename, 'invalid key', arr[i]);
									console.error(i, '---> ', line);
									process.exit(0);
								}
							}
							line = line.replace(css_variable, result);
							return line;
						}
						return line;
					})
					.join('\n');
				_cb(output);
			}
		});
	};

	fs.readdir(pre_css_folder, (err, files) => {
		let numfiles = 0;
		let numfilesparsed = 0;
		let complete_output = '';
		files.forEach((file) => {
			if (file.indexOf('pre.css') > -1) {
				numfiles++;
				_compile_file(pre_css_folder + file, (output) => {
					numfilesparsed++;
					if (file === 'main.pre.css') {
						complete_output = output + '\n' + complete_output;
					} else {
						complete_output += '\n' + output;
					}

					if (numfiles === numfilesparsed) {
						_output_file(complete_output);
					}
				});
			}
		});
	});
}

function updateServiceWorker(cb) {
	console.log('Updating service-worker.js...');

	// https://www.npmjs.com/package/folder-hash
	const options = {
		folders: { exclude: ['node_modules', 'build'] },
		files: { exclude: ['service-worker.js'] },
	};

	hashElement('.', options).then(hashObj => {
        console.log("Version hash:", hashObj.hash);
		var contents = fs.readFileSync('./src/workers/service-worker-template.js', 'utf8');

		// TODO: Minify this
		const edit = 
		"// This file has been automatically generated as part of the build process. Changes here will be overidden on the next build.\r\n" + 
		"// Do not check this in to source control. If you'd like to make edits to the service worker edit service-worker-template.js instead.\r\n" +
		"// Changes made in that file will be reflected here. \r\n" +
		`let autoGenCacheName = 'softball-${hashObj.hash}'; \r\n`;

		fs.writeFileSync('./src/workers/service-worker.js', edit + contents);
		cb();
    }).catch(error => {
        console.error('hashing failed:', error);
        process.exit( 0 );
    });
}

function initConfigFiles(cb) {
	if (!fs.existsSync('./src/config.js')) {
		console.log('No ./src/config.js file was found, creating from template');
		fs.createReadStream('./src/config.template.js').pipe(fs.createWriteStream('./src/config.js'));
	}

	if (!fs.existsSync('./src-srv/config.js')) {
		console.log('No ./src-srv/config.js file was found, creating from template');
		fs.createReadStream('./src-srv/config.template.js').pipe(fs.createWriteStream('./src-srv/config.js'));
	}
	cb();
}

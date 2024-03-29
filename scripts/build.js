/* eslint no-console: 0, no-process-exit: 0 */

// import css from '../client/src/css/theme.js';
const shell = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const uglifycss = require('uglifycss');
const path = require('path');
// const css = require('../client/src/css/theme.js');

const env = Object.create(process.env);
env.NPM_CONFIG_COLOR = 'always';
env.NODE_PATH = path.resolve(__dirname, '../client/src');

const _execute = function (cmd, cb) {
  console.log(cmd);
  const obj = shell.exec(
    cmd,
    {
      env: env,
    },
    cb
  );
  obj.stdout.pipe(process.stdout);
  obj.stderr.pipe(process.stderr);
};

const _executeAsync = async function (cmd) {
  return new Promise((resolve) => {
    console.log(cmd);
    const obj = shell.exec(
      cmd,
      {
        env: env,
      },
      resolve
    );
    obj.stdout.pipe(process.stdout);
    obj.stderr.pipe(process.stderr);
  });
};

const rules = {
  'test-dev': function (cb) {
    const cmd = `echo "There are no tests :)"`;
    _execute(cmd, cb);
  },

  build: function (cb) {
    initConfigFiles((err) => {
      if (err) {
        console.error('ERROR', err);
        process.exit(0);
      }
      build_css(async (err) => {
        if (err) {
          console.error('ERROR', err);
          process.exit(0);
        }
        try {
          await _executeAsync(
            'terser --compress --mangle -o build/main.js -- build/main.js'
          );
          updateServiceWorker(cb);
        } catch (e) {
          console.error('ERROR', e);
          process.exit(0);
        }
      });
    });
  },
  'update-service-worker': function (cb) {
    updateServiceWorker(cb);
  },
  watch: function (cb) {
    const cmd = `webpack --watch`;
    _execute(cmd, cb);
  },
  'build-css': async function (cb) {
    await cssPromise;
    build_css(cb);
  },

  'clean-dev': function (cb) {
    const main_bundle = process.env.npm_package_config_bundles_main_out;
    const cmd = `rm -f ${main_bundle}`;
    _execute(cmd, cb);
  },
  clean: function (cb) {
    const main_bundle = process.env.npm_package_config_bundles_main_out;
    const cmd = `rm -f ${main_bundle}`;
    _execute(cmd, cb);
  },
};
const rule = argv._.shift();
if (rules[rule]) {
  rules[rule](function (error) {
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

function build_css(cb) {
  const pre_css_folder = path.resolve(__dirname, '../client/src/css/');
  const dest_css_filename = path.resolve(__dirname, '../assets/main.css');

  const _output_file = function (output) {
    console.log('pre.css output: ', dest_css_filename);
    fs.writeFile(dest_css_filename, output, (err) => {
      if (err) {
        console.log('ERROR []', err);
        process.exit(0);
      }
      const uglified = uglifycss.processFiles([dest_css_filename], {
        maxLineLen: 500,
        expandVars: true,
      });
      fs.writeFile(dest_css_filename, uglified, cb);
    });
  };

  const _compile_file = function (pre_css_filename, _cb) {
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
              const arr = css_variable.slice(1).split('.').slice(1);
              let result = css;
              for (const i in arr) {
                try {
                  result = result[arr[i]];
                } catch (e) {
                  console.error(
                    'Error parsing line ' + i + ' in ' + pre_css_filename,
                    'invalid key',
                    arr[i]
                  );
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
    let numFiles = 0;
    let numFilesParsed = 0;
    let complete_output = '';
    files.forEach((file) => {
      if (file.indexOf('pre.css') > -1) {
        numFiles++;
        _compile_file(pre_css_folder + file, (output) => {
          numFilesParsed++;
          if (file === 'main.pre.css') {
            complete_output = output + '\n' + complete_output;
          } else {
            complete_output += '\n' + output;
          }

          if (numFiles === numFilesParsed) {
            _output_file(complete_output);
          }
        });
      }
    });
  });
}

function updateServiceWorker(cb) {
  console.log('Updating service-worker.js...');

  // Assign a random id to the service worker after each build, so it gets updated with iterative development
  function makeid(length) {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  let buildId = makeid(32);
  console.log('Service worker build id:', buildId);
  var contents = fs.readFileSync(
    path.resolve(__dirname, '../workers/service-worker-template.js'),
    'utf8'
  );

  const edit =
    '// This file has been automatically generated as part of the build process. Changes here will be overridden on the next build.\r\n' +
    "// Do not check this in to source control. If you'd like to make edits to the service worker edit service-worker-template.js instead.\r\n" +
    '// Changes made in that file will be reflected here. \r\n' +
    `let autoGenCacheName = 'softball-${buildId}'; \r\n`;

  fs.writeFileSync('./build/service-worker.js', edit + contents);
  cb();
}

function initConfigFiles(cb) {
  const clientConfigPath = path.resolve(__dirname, '../client/src');
  if (!fs.existsSync(clientConfigPath + '/config.js')) {
    console.log(
      `No ${
        clientConfigPath + '/config.js'
      } file was found, creating from template`
    );
    fs.createReadStream(clientConfigPath + '/config.template.js').pipe(
      fs.createWriteStream(clientConfigPath + '/config.js')
    );
  }

  const serverConfigPath = path.resolve(__dirname, '../server/src');

  if (!fs.existsSync(serverConfigPath + '/config.js')) {
    console.log(
      `No ${
        serverConfigPath + '/config.js'
      } file was found, creating from template`
    );
    fs.createReadStream(serverConfigPath + '/config.template.js').pipe(
      fs.createWriteStream(serverConfigPath + '/config.js')
    );
  }
  cb();
}

import * as path from 'path';
import uglifycss from 'uglifycss';
import * as fs from 'fs';
import css from '../src/css/theme';

function build_css(cb) {
  const pre_css_folder = path.resolve(__dirname, '../src/css/');
  const dest_css_filename = path.resolve(
    __dirname,
    '../public/assets/main.css'
  );

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
        _compile_file(pre_css_folder + '/' + file, (output) => {
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
build_css(() => {
  console.log('CSS build complete');
});

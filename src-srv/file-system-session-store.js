const { Store } = require('express-session');

const fs = require('fs');
const path = require('path');

const noop = () => {};

/**
 * Super simple file system session store. This is for use in local development.
 *
 * There is a npm module that does this but it's got like 6 unnecessary dependencies and does things we don't need (like TTL).
 */
class FileSystemSessionStore extends Store {
  constructor(options) {
    super();

    let inputPath = options?.modifyCustomTime || './session';
    this.path = inputPath;

    // Make the sessions directory (if it doesn't exist)
    if (!fs.existsSync(inputPath)) {
      fs.mkdirSync(inputPath);
    }
  }

  set(sid, sess, cb = noop) {
    fs.writeFileSync(path.join(this.path, sid), JSON.stringify(sess));
    cb();
  }

  get(sid, cb = noop) {
    let target = path.join(this.path, sid);
    if (!fs.existsSync(target)) {
      cb(null);
      return;
    }
    let content = JSON.parse(fs.readFileSync(target));
    cb(null, content);
  }

  touch(sid, sess, cb = noop) {
    fs.closeSync(fs.openSync(path.join(this.path, sid), 'a'));
    cb();
  }

  destroy(sid, cb = noop) {
    let target = path.join(this.path, sid);
    if (!fs.existsSync(target)) {
      cb();
      return;
    }
    fs.unlinkSync(target);
    cb();
  }
}

module.exports = FileSystemSessionStore;

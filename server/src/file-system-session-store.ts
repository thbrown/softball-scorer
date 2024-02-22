import ExpressSession from 'express-session';
const Store = ExpressSession.Store;
import fs from 'fs';
import path from 'path';
import logger from './logger';

const noop = (err: null | unknown, data?: any) => {};

/**
 * Super simple file system session store. This is for use in local development.
 *
 * There is a npm module that does this but it's got like 6 unnecessary dependencies and does things we don't need (like TTL).
 */
export default class FileSystemSessionStore extends Store {
  path: string;

  constructor(options: { modifyCustomTime?: string } = {}) {
    super();

    const inputPath = options?.modifyCustomTime || './session';
    this.path = inputPath;

    // Make the sessions directory (if it doesn't exist)
    if (!fs.existsSync(inputPath)) {
      fs.mkdirSync(inputPath);
    }
  }

  set(sid: string, sess: unknown, cb = noop) {
    fs.writeFileSync(path.join(this.path, sid), JSON.stringify(sess));
    cb(null);
  }

  get(sid: string, cb = noop) {
    logger.log('?', 'Getting session');
    const target = path.join(this.path, sid);
    if (!fs.existsSync(target)) {
      cb(null);
      logger.log('?', 'No session :(');
      return;
    }
    const content = JSON.parse(fs.readFileSync(target).toString());
    //logger.log('?', 'Session ', content);

    cb(null, content);
  }

  touch(sid: string, sess: unknown, cb = noop) {
    fs.closeSync(fs.openSync(path.join(this.path, sid), 'a'));
    cb(null);
  }

  destroy(sid, cb = noop) {
    const target = path.join(this.path, sid);
    if (!fs.existsSync(target)) {
      cb(null);
      return;
    }
    fs.unlinkSync(target);
    cb(null);
  }
}

import { getConfig } from '../src/config-accessor';

const config = getConfig();
config.session.secretkey ??= 'test-only-secret-key';
config.logging.format = 'text';

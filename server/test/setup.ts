import { getConfig } from '../src/config-accessor';

// Tests run over plain HTTP, so secure cookies must be disabled
process.env.DEVELOPMENT = 'true';

const config = getConfig();
config.session.secretkey ??= 'test-only-secret-key';
config.logging.format = 'text';

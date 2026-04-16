import networkBase from 'network';
// @ts-expect-error -- no-op-network is a test file resolved by vite
import noOpNetwork from './tests/no-op-network.js';

/**
 * This class is used to inject different versions of a service based on set environmental variables.
 */

let network = process.env.NODE_ENV ? noOpNetwork : networkBase;
export { network };

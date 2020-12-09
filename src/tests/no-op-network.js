import network from 'network';

/**
 * For testing, override the existing network behavior such that it does nothing when called.
 */
const exp = {};

for (let funcName in network) {
  exp[funcName] = function () {
    console.log(
      '[MOCK]',
      'This function has been mocked:',
      `network.${funcName}`
    );
    return {};
  };
}
// Override the the actual network call to do nothing
exp.requestInternal = async function (method, url, body) {
  console.log(
    '[NET] Not making network request due to environmental variable settings'
  );
  return {};
};
console.log('Network', network, exp);

export default exp;
window.network = exp;

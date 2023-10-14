import { getGlobalState } from 'state';
import config from './config';

const exp = {};

const FETCH_TIMEOUT =
  config.network && config.network.timeout ? config.network.timeout : 10000;
const NETWORK_DELAY = 0; // I don't remember why I added this, testing? It was set to 1000ms this whole time :embarrassing:
let requestInternal;

exp.request = async function (method, url, body, controller, overrideTimeout) {
  url = exp.getServerUrl(url);

  return await requestInternal(method, url, body, controller, overrideTimeout);
};
export const request = exp.request;

exp.getServerUrl = function (path) {
  return window.location.origin + '/' + path;
};

requestInternal = async function (
  method,
  url,
  body,
  controller,
  overrideTimeout
) {
  const response = {};

  if ('fetch' in window) {
    const res = await new Promise(async function (resolve, reject) {
      const timeout = setTimeout(
        function () {
          reject(new Error('Request timed out ' + url));
        },
        overrideTimeout ? overrideTimeout : FETCH_TIMEOUT
      );
      try {
        let reqResp = await fetch(url, {
          method: method,
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json', // TODO: accept gzip?
          },
          body: body,
          signal: controller?.signal,
        });
        setTimeout(() => resolve(reqResp), NETWORK_DELAY);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Network request canceled');
          // Canceled Request (TODO: not sure the best way to handle this yet)
          resolve(-4); /*
          reject(
            new Error(
              'Something went wrong during the request (canceled): ' + err,
              err
            )
          );*/
        } else {
          reject(
            new Error('Something went wrong during the request: ' + err, err)
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    });

    response.status = res.status;
    if (response.status === undefined) {
      // This can happen if request is canceled via AbortController, just ignore it
    } else if (response.status !== 204) {
      let data;
      try {
        data = await res.text();
        response.body = data ? JSON.parse(data) : undefined;
      } catch (e) {
        console.log(e, data, response.status, response);
      }
    }
  } else {
    throw new Error('Unsupported Browser');
  }
  console.log('[NET] Request Complete', url, response.status, response.body);
  return response;
};

export default exp;
window.network = exp;

import state from 'state';
import config from './config';

const exp = {};

const FETCH_TIMEOUT =
  config.network && config.network.timeout ? config.network.timeout : 10000;
const NETWORK_DELAY = 0;

let requestInternal;

exp.request = async function (method, url, body) {
  url = exp.getServerUrl(url);
  return await requestInternal(method, url, body);
};
export const request = exp.request;

exp.getServerUrl = function (path) {
  return window.location.origin + '/' + path;
};
export const getServerUrl = exp.getServerUrl;

requestInternal = async function (method, url, body) {
  const response = {};

  if ('fetch' in window) {
    const res = await new Promise(async function (resolve, reject) {
      const timeout = setTimeout(function () {
        reject(new Error('Request timed out'));
      }, FETCH_TIMEOUT);
      try {
        let reqResp = await fetch(url, {
          method: method,
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json', // TODO: accept gzip?
          },
          body: body,
        });
        setTimeout(() => resolve(reqResp), NETWORK_DELAY);
      } catch (err) {
        reject(
          new Error('Something went wrong during the request: ' + err, err)
        );
      } finally {
        clearTimeout(timeout);
      }
    });

    response.status = res.status;
    if (response.status !== 204) {
      let data;
      try {
        data = await res.text();
        response.body = data ? JSON.parse(data) : undefined;
      } catch (e) {
        console.log(e, data);
      }
    }

    state.setStatusBasedOnHttpResponse(response.status);
  } else {
    console.log('xhr', new XMLHttpRequest());
    // TODO: This is untested and probably doesn't work
    const request = await new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.response);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText,
            response: xhr.response,
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText,
        });
      };
      xhr.send(JSON.stringify(body));
    });
    response.status = request.status;
    if (response.status !== 204) {
      response.body = request.response;
    }

    state.setStatusBasedOnHttpResponse(response.status);
  }
  console.log('[NET] Request Complete', url, response.status, response.body);
  return response;
};

export default exp;
window.network = exp;

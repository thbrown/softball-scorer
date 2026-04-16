import config from './config';

export interface NetworkResponse<T = unknown> {
  status: number;
  body?: T;
}

declare global {
  interface Window {
    network: typeof exp;
  }
}

const FETCH_TIMEOUT =
  config.network && config.network.timeout ? config.network.timeout : 10000;
const NETWORK_DELAY = 0; // I don't remember why I added this, testing? It was set to 1000ms this whole time :embarrassing:

const exp = {
  request: async function <T = unknown>(
    method: string,
    url: string,
    body?: string,
    controller?: AbortController,
    overrideTimeout?: number
  ): Promise<NetworkResponse<T>> {
    url = exp.getServerUrl(url);

    return await requestInternal<T>(
      method,
      url,
      body,
      controller,
      overrideTimeout
    );
  },

  getServerUrl: function (path: string): string {
    return window.location.origin + '/' + path;
  },
};

const requestInternal = async function <T = unknown>(
  method: string,
  url: string,
  body?: string,
  controller?: AbortController,
  overrideTimeout?: number
): Promise<NetworkResponse<T>> {
  const response: NetworkResponse<T> = {} as NetworkResponse<T>;

  if ('fetch' in window) {
    const res = await new Promise<Response | number>(async function (
      resolve,
      reject
    ) {
      const timeout = setTimeout(
        function () {
          reject(new Error('Request timed out ' + url));
        },
        overrideTimeout ? overrideTimeout : FETCH_TIMEOUT
      );
      try {
        const reqResp = await fetch(url, {
          method: method,
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json', // TODO: accept gzip?
          },
          body: body,
          signal: controller?.signal,
        });
        setTimeout(() => resolve(reqResp), NETWORK_DELAY);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
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
            new Error('Something went wrong during the request: ' + err)
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    });

    if (typeof res === 'number') {
      response.status = res;
    } else {
      response.status = res.status;
    }

    if (response.status === undefined) {
      // This can happen if request is canceled via AbortController, just ignore it
    } else if (response.status !== 204) {
      let data;
      try {
        data = await (res as Response).text();
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

export const request = exp.request;

export default exp;
window.network = exp;

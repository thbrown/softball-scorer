"use strict";

const FETCH_TIMEOUT = 10000;
const state = require("state");

exports.request = async function(method, url, body) {
  url = exports.getServerUrl(url);
  console.log("Request to ", url);
  try {
    let response = await requestInternal(method, url, body);
    state.setStatusBasedOnHttpResponse(response.status);
    return response;
  } catch (err) {
    console.log("Encountered an error during network request");
    console.log(err);
    state.setOffline();
    // We'll just return -1 to say that something went wrong with the network
    const response = {};
    response.status = -1;
    response.body = {};
    response.body.message = err;
    return response;
  }
};

exports.getServerUrl = function(path) {
  return window.location.origin + "/" + path;
};

// TODO: Should we move this to the state?
exports.updateNetworkStatus = async function() {
  let resp = await exports.request("GET", "server/current-account");
  if (resp.status === 200) {
    console.log(`Active User: ${resp.body.email}`);
    state.setActiveUser(resp.body.email);
  }
};

let requestInternal = async function(method, url, body) {
  const response = {};
  if ("fetch" in window) {
    const res = await new Promise(async function(resolve, reject) {
      const timeout = setTimeout(function() {
        reject(new Error("Request timed out"));
      }, FETCH_TIMEOUT);
      try {
        let reqResp = await fetch(url, {
          method: method,
          credentials: "same-origin",
          headers: {
            "content-type": "application/json"
          },
          body: body
        });
        resolve(reqResp);
      } catch (err) {
        reject(new Error("Something went wrong during the request: " + err));
      } finally {
        clearTimeout(timeout);
      }
    });

    response.status = res.status;
    if (response.status !== 204) {
      try {
        let data = await res.text();
        response.body = data ? JSON.parse(data) : undefined;
      } catch (e) {
        console.log(e);
      }
    }

    state.setStatusBasedOnHttpResponse(response.status);
  } else {
    // TODO: This is untested and probably doesn't work
    const request = await new Promise(function(resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-type", "application/json");
      xhr.onload = function() {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.response);
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText,
            response: xhr.response
          });
        }
      };
      xhr.onerror = function() {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send(JSON.stringify(body));
    });
    response.status = request.status;
    if (response.status !== 204) {
      response.body = request.response;
    }
  }
  console.log("Request Complete", url, response.status);
  return response;
};

window.state = exports;

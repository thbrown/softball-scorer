import React from 'react';
import expose from 'expose';
import Card from 'elements/card';
import config from '../config';
import { getGlobalState } from 'state';
import Loading from '../elements/loading';

export default class CardOptimizerSelect extends expose.Component<Record<string, never>> {
  baseUrl: string;
  indexUrl: string;
  onMessageReceived: (evt: MessageEvent) => void;

  constructor(props: Record<string, never>) {
    super(props);
    this.baseUrl =
      config.optimizerGallery?.baseUrl || 'https://optimizers.softball.app';
    this.indexUrl =
      config.optimizerGallery?.indexUrl || 'https://optimizers.softball.app/';

    this.onMessageReceived = function onMessageReceived(evt: MessageEvent) {
      getGlobalState().setAccountOptimizersList(evt.data);
      getGlobalState().scheduleSync();
      console.log('Selected optimizers', evt.data);
    };
  }

  componentDidMount() {
    let iframe = document.getElementById('opt-select') as HTMLIFrameElement;
    if (!iframe) return;
    iframe.onload = function () {
      // Listen for messages from the iframe
      window.addEventListener('message', this.onMessageReceived, false);

      // Send starting message
      let iframeWin = iframe.contentWindow;
      if (iframeWin) {
        let selectedOptimizers = getGlobalState().getAccountOptimizersList();
        iframeWin.postMessage(selectedOptimizers, this.baseUrl);
      }

      // Hide the loading div
      let loadDiv = document.getElementById('loading');
      if (loadDiv) {
        loadDiv.classList.add('gone');
      }
    }.bind(this);
  }

  componentWillUnmount() {
    // TODO: Does this work?
    console.log('Removing event listener');
    window.removeEventListener('message', this.onMessageReceived, false);
  }

  render() {
    return (
      <Card title="Add/Remove Optimizers">
        <div
          className="loading-container"
          style={{ height: 'calc(100vh - 49px)' }}
        >
          <div
            className="loading"
            id="loading"
            style={{ backgroundColor: 'gray', opacity: 0.9 }}
          >
            <Loading style={{ width: '20%', height: '20%' }}></Loading>
          </div>
          <iframe
            id="opt-select"
            width="100%"
            height="100%"
            frameBorder="0"
            src={this.indexUrl}
          />
        </div>
      </Card>
    );
  }
}

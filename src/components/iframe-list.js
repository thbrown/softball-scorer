import React, { useEffect, useState } from 'react';
import state from 'state';

const DEFAULT_WIDTH = 48;
const DEFAULT_HEIGHT = 48;

const buildUrl = (songLink, songStart) => {
  if (!songLink) {
    return '';
  }

  return ` http://127.0.0.1:8080/iframe-proxy.html?id=${songLink}&start=${
    songStart ?? 0
  }`;

  // return `https://thbrown.github.io/iframe-proxy/index.html?id=${songLink}&start=${
  //   songStart ?? 0
  // }`;
};

const reloadIframe = (id, link) => {
  const iframe = document.getElementById(id);
  if (iframe) {
    const parent = iframe.parentNode;
    parent.removeChild(iframe);
    iframe.setAttribute('src', '');
    setTimeout(() => {
      parent.appendChild(iframe);
      iframe.setAttribute('src', link);
    }, 33);
  }
};

export const YoutubeIframe = ({ keyName, songId, songStart }) => {
  const [overlayVisible, setOverlayVisible] = useState(true);

  const handleOverlayClick = () => {
    // setOverlayVisible(false);
    reloadIframe(keyName, link);
  };

  useEffect(() => {
    const onMessage = (ev) => {
      if (typeof ev.data !== 'string') {
        return;
      }

      const successMatch = ev.data.match(/IFRAME_PROXY_LOAD_SUCCESS:(.*)/);
      if (successMatch) {
        const id = successMatch[1];
        if (songId === id) {
          console.log('Iframe loaded successfully!', songId);
          setOverlayVisible(false);
        }
      }

      const failMatch = ev.data.match(/IFRAME_PROXY_LOAD_FAIL:(.*)/);
      if (failMatch) {
        const id = failMatch[1];
        if (songId === id) {
          console.log('Iframe failed to load', songId);
          // reloadIframe();
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [songId]);

  const link = buildUrl(songId, songStart);

  if (!link) {
    return (
      <div
        style={{
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT - 8,
          textAlign: 'center',
          color: 'black',
          padding: '4px 0px',
          backgroundColor: 'lightgray',
          borderRadius: '5px',
        }}
      >
        No Song
      </div>
    );
  }

  console.log('render iframe', link);

  return (
    <div
      key={keyName}
      style={{
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        position: 'relative',
      }}
    >
      <iframe
        width={DEFAULT_WIDTH - 2}
        height={DEFAULT_HEIGHT - 2}
        title={keyName}
        id={keyName}
        src={link}
        frameBorder="0"
        style={{
          position: 'absolute',
          top: 1,
          left: 1,
        }}
        allow="autoplay; encrypted-media"
        sandbox="allow-scripts allow-same-origin"
      />
      <div
        onClick={handleOverlayClick}
        style={{
          pointerEvents: overlayVisible ? 'all' : 'none',
          width: DEFAULT_WIDTH - 2,
          height: DEFAULT_HEIGHT - 2,
          position: 'absolute',
          top: 1,
          left: 1,
          zIndex: 2,
          border: '1px solid black',
          background: overlayVisible ? 'rgba(0, 0, 0, 0.5)' : 'unset',
        }}
      ></div>
    </div>
  );
};

const IframeList = ({ game }) => {
  return (
    <div>
      <div>Songs</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {game.lineup
          .map((id) => {
            return state.getPlayer(id);
          })
          .map((player) => {
            const key = 'song-' + player.id;
            return (
              <YoutubeIframe
                key={key}
                keyName={key}
                songId={player.song_link}
                songStart={player.song_start}
              />
            );
          })}
      </div>
    </div>
  );
};

export default IframeList;

import expose from 'expose';
import DOM from 'react-dom-factories';

export default class WalkupSong extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.key = 0;
    this.state = {
      key: 0,
    };

    this.startIframeClickDetect = function () {
      // Handle walkup song clicks
      clearInterval(this.monitor);
      this.monitor = setInterval(
        function () {
          var elem = document.activeElement;
          if (elem && elem.tagName === 'IFRAME') {
            clearInterval(this.monitor);
            document.getElementById('songOverlay').classList.remove('gone');
          }
        }.bind(this),
        100
      );
    };

    this.startIframeClickDetect();

    this.handleOverlayClick = function () {
      // Reload song iframe
      this.forceRender = true;
      this.setState({
        key: Math.random(),
      });
      document.getElementById('songOverlay').classList.add('gone');
      this.startIframeClickDetect();
    }.bind(this);

    this.buildUrl = function (songLink, songStart) {
      return `https://thbrown.github.io/iframe-proxy/index.html?id=${songLink}&start=${
        songStart ? songStart : 0
      }`;
    };
  }

  shouldComponentUpdate(nextProps) {
    if (
      nextProps.songLink !== this.props.songLink ||
      nextProps.songStart !== this.props.songStart ||
      this.forceRender
    ) {
      this.forceRender = false;
      return true;
    } else {
      return false;
    }
  }

  UNSAFE_componentWillUpdate() {
    let song = document.getElementById('songOverlay');
    let frame = document.getElementById('currentBatterSong');

    if (song && frame) {
      song.classList.add('gone');

      // This is a way to prevent the iframe state changes from being persisted to browser history
      // Iframe reloads only add to history if they are attached to the DOM on change
      let parent = frame.parentNode;
      parent.removeChild(frame);
      frame.setAttribute(
        'src',
        this.buildUrl(this.props.songLink, this.props.songStart)
      );
      parent.appendChild(frame);
      this.startIframeClickDetect();
    }
  }

  componentWillUnmount() {
    clearInterval(this.monitor);
  }

  render() {
    if (this.props.songLink) {
      return DOM.div(
        {
          id: 'song',
          key: 'song',
          style: {
            position: 'relative',
            display: 'inline-block',
          },
        },
        DOM.iframe({
          key: 'currentBatterSong' + this.state.key,
          id: 'currentBatterSong',
          width: this.props.width,
          height: this.props.height,
          frameBorder: '0',
          src: this.buildUrl(this.props.songLink, this.props.songStart),
          allow: 'autoplay; encrypted-media',
          sandbox: 'allow-scripts allow-same-origin',
        }),
        DOM.div({
          key: 'songOverlay' + this.state.key,
          id: 'songOverlay',
          onClick: this.handleOverlayClick,
          className: 'gone',
          style: {
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
            backgroundColor: 'black',
            opacity: 0.1,
          },
        })
      );
    } else {
      return DOM.div(
        {
          id: 'song',
          key: 'song',
          style: {
            width: this.props.width,
            height: this.props.height,
            textAlign: 'center',
            color: 'white',
            paddingTop: '8px',
          },
        },
        'No Song'
      );
    }
  }
}

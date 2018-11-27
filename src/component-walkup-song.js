"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

module.exports = class WalkupSong extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.key = 0;
    this.state = {
      key: 0
    };

    let startIframeClickDetect = function() {
      // Handle walkup song clicks
      this.clicked = false;
      this.monitor = setInterval(
        function() {
          var elem = document.activeElement;
          if (elem && elem.tagName == "IFRAME") {
            clearInterval(this.monitor);
            document.getElementById("songOverlay").classList.remove("gone");
          }
        }.bind(this),
        100
      );
    }.bind(this);

    startIframeClickDetect();

    this.handleOverlayClick = function() {
      // Reload song iframe
      this.forceRender = true;
      this.setState({
        key: Math.random()
      });

      document.getElementById("songOverlay").classList.add("gone");
      startIframeClickDetect();
    }.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      nextProps.songLink !== this.props.songLink ||
      nextProps.songStart !== this.props.songStart ||
      this.forceRender
    ) {
      this.forceRender = false;
      this.clicked = false;
      return true;
    } else {
      return false;
    }
  }

  componentWillUnmount() {
    clearInterval(this.monitor);
  }

  render() {
    if (this.props.songLink) {
      return DOM.div(
        {
          id: "song",
          key: "song",
          style: {
            position: "relative",
            display: "inline-block"
          }
        },
        DOM.iframe({
          key: "currentBatterSong" + this.state.key,
          id: "currentBatterSong",
          width: this.props.width,
          height: this.props.height,
          src: `https://thbrown.github.io/iframe-proxy/index.html?id=${
            this.props.songLink
          }&start=${this.props.songStart ? this.props.songStart : 0}`,
          allow: "autoplay; encrypted-media",
          sandbox: "allow-scripts allow-same-origin"
        }),
        DOM.div({
          key: "songOverlay" + this.state.key,
          id: "songOverlay",
          onClick: this.handleOverlayClick,
          className: "gone",
          style: {
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 2
          }
        })
      );
    } else {
      return DOM.div(
        {
          id: "song",
          key: "song",
          style: {
            width: this.props.width,
            height: this.props.height,
            textAlign: "center",
            color: "white",
            paddingTop: "8px"
          }
        },
        "No Song"
      );
    }
  }
};

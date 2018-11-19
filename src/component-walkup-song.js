"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");
const css = require("css");

const dialog = require("dialog");
const state = require("state");

const objectMerge = require("../object-merge.js");

module.exports = class WalkupSong extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.key = 0;
    this.state = {
      key: 0
    };

    // Handle walkup song clicks
    this.clicked = false;
    this.monitor = setInterval(
      function() {
        var elem = document.activeElement;
        if (elem && elem.tagName == "IFRAME") {
          console.log("Clicked", this.clicked);
          if (this.clicked) {
            // Reload youtube iframe on second click, assign the iframe a new key to re-render it
            this.clicked = false;
            this.forceRender = true;
            this.setState({
              key: Math.random()
            });
          } else {
            this.clicked = true;
          }
          document.activeElement.blur();
        }
      }.bind(this),
      100
    );
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
          key: "song"
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

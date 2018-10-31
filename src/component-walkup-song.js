'use strict';

const expose = require('./expose');
const DOM = require('react-dom-factories');
const css = require('css');

const dialog = require('dialog');
const state = require('state');

const objectMerge = require('../object-merge.js');

module.exports = class WalkupSong extends expose.Component {
	constructor(props) {
		super(props);
		this.expose();

		// Handle walkup song clicks
		let clicked = {};
		var monitor = setInterval(function () {
			var elem = document.activeElement;
			if (elem && elem.tagName == 'IFRAME') {
				if (clicked[elem.id]) {
					// reload youtube iframe on second click
					let playerSong = document.getElementById('song');
					playerSong.innerHTML = playerSong.innerHTML;
					clicked[elem.id] = false;
				} else {
					clicked[elem.id] = true;
				}
				document.activeElement.blur();
			}
		}, 100);
	}

	render() {
		let currentBatter = this.props.player;
		if (currentBatter.song_link) {
			return DOM.div({
				id: 'song',
				key: 'song'
			}, DOM.iframe({
				id: 'currentBatterSong',
				width: this.props.width,
				height: this.props.height,
				src: `https://thbrown.github.io/iframe-proxy/index.html?id=${currentBatter.song_link}&start=${currentBatter.song_start ? currentBatter.song_start : 0}`,
				allow: 'autoplay; encrypted-media',
				sandbox: 'allow-scripts allow-same-origin',
			}));
		} else {
			return DOM.div({
				id: 'song',
				key: 'song',
				style: {
					width: this.props.width,
					height: this.props.height,
					textAlign: 'center',
					color: 'white',
					paddingTop: '8px'
				}
			}, 'No Song');
		}
	}
};

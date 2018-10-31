'use strict';

const expose = require('./expose');
const DOM = require('react-dom-factories');

const state = require('state');
const results = require('plate-appearance-results');

const LOCATION_DENOMINATOR = 32767;

const normalize = function (x, A, B, C, D) {
	return C + (x - A) * (D - C) / (B - A);
};

module.exports = class CardAtBat extends expose.Component {
	constructor(props) {
		super(props);
		this.expose();
		this.state = {};

		this.handleBackClick = function () {
			if (props.origin === 'stats') {
				expose.set_state('main', {
					page: `/teams/${props.teamId}/stats`
				});
			} else {
				expose.set_state('main', {
					page: `/players`
				});
			}
		};
	}

	renderField() {
		let playerPlateAppearances = [];
		if (this.props.teamId) {
			playerPlateAppearances = state.getPlateAppearancesForPlayerOnTeam(this.props.playerId, this.props.teamId);
		} else {
			playerPlateAppearances = state.getPlateAppearancesForPlayer(this.props.playerId);
		}
		let indicators = [];

		playerPlateAppearances.forEach((value) => {

			let x = -1;
			let y = -1;
			if (value.location) {
				x = value.location.x;
				y = value.location.y;
			}

			let new_x = Math.floor(normalize(x, 0, LOCATION_DENOMINATOR, 0, window.innerWidth));
			let new_y = Math.floor(normalize(y, 0, LOCATION_DENOMINATOR, 0, window.innerWidth));

			if (value.location && x && y) {
				let image = results.getOutResults().includes(value.result) ? '/server/assets/baseball-out.svg' : '/server/assets/baseball-hit.svg';
				let alt = results.getOutResults().includes(value.result) ? 'out' : 'hitg';
				indicators.push(
					DOM.img({
						key: value.id,
						src: image,
						alt: alt,
						style: {
							position: 'absolute',
							width: '20px',
							left: new_x + 'px',
							top: new_y + 'px'
						}
					})
				);
			}
		});

		return DOM.div({
			id: 'ballfield',
			style: {
				position: 'relative',
				borderTop: '1px solid white',
				borderBottom: '1px solid white',
				width: (window.innerWidth - 2) + 'px',
				height: (window.innerWidth - 2) + 'px',
				overflow: 'hidden'
			}
		},
			DOM.img({
				draggable: true,
				src: '/server/assets/ballfield2.png',
				style: {
					width: '100%'
				}
			}),
			indicators
		);
	}

	render() {
		return DOM.div({
			className: 'card',
			style: {
				position: 'relative'
			}
		},
			DOM.div({
				className: 'card-title',
				style: {}
			},
				DOM.img({
					src: '/server/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div({
					className: 'prevent-overflow card-title-text-with-arrow',
				}, state.getPlayer(this.props.playerId).name)
			),
			this.renderField()
		);
	}
};

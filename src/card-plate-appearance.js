'use strict';

const React = require('react');
const expose = require('./expose');
const DOM = require('react-dom-factories');
const css = require('css');
const Draggable = require('react-draggable');
const WalkupSong = require('component-walkup-song');

const dialog = require('dialog');
const state = require('state');
const results = require('plate-appearance-results');


const LOCATION_DENOMINATOR = 32767;

const normalize = function (x, A, B, C, D) {
	return C + ((x - A) * (D - C)) / (B - A);
};

module.exports = class CardPlateAppearance extends expose.Component {
	constructor(props) {
		super(props);
		this.expose();
		this.state = {};

		this.plateAppearance = props.plateAppearance;
		this.isNew = props.isNew;
		// This is the opposite of how we handle the other pages, here we edit the original
		// and replace it on cancel. Other places we edit the copy and commit it on confirm.
		let plateAppearanceCopy = JSON.parse(JSON.stringify(this.plateAppearance));

		let goBack = function () {
			if (props.origin === 'scorer') {
				expose.set_state('main', {
					page: `/teams/${props.team.id}/games/${props.game.id}/scorer`,
				});
			} else {
				expose.set_state('main', {
					page: `/teams/${props.team.id}/games/${props.game.id}/lineup`,
				});
			}
		};

		this.handleBackClick = function () {
			goBack();
		};

		this.handleConfirmClick = function () {
			goBack();
		};

		this.handleCancelClick = function () {
			if (props.isNew) {
				state.removePlateAppearance(props.plateAppearance.id, props.game.id);
			} else {
				state.replacePlateAppearance(props.plateAppearance.id, props.game.id, props.team.id, plateAppearanceCopy);
			}
			goBack();
		};

		this.handleDeleteClick = function () {
			dialog.show_confirm('Are you sure you want to delete this plate appearance?', () => {
				state.removePlateAppearance(props.plateAppearance.id, props.game.id);
				goBack();
			});
		};

		this.handleButtonClick = function (result) {
			state.updatePlateAppearanceResult(props.plateAppearance, result);
		};

		this.handleDragStart = function (ev) { };

		this.handleDrag = function (ev) {
			ev.stopPropagation();
			ev.preventDefault(); // Not working for ios, not needed for anything else
			console.log(ev.defaultPrevented); // This is still false for some reason
		};

		this.handleDragStop = function () {
			//lame way to make this run after the mouseup event
			setTimeout(() => {
				let new_x = (this.mx - 10) / window.innerWidth * LOCATION_DENOMINATOR;
				let new_y = (this.my - 10) / window.innerWidth * LOCATION_DENOMINATOR;
				state.updatePlateAppearanceLocation(props.plateAppearance, [new_x, new_y]);
			}, 1);
		};
	}

	componentDidMount() {
		this.onmouseup = (ev) => {
			let ballfield = document.getElementById('ballfield');

			if (ev.changedTouches) {
				this.mx = ev.changedTouches[0].pageX - ballfield.offsetLeft;
				this.my = ev.changedTouches[0].pageY - ballfield.offsetTop - 48; /* headerSize */
			} else {
				this.mx = ev.clientX - ballfield.offsetLeft;
				this.my = ev.clientY - ballfield.offsetTop - 48; /* headerSize */
			}

			if (this.mx < 0) {
				this.mx = 0;
			}

			if (this.my < 0) {
				this.my = 0;
			}

			// Draging the ball 20px below cancels the location
			if (this.my > parseInt(ballfield.style.height) + 20) {
				this.my = undefined;
				this.mx = undefined;
			} else if (this.my > parseInt(ballfield.style.height)) {
				this.my = parseInt(ballfield.style.height);
			}

			if (this.mx > parseInt(ballfield.style.width)) {
				this.mx = parseInt(ballfield.style.width);
			}
		};

		window.addEventListener('mouseup', this.onmouseup);
		window.addEventListener('touchend', this.onmouseup);
	}

	componentWillUnmount() {
		window.removeEventListener('mouseup', this.onmouseup);
		window.removeEventListener('touchend', this.onmouseup);
	}

	renderButtonList() {
		if (!this.props.game || !this.props.team || !this.props.player || !this.props.plateAppearance) {
			return DOM.div({ className: 'page-error' }, 'PlateAppearance: No game or team or player or PlateAppearance exists.');
		}

		let elems = results.getAllResults().map((result, i) => {
			return DOM.div(
				{
					key: i + ' ' + result,
					className: 'result-button',
					onClick: this.handleButtonClick.bind(this, result),
					style: {
						backgroundColor: this.props.plateAppearance.result === result ? css.colors.SECONDARY : null,
					},
				},
				result,
			);
		});

		return DOM.div(
			{},
			DOM.div(
				{
					style: {
						display: 'flex',
						justifyContent: 'space-around',
						margin: '4px',
					},
				},
				elems.slice(0, elems.length / 2),
			),
			DOM.div(
				{
					style: {
						display: 'flex',
						justifyContent: 'space-around',
						margin: '4px',
					},
				},
				elems.slice(elems.length / 2, elems.length),
			),
		);
	}

	renderField(imageSrcForCurrentPa) {
		let indicators = [];

		// Add the indicators for all plate appearances for this player, the current plate appearance will be dispalyed in a different color
		this.props.plateAppearances.forEach((value) => {
			let x = -1;
			let y = -1;

			if (value.location) {
				x = value.location.x;
				y = value.location.y;
			}

			let new_x = Math.floor(normalize(x, 0, LOCATION_DENOMINATOR, 0, window.innerWidth));
			let new_y = Math.floor(normalize(y, 0, LOCATION_DENOMINATOR, 0, window.innerWidth));

			let imageSrc = value.id === this.props.plateAppearance.id ? imageSrcForCurrentPa : '/server/assets/baseball.svg';
			if (value.location && x && y) {
				indicators.push(
					DOM.img({
						key: value.id,
						src: imageSrc,
						alt: 'previous result',
						style: {
							position: 'absolute',
							width: '20px',
							left: new_x + 'px',
							top: new_y + 'px',
						},
					}),
				);
			}
		});

		return DOM.div(
			{
				id: 'ballfield',
				style: {
					position: 'relative',
					borderTop: '1px solid white',
					borderBottom: '1px solid white',
					width: window.innerWidth - 2 + 'px',
					height: window.innerWidth - 2 + 'px',
					overflow: 'hidden',
				},
			},
			DOM.img({
				draggable: true,
				src: '/server/assets/ballfield2.png',
				alt: 'ballfield',
				style: {
					width: '100%',
				},
			}),
			indicators,
		);
	}

	renderBaseball(imageSrcForCurrentPa) {
		return React.createElement(
			Draggable,
			{
				key: 'baseball',
				axis: 'both',
				allowAnyClick: true,
				position: { x: 0, y: 0 },
				grid: [1, 1],
				onStart: this.handleDragStart.bind(this),
				onDrag: this.handleDrag.bind(this),
				onStop: this.handleDragStop.bind(this),
			},
			DOM.img({
				id: 'baseball',
				draggable: false,
				src: imageSrcForCurrentPa,
				alt: 'ball',
				className: 'plate-appearance-baseball',
				style: {
					touchAction: 'none',
					transform: 'translate(0px, 0px)',
				},
			}),
		);
	}

	renderActionsButtons() {
		let buttons = [];
		let confirm = DOM.img({
			key: 'confirm',
			src: '/server/assets/check.svg',
			onClick: this.handleConfirmClick,
			alt: 'confirm',
			className: 'plate-appearance-card-actions',
		});
		buttons.push(confirm);

		let cancel = DOM.img({
			key: 'cancel',
			src: '/server/assets/cancel.svg',
			onClick: this.handleCancelClick,
			alt: 'cancel',
			className: 'plate-appearance-card-actions',
		});
		buttons.push(cancel);

		if (!this.props.isNew) {
			let trash = DOM.img({
				key: 'delete',
				src: '/server/assets/delete.svg',
				onClick: this.handleDeleteClick,
				alt: 'delete',
				className: 'plate-appearance-card-actions',
			});
			buttons.push(trash);
		}

		return DOM.div(
			{
				id: 'options-buttons',
				style: {
					position: 'relative',
					display: 'flex',
					overflow: 'hidden',
				},
			},
			buttons,
		);
	}

	renderWalkupSong() {
		/*
		return React.createElement(WalkupSong, {
			player: this.props.player,
			width: 48,
			height: 48,
		});
		*/
	}

	render() {
		let imageSrcForCurrentPa = results.getOutResults().includes(this.props.plateAppearance.result)
			? '/server/assets/baseball-out.svg'
			: '/server/assets/baseball-hit.svg';
		return DOM.div(
			{
				className: 'card',
				style: {
					position: 'relative',
				},
			},
			DOM.div(
				{
					className: 'card-title',
					style: {},
				},
				DOM.img({
					src: '/server/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back',
				}),
				DOM.div(
					{
						className: 'prevent-overflow card-title-text-with-arrow',
					},
					this.props.player.name,
				),
			),
			this.renderButtonList(),
			this.renderField(imageSrcForCurrentPa),
			DOM.div(
				{
					style: {
						display: 'flex',
						justifyContent: 'space-between',
					},
				},
				this.renderBaseball(imageSrcForCurrentPa),
				this.renderActionsButtons(),
				this.renderWalkupSong(),
			),
		);
	}
};

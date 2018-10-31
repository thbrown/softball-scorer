'use strict';

const React = require('react');
const DOM = require('react-dom-factories');

module.exports = class ConfirmDialog extends React.Component {
	constructor(props) {
		super(props);

		this.handleConfirmClick = window.current_confirm = () => {
			this.props.hide();
			this.props.on_confirm();
		};

		this.handleCancelClick = window.current_cancel = () => {
			this.props.hide();
			this.props.on_cancel();
		};
	}

	render() {
		return DOM.div({
			className: 'dialog',
		},
			DOM.div({
				className: 'dialog-text',
			}, this.props.text),
			DOM.div({
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				DOM.div({
					className: 'button confirm-button',
					onClick: this.handleConfirmClick
				}, DOM.span({
					className: 'no-select'
				}, 'Yes')),
				DOM.div({
					className: 'button cancel-button',
					onClick: this.handleCancelClick
				}, DOM.span({
					className: 'no-select'
				}, 'Cancel'))
			)
		);
	}
};

'use strict';

const React = require( 'react' );
const css = require( 'css' );
const DOM = require( 'react-dom-factories' );

module.exports = class NotificationDialog extends React.Component {
	constructor( props ){
		super( props );

		this.handleConfirmClick = window.current_confirm = () => {
			this.props.hide();
			this.props.on_confirm();
		};
		window.current_cancel = window.current_confirm;
	}

	render() {
		return DOM.div( {
			className: 'dialog'
		},
			DOM.div( {
				className: 'dialog-text',
			}, this.props.text ),
			DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				DOM.div( {
					className: 'dialog-button confirm-button',
					onClick: this.handleConfirmClick
				}, DOM.span( {
					className: 'no-select'
				}, 'Got it' ) )
			)
		);
	}
};

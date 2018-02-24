'use strict';

const React = require( 'react' );
const css = require( 'css' );
const DOM = require( 'react-dom-factories' );

module.exports = class ConfirmDialog extends React.Component {
	constructor( props ){
		super( props );

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
		return DOM.div( {
			style: {
				position: 'absolute',
				width: 'calc( 100% - 8px )',
				top: '200px',
				backgroundColor: css.colors.PRIMARY_ALT,
				border: '4px solid ' + css.colors.SECONDARY,
				color: css.colors.TEXT_DARK
			}
		},
			DOM.div( {
				style: {
					padding: '5px',
					minHeight: '50px',
					fontSize: '18px'
				}
			}, this.props.text ),
			DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-end'
				}
			},
				DOM.div( {
					className: 'confirm-button',
					onClick: this.handleConfirmClick
				}, DOM.span( {
					className: 'no-select'
				}, 'Yes' ) ),
				DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, DOM.span( {
					className: 'no-select'
				}, 'No' ) )
			)
		);
	}
};

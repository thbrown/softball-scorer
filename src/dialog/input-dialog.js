'use strict';

const React = require( 'react' );
const css = require( 'css' );
const DOM = require( 'react-dom-factories' );

module.exports = class InputDialog extends React.Component {
	constructor( props ){
		super( props );

		let value = '';
		if( this.props.node ){
			value = this.props.node.content;
		} else if( this.props.default_text ){
			value = this.props.default_text;
		}

		this.state = {
			value: value
		};

		this.handleInputChange = ( ev ) => {
			this.setState( {
				value: ev.target.value
			} );
		};
		this.handleConfirmClick = window.current_confirm = () => {
			this.props.hide();
			this.props.on_confirm( this.state.value );
		};

		this.handleCancelClick = window.current_cancel = () => {
			this.props.hide();
		};
	}

	componentDidMount(){
		document.getElementById( 'InputDialog-input' ).focus();
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
					padding: '5px'
				}
			}, 'Provide Input' ),
			DOM.div( {
				style: {
					padding: '5px'
				}
			},
				DOM.textarea( {
					id: 'InputDialog-input',
					onChange: this.handleInputChange,
					value: this.state.value,
					style: {
						whiteSpace: this.props.whiteSpace ? 'pre' : '',
						backgroundColor: css.colors.BG,
						color: css.colors.TEXT_LIGHT,
						width: '100%',
						height: this.props.node ? '300px' : '20px'
					}
				} )
			),
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
				}, 'Okay' ) ),
				DOM.div( {
					className: 'cancel-button',
					onClick: this.handleCancelClick
				}, DOM.span( {
					className: 'no-select'
				}, 'Cancel' ) )
			)
		);
	}
};

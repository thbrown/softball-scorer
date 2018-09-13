'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const dialog = require( 'dialog' );
const state = require( 'state' );

const objectMerge = require( '../object-merge.js' );

module.exports = class CardLoad extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		this.state = {
			loadType: undefined,
		};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: '/menu'
			} );
		};

		this.handleLoadClick = function() {
			let file = document.getElementById('fileData').files[0];
			if(file) {
				var reader = new FileReader();
				let self = this;
				reader.onload = function(e) {
					let parsedData;
					try {
						parsedData = JSON.parse(e.target.result); // TODO: additional verification of object structure
					} catch (exception) {
						dialog.show_notification(
							'There was an error while parsing file input: ' + exception.message
						);
						return;
					}

					if(self.state.loadType === "Merge") {
						let diff = objectMerge.diff(state.getLocalState(), parsedData);
						let stateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
						objectMerge.patch(stateCopy, diff, true, true);
						state.setLocalState(stateCopy);
						dialog.show_notification(
							'This file\'s data has been merged into local data'
						);
						expose.set_state( 'main', {
							page: '/teams'
						} );
					} else if (self.state.loadType === "Overwrite") {
						state.setLocalState(parsedData);
						dialog.show_notification(
							'This file\'s data has been copied to local data'
						);
						expose.set_state( 'main', {
							page: '/teams'
						} );
					} else {
						dialog.show_notification(
							'Please select load type option before clicking "Load"'
						);		
					}

				};
			    reader.readAsText(file);
			} else {
				dialog.show_notification(
					'Please upload a file before clicking "Load"'
				);
			}
		}

		this.handleRadioButtonChange = ( event ) => {
			this.setState( {
				loadType: event.target.value
			});
		};
	}

	renderLoadPage() {

		if(!window.FileReader) return DOM.div( {
			key: 'login',
			id: 'login',
			className: 'list-item',
			onClick: this.handleLoginClick.bind( this ),
			style: {
				backgroundColor: css.colors.BG,
			}
		}, 'Files can not be loaded because FileReader is not supported by this browser.' ); // TODO: load copy and paste text area instead

		return [
			DOM.input( {
				type: 'file',
				name: 'fileData',
				key: 'fieldData',
				id: 'fileData',
				className: 'radio-button', // TODO: Different class name
			} ),
			DOM.div(
				{
					key: 'loadTypeRadio',
					className: 'radio-button',
				},
				DOM.div(
				{
					className: 'radio-button-option',
				},
					DOM.input( {
						type: 'radio',
						name: 'loadType',
						value: 'Merge',
						id: 'mergeChoice',
						onChange: this.handleRadioButtonChange,
					}),
					DOM.label( {
						htmlFor: 'mergeChoice',
					}, 'Merge')
				),
				DOM.div(
				{
					className: 'radio-button-option',
				},
					DOM.input( {
						type: 'radio',
						name: 'loadType',
						value: 'Overwrite',
						id: 'overwriteChoice',
						onChange: this.handleRadioButtonChange,
					}),
					DOM.label( {
						htmlFor: 'overwriteChoice',
					}, 'Overwrite')
				)
			),
			DOM.div( {
				key: 'load',
				id: 'load',
				className: 'button confirm-button',
				onClick: this.handleLoadClick.bind( this ),
				style: {
					backgroundColor: css.colors.BG,
				}
			}, 'Load' )
		];
	}

	render() {
		return DOM.div( {
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: '/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					className: 'card-title-text-with-arrow',
				}, 'Load from File' )
			),
			this.renderLoadPage()
		);
	}
};

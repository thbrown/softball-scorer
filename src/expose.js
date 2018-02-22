'use strict';

const React = require( 'react' );

module.exports.mixin = function( id ) {
	return {
		componentWillMount: function() {
			if( id ) {
				module.exports.states[ id ] = {
					setState: function( state ) {
						this.setState( state );
					}.bind( this ),
					getState: function() {
						return this.state;
					}.bind( this )
				};
			} else {
				console.error( 'Exposed states must have a valid id.', this.props, this.state );
			}
		},
		componentWillUnmount: function() {
			if( id ) {
				delete module.exports.states[ id ];
			}
		}
	};
};

module.exports.Component = class ExposeComponent extends React.Component {
	constructor( props ){
		super( props );
		this._expose_id = null;
	}

	expose( id ){
		this._expose_id = id;
		if( module.exports.states[ this._expose_id ] ){
			console.error( 'Error, expose component exposed an id that already exists', this.expose_id, this.props );
		}
	}

	componentWillMount(){
		if( this._expose_id ) {
			module.exports.states[ this._expose_id ] = {
				setState: ( state ) => {
					this.setState( state );
				},
				getState: () => {
					return this.state;
				}
			};
		} else {
			console.error( 'Exposed states must have a valid id. Set it with "this.expose( {id} )"', this.props, this.state );
		}
	}

	componentWillUnmount() {
		if( this._expose_id ) {
			delete module.exports.states[ this._expose_id ];
		}
	}
};

module.exports.states = {};
module.exports.set_state = function( id, state ) {
	if( module.exports.states[ id ] ) {
		module.exports.states[ id ].setState( state );
	}
};
module.exports.get_state = function( id ){
	if( module.exports.states[ id ] ) {
		return module.exports.states[ id ].getState();
	} else {
		return {};
	}
};

import React from 'react';

let expose_ctr = 0;

export const states = {};
export function mixin(id) {
  return {
    componentWillMount: function() {
      if (id) {
        states[id] = {
          setState: function(state) {
            this.setState(state);
          }.bind(this),
          getState: function() {
            return this.state;
          }.bind(this),
        };
      } else {
        console.error(
          'Exposed states must have a valid id.',
          this.props,
          this.state
        );
      }
    },
    componentWillUnmount: function() {
      if (id) {
        delete states[id];
      }
    },
  };
}

export class Component extends React.Component {
  constructor(props) {
    super(props);
    this._expose_id = null;
  }

  exposeOverwrite(id) {
    if (!id) {
      this._expose_id = 'state' + expose_ctr;
      expose_ctr++;
    } else {
      this._expose_id = id;
    }
  }

  expose(id) {
    if (!id) {
      this._expose_id = 'state' + expose_ctr;
      expose_ctr++;
    } else {
      this._expose_id = id;
    }
    if (states[this._expose_id]) {
      console.error(
        'Error, expose component exposed an id that already exists',
        this._expose_id,
        this.props
      );
    }
  }

  componentWillMount() {
    if (this._expose_id) {
      states[this._expose_id] = {
        setState: state => {
          this.setState(state);
        },
        getState: () => {
          return this.state;
        },
      };
    } else {
      console.error(
        'Exposed states must have a valid id. Set it with "this.expose( {id} )"',
        this.props,
        this.state
      );
    }
  }

  componentWillUnmount() {
    if (this._expose_id) {
      delete states[this._expose_id];
    }
  }
}

export const set_state = function(id, state) {
  if (states[id]) {
    states[id].setState(state);
  }
};
export const get_state = function(id) {
  if (states[id]) {
    return states[id].getState();
  } else {
    return {};
  }
};

const exp = {
  set_state,
  get_state,
  Component,
  mixin,
  states,
};

export default exp;
global.expose = exp;

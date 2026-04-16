import React from 'react';

let expose_ctr = 0;

interface ExposedEntry {
  setState: (state: Record<string, unknown>) => void;
  getState: () => Record<string, unknown>;
}

export const states: Record<string, ExposedEntry> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Component<P = any, S = any> extends React.Component<P, S> {
  _expose_id: string | null;

  constructor(props: P) {
    super(props);
    this._expose_id = null;
  }

  exposeOverwrite(id?: string) {
    if (!id) {
      this._expose_id = 'state' + expose_ctr;
      expose_ctr++;
    } else {
      this._expose_id = id;
    }
  }

  expose(id?: string) {
    if (!id) {
      this._expose_id = 'state' + expose_ctr;
      expose_ctr++;
    } else {
      this._expose_id = id;
    }
    if (states[this._expose_id] && process.env.NODE_ENV !== 'test') {
      console.error(
        'Error, expose component exposed an id that already exists',
        this._expose_id,
        this.props
      );
    }
  }

  UNSAFE_componentWillMount() {
    if (this._expose_id) {
      states[this._expose_id] = {
        setState: (state) => {
          this.setState(state as S);
        },
        getState: () => {
          return this.state as Record<string, unknown>;
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

export const set_state = function (id: string, state: Record<string, unknown>) {
  if (states[id]) {
    states[id].setState(state);
  }
};
export const get_state = function (id: string): Record<string, unknown> {
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
  states,
};

export default exp;
(window as unknown as Record<string, unknown>).expose = exp;

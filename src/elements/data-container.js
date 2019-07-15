import React, { Component } from 'react';
import { request } from 'network';

export default class DataContainer extends Component {
  state = {
    data: null,
    loading: true,
    ready: false,
    error: false,
  };

  async requestData() {
    if (!this.props.url) {
      return;
    }

    try {
      const { body, status } = await request(
        'GET',
        this.props.url,
        this.props.body
      );

      if (status === -1) {
        this.setState({
          data: {},
          loading: false,
          ready: true,
          error: body.message,
        });
        this.props.onRequestError(new Error(body.message));
      } else {
        this.setState({
          data: body || {},
          loading: false,
          ready: true,
        });
        this.props.onRequestComplete(body || {});
      }
    } catch (e) {
      this.setState({
        data: {},
        loading: false,
        ready: true,
        error: e,
      });
      this.props.onRequestError(e);
    }
  }

  componentDidMount() {
    this.requestData();
  }

  render() {
    return <>{this.props.children({ ...this.state })}</>;
  }
}

DataContainer.defaultProps = {
  url: '',
  onRequestComplete: function() {},
  onRequestError: function() {},
};

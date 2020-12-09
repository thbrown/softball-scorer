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
      const res = await request('GET', this.props.url, this.props.body);
      const { body, status } = res;

      if (status === 200) {
        this.setState({
          data: body || {},
          loading: false,
          ready: true,
        });
        this.props.onRequestComplete(body || {});
      } else {
        const error = body?.message || 'Bad status code: ' + status;
        this.setState({
          data: {},
          loading: false,
          ready: true,
          error,
        });
        this.props.onRequestError(new Error(error));
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
  onRequestComplete: function () {},
  onRequestError: function () {},
};

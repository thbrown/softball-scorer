import React, { Component } from 'react';
import { request } from 'network';

interface DataContainerProps {
  url?: string;
  body?: unknown;
  onRequestComplete?: (data: unknown) => void;
  onRequestError?: (error: unknown) => void;
  children: (state: DataContainerState) => React.ReactNode;
}

interface DataContainerState {
  data: unknown;
  loading: boolean;
  ready: boolean;
  error: unknown;
}

export default class DataContainer extends Component<DataContainerProps, DataContainerState> {
  static defaultProps = {
    url: '',
    onRequestComplete: function () {},
    onRequestError: function () {},
  };

  state: DataContainerState = {
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
      const res = await request('GET', this.props.url, this.props.body as string | undefined);
      const { body, status } = res;

      if (status === 200) {
        this.setState({
          data: body || {},
          loading: false,
          ready: true,
        });
        this.props.onRequestComplete?.(body || {});
      } else {
        const error = String((body as Record<string, unknown>)?.message || 'Bad status code: ' + status);
        this.setState({
          data: {},
          loading: false,
          ready: true,
          error,
        });
        this.props.onRequestError?.(new Error(error));
      }
    } catch (e) {
      this.setState({
        data: {},
        loading: false,
        ready: true,
        error: e,
      });
      this.props.onRequestError?.(e);
    }
  }

  componentDidMount() {
    this.requestData();
  }

  render() {
    return <>{this.props.children({ ...this.state })}</>;
  }
}

import React from 'react';

export default class InputDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleInputChange = (ev) => {
      this.setState({
        value: ev.target.value,
      });
    };

    this.state = {
      value: undefined,
    };

    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm(this.state.value);
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
      this.props.on_cancel();
    };
  }

  componentDidMount() {
    document.getElementById('InputDialog-input').focus();
    if (this.props.startingValue) {
      document.getElementById('InputDialog-input').value =
        this.props.startingValue;
      this.setState({
        value: this.props.startingValue,
      });
    }
  }

  getNodeOrDefaultText() {
    if (this.props.node) {
      return this.props.node.content;
    } else if (this.props.default_text) {
      return this.props.default_text;
    }
    return undefined;
  }

  render() {
    return (
      <div className="dialog">
        <div className="dialog-text">{this.getNodeOrDefaultText()}</div>
        <textarea
          id="InputDialog-input"
          onChange={this.handleInputChange}
          placeholder={this.getNodeOrDefaultText()}
          className="dialog-input-box"
          style={{
            whiteSpace: this.props.whiteSpace ? 'pre' : '',
            height: this.props.node ? '360px' : '36px',
            lineHeight: this.props.node ? undefined : '36px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            className="button primary-button"
            onClick={this.handleConfirmClick}
          >
            <span className="no-select">Submit</span>
          </div>
          <div
            className="button tertiary-button"
            onClick={this.handleCancelClick}
          >
            <span className="no-select">Cancel</span>
          </div>
        </div>
      </div>
    );
  }
}

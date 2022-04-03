import React from 'react';

export default class ConfirmDialog extends React.Component {
  constructor(props) {
    super(props);

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
    return (
      <div>
        <div>
          <div className="dialog">
            <div className="dialog-text">{this.props.text}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                id="dialog-confirm"
                className="button primary-button"
                onClick={this.handleConfirmClick}
              >
                <span className="no-select">Yes</span>
              </div>
              <div
                id="dialog-cancel"
                className="button cancel-button"
                onClick={this.handleCancelClick}
              >
                <span className="no-select">Cancel</span>
              </div>
            </div>
          </div>
        </div>
        <div className="overlay" />
      </div>
    );
  }
}

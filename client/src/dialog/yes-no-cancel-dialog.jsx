import React from 'react';

export default class YesNoCancelDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleYesClick = window.current_yes = () => {
      this.props.hide();
      this.props.on_yes();
    };

    this.handleNoClick = window.current_no = () => {
      this.props.hide();
      this.props.on_no();
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
      this.props.on_cancel();
    };
  }

  render() {
    return (
      <div className="dialog">
        <div className="dialog-text">{this.props.text}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className="button primary-button" onClick={this.handleYesClick}>
            <span className="no-select">Yes</span>
          </div>
          <div className="button primary-button" onClick={this.handleNoClick}>
            <span className="no-select">No</span>
          </div>
          <div
            className="button cancel-button"
            onClick={this.handleCancelClick}
          >
            <span className="no-select">Cancel</span>
          </div>
        </div>
      </div>
    );
  }
}

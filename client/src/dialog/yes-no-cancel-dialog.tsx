import React from 'react';

declare global {
  interface Window {
    current_yes?: () => void;
    current_no?: () => void;
  }
}

interface YesNoCancelDialogProps {
  text: React.ReactNode;
  hide: () => void;
  on_yes: () => void;
  on_no: () => void;
  on_cancel: () => void;
}

export default class YesNoCancelDialog extends React.Component<YesNoCancelDialogProps> {
  handleYesClick: () => void;
  handleNoClick: () => void;
  handleCancelClick: () => void;

  constructor(props: YesNoCancelDialogProps) {
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

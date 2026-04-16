import React from 'react';

interface NotificationDialogProps {
  text: React.ReactNode;
  hide: () => void;
  on_confirm: () => void;
}

export default class NotificationDialog extends React.Component<NotificationDialogProps> {
  handleConfirmClick: () => void;

  constructor(props: NotificationDialogProps) {
    super(props);

    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm();
    };
    window.current_cancel = window.current_confirm;
  }

  render() {
    return (
      <div className="dialog">
        <div
          className="dialog-text"
          style={{ maxHeight: '70vh', overflow: 'auto' }}
        >
          {this.props.text}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            className="button primary-button"
            onClick={this.handleConfirmClick}
          >
            <span className="no-select">Got it</span>
          </div>
        </div>
      </div>
    );
  }
}

import React from 'react';

interface InputDialogProps {
  hide: () => void;
  on_confirm: (value: string) => void;
  on_cancel: () => void;
  node?: { content: React.ReactNode };
  default_text?: string;
  startingValue?: string;
  whiteSpace?: boolean;
}

interface InputDialogState {
  value: string | undefined;
}

export default class InputDialog extends React.Component<InputDialogProps, InputDialogState> {
  handleInputChange: (ev: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleConfirmClick: () => void;
  handleCancelClick: () => void;

  constructor(props: InputDialogProps) {
    super(props);

    this.handleInputChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
      this.setState({
        value: ev.target.value,
      });
    };

    this.state = {
      value: undefined,
    };

    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm(this.state.value ?? '');
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
      this.props.on_cancel();
    };
  }

  componentDidMount() {
    const el = document.getElementById('InputDialog-input') as HTMLInputElement | null;
    if (el) {
      el.focus();
      if (this.props.startingValue) {
        el.value = this.props.startingValue;
        this.setState({
          value: this.props.startingValue,
        });
      }
    }
  }

  getNodeOrDefaultText(): React.ReactNode | undefined {
    if (this.props.node) {
      return this.props.node.content;
    } else if (this.props.default_text) {
      return this.props.default_text;
    }
    return undefined;
  }

  render() {
    const nodeOrDefault = this.getNodeOrDefaultText();
    return (
      <div className="dialog">
        <div className="dialog-text">{nodeOrDefault}</div>
        <textarea
          id="InputDialog-input"
          onChange={this.handleInputChange}
          placeholder={typeof nodeOrDefault === 'string' ? nodeOrDefault : undefined}
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

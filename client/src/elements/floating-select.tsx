import React from 'react';

interface SelectValue {
  label: string;
  value: string | number;
  key?: string;
}

interface FloatingSelectProps {
  selectId?: string;
  initialValue?: string | number;
  label?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  values?: SelectValue[];
  fullWidth?: boolean;
  selectStyle?: React.CSSProperties;
}

interface FloatingSelectState {
  value: string | number | undefined;
}

export default class FloatingSelect extends React.Component<FloatingSelectProps, FloatingSelectState> {
  static defaultProps = {
    selectId: null,
    initialValue: '',
    label: '',
    disabled: false,
    onChange: () => {},
    values: [],
    fullWidth: false,
  };

  constructor(props: FloatingSelectProps) {
    super(props);
    this.state = {
      value: props.initialValue || props.values?.[0]?.value,
    };
  }

  render() {
    const options = (this.props.values ?? []).map((valueEntry) => {
      let { label, value, key } = valueEntry;

      return (
        <option value={value} key={key ?? value}>
          {label}
        </option>
      );
    });
    if (!this.state.value) {
      options.push(
        <option disabled value="unknown-option" key="unknown-option">
          {'-- select an option --'}
        </option>
      );
    }

    return (
      <div className={'float-container active'}>
        <label>{this.props.label}</label>
        <select
          id={this.props.selectId}
          className="select"
          disabled={this.props.disabled}
          value={this.state.value ?? 'unknown-option'}
          style={{
            width: this.props.fullWidth ? '100%' : undefined,
            ...(this.props.selectStyle ?? {}),
          }}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            if (this.props.onChange) {
              this.props.onChange(e.target.value);
            }
            this.setState({ value: e.target.value });
          }}
        >
          {options}
        </select>
      </div>
    );
  }
}

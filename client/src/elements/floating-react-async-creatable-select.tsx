import React from 'react';
import AsyncCreatableSelect from 'react-select/async-creatable';

interface SelectOption {
  label: string;
  value: string | undefined;
  [key: string]: unknown;
}

interface FloatingReactAsyncCreatableSelectProps {
  defaultValue?: SelectOption | string;
  label?: string;
  loadOptions?: (inputValue: string) => Promise<SelectOption[]>;
  formatOptionLabel?: (
    option: SelectOption,
    context: { context: string }
  ) => JSX.Element;
  onChange?: (option: SelectOption) => void;
  isValidNewOption?: () => boolean;
}

interface FloatingReactAsyncCreatableSelectState {
  value: SelectOption | string;
  active: boolean;
}

export default class FloatingReactAsyncCreatableSelect extends React.Component<
  FloatingReactAsyncCreatableSelectProps,
  FloatingReactAsyncCreatableSelectState
> {
  static defaultProps = {
    defaultValue: '',
    label: '',
    onChange: () => {},
    formatOptionLabel: undefined,
  };

  style: Record<string, (base: Record<string, unknown>) => Record<string, unknown>>;

  constructor(props: FloatingReactAsyncCreatableSelectProps) {
    super(props);
    this.state = {
      value: this.props.defaultValue ?? '',
      active: !!(typeof this.props.defaultValue === 'object' && this.props.defaultValue.value),
    };

    this.style = {
      control: (base: Record<string, unknown>) => ({
        ...base,
        border: 0,
        boxShadow: 'none',
        padding: 0,
        marginLeft: '-2px',
        fontSize: '16px',
      }),
      container: (base) => ({
        ...base,
        padding: 0,
      }),
      placeholder: (base: Record<string, unknown>) => ({
        ...base,
        margin: 0,
      }),
      indicatorSeparator: (base: Record<string, unknown>) => ({
        ...base,
        display: 'none',
      }),
      indicatorContainer: (base: Record<string, unknown>) => ({
        ...base,
        display: 'none', // This isn't being applied for some reason, resorting to css file styling
      }),
      menu: (base: Record<string, unknown>) => ({
        ...base,
        marginTop: '6px',
        marginLeft: '-9px',
        width: 'calc(100% + 18px)',
      }),
      singleValue: (base: Record<string, unknown>) => ({
        ...base,
        marginLeft: '3px',
        marginTop: '4px',
      }),
      input: (base: Record<string, unknown>) => ({
        ...base,
        width: '100%',
      }),
    };
  }

  render() {
    return (
      <div className={'float-container' + (this.state.active ? ' active' : '')}>
        <label style={{ zIndex: 1 }}>{this.props.label}</label>
        <AsyncCreatableSelect
          className="floating-react-select"
          cacheOptions
          defaultOptions
          defaultValue={this.props.defaultValue}
          value={this.state.value}
          loadOptions={this.props.loadOptions}
          formatOptionLabel={this.props.formatOptionLabel}
          onChange={this.props.onChange}
          onFocus={() => {
            this.setState({ active: true });
          }}
          onBlur={() => {
            const value = this.state.value;
            if (typeof value === 'object' && !value.value) {
              this.setState({ active: false });
            } else if (!value) {
              this.setState({ active: false });
            }
          }}
          isClearable
          styles={this.style}
          placeholder=""
          noOptionsMessage={() => null}
          isValidNewOption={this.props.isValidNewOption}
        />
      </div>
    );
  }
}

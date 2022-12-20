import React from 'react';
import FloatingInput from 'elements/floating-input';
import FloatingSelect from 'elements/floating-select';
import Loading from '../elements/loading';
import dialog from 'dialog';
import state from 'state';
import IconButton from './icon-button';

export default class OptimizerCustomOptions extends React.Component {
  constructor(props) {
    super(props);

    this.onChange = function (longLabel) {
      return function (value) {
        this.props.onChange();
        state.setOptimizationCustomOptionsDataField(
          this.props.optimizationId,
          longLabel,
          value
        );
      }.bind(this);
    }.bind(this);

    this.onChangeLiteral = function (longLabel, value) {
      return function () {
        this.props.onChange();
        state.setOptimizationCustomOptionsDataField(
          this.props.optimizationId,
          longLabel,
          value
        );
      }.bind(this);
    }.bind(this);

    this.getHelpFunction = function (helpTitle, helpBody) {
      return function () {
        dialog.show_notification(
          <div>
            <b style={{ textTransform: 'capitalize' }}>{helpTitle}</b>
            <div style={{ margin: '1rem' }}>{helpBody}</div>
          </div>,
          undefined
        );
      };
    };
  }

  render() {
    const selectedOptimizerCustomOptions = this.props.optimizerData
      ? this.props.optimizerData[this.props.selectedOptimizerId]?.options
      : null;

    // If an optimizer has been selected and optimizer data is present, build the
    // html input elements for the selected optimizer's custom options
    let inputElements = [];
    for (const key in selectedOptimizerCustomOptions) {
      let value = selectedOptimizerCustomOptions[key];

      // Some fields should not appear in the UI
      if (value.uiVisibility === 'HIDDEN') {
        continue;
      }

      let currentValue = state.getOptimizationCustomOptionsDataField(
        this.props.optimizationId,
        value.longLabel
      );
      currentValue =
        currentValue === undefined ? value.defaultValue : currentValue;

      if (value.type === 'String') {
        inputElements.push(
          <div
            style={{
              display: 'flex',
              textTransform: 'capitalize',
              alignItems: 'flex-start',
            }}
            key={value.longLabel}
          >
            <FloatingInput
              inputId={value.longLabel}
              maxLength="50"
              label={value.longLabel}
              onChange={this.onChange(value.longLabel)}
              defaultValue={currentValue}
              disabled={this.props.disabled}
              fullWidth
            />
            <IconButton
              alt="help"
              className="help-icon"
              src="/assets/help.svg"
              onClick={this.getHelpFunction(value.longLabel, value.description)}
              invert
            />
          </div>
        );
      } else if (value.type === 'Boolean') {
        // TODO: White -> color: $css.colors.TEXT_DARK;
        inputElements.push(
          <div
            style={{
              display: 'flex',
              textTransform: 'capitalize',
              alignItems: 'flex-start',
              width: '100%',
            }}
            key={value.longLabel}
          >
            <div className="radio-button" style={{ width: '100%' }}>
              <fieldset
                className="group"
                style={{ color: 'black', width: '100%' }}
              >
                <legend className="group-legend">{value.longLabel}</legend>
                <div className="radio-button-option">
                  <input
                    type="radio"
                    name={value.longLabel}
                    value={true}
                    id={'id-true-' + value.longLabel}
                    onClick={this.onChangeLiteral(value.longLabel, true)}
                    defaultChecked={currentValue === true}
                    disabled={this.props.disabled}
                  />
                  <label htmlFor={'id-true-' + value.longLabel}>True</label>
                </div>
                <div className="radio-button-option">
                  <input
                    type="radio"
                    name={value.longLabel}
                    value={false}
                    id={'id-false-' + value.longLabel}
                    onClick={this.onChangeLiteral(value.longLabel, false)}
                    defaultChecked={currentValue !== true}
                    disabled={this.props.disabled}
                  />
                  <label htmlFor={'id-false-' + value.longLabel}>False</label>
                </div>
              </fieldset>
            </div>
            <IconButton
              alt="help"
              className="help-icon"
              src="/assets/help.svg"
              onClick={this.getHelpFunction(value.longLabel, value.description)}
              invert
            />
          </div>
        );
      } else if (value.type === 'Enumeration') {
        // Build values object
        const options = [];
        for (const index in value.values) {
          options.push({
            label: value.values[index],
            value: value.values[index],
          });
        }

        inputElements.push(
          <div
            style={{ display: 'flex', textTransform: 'capitalize' }}
            key={value.longLabel}
          >
            <FloatingSelect
              selectId={key}
              label={value.longLabel}
              initialValue={
                currentValue === undefined ? value.defaultValue : currentValue
              }
              onChange={this.onChange(value.longLabel)}
              values={options}
              disabled={this.props.disabled}
            ></FloatingSelect>
            <IconButton
              alt="help"
              className="help-icon"
              src="/assets/help.svg"
              onClick={this.getHelpFunction(value.longLabel, value.description)}
              invert
            />
          </div>
        );
      } else if (value.type === 'Number') {
        inputElements.push(
          <div
            style={{
              display: 'flex',
              textTransform: 'capitalize',
              alignItems: 'flex-start',
            }}
            key={value.longLabel}
          >
            <FloatingInput
              type="number"
              inputId={key}
              max={value.max}
              min={value.min}
              step={value.step}
              label={value.longLabel}
              onChange={this.onChange(value.longLabel)}
              defaultValue={currentValue}
              disabled={this.props.disabled}
            />

            <IconButton
              alt="help"
              className="help-icon"
              src="/assets/help.svg"
              onClick={this.getHelpFunction(value.longLabel, value.description)}
              invert
            />
          </div>
        );
      }
    }

    // Decide which content should be rendered
    let content = '';
    if (!this.props.optimizerData) {
      // Show the loading page if there is no optimizer data
      content = (
        <div style={{ height: '100px' }}>
          <div className={`loading`}>
            <div id="loading" style={{ opacity: 0.9, zIndex: 1 }}>
              <Loading style={{ width: '85px', height: '85px' }}></Loading>
            </div>
            <div style={{ height: '103px' }}></div>
          </div>
        </div>
      );
    } else {
      // Otherwise show the selected optimizer's custom options
      content = <div>{inputElements}</div>;
    }

    return <div className="loading-container">{content}</div>;
  }
}

import React from 'react';
import FloatingInput from 'elements/floating-input';
import FloatingSelect from 'elements/floating-select';
import Loading from '../elements/loading';
import dialog from 'dialog';

export default class OptimizerCustomOptions extends React.Component {
  constructor(props) {
    super(props);

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
    //selectedOptimizerId={this.state.selectedOptimizerId}
    //optimizerData={this.state.optimizerData}
    //optionsData={parsedCustomData}
    let inputElements = [];
    for (const key in this.props.options) {
      let value = this.props.options[key];
      console.log(value.type);

      // Some fields should not appear in the UI
      if (value.uiVisibility === 'HIDDEN') {
        continue;
      }

      if (value.type === 'String') {
        inputElements.push(
          <div style={{ display: 'flex', textTransform: 'capitalize' }}>
            <FloatingInput
              inputId={key}
              maxLength="50"
              label={value.longLabel}
              onChange={function (v) {
                console.log(v);
              }}
              defaultValue={value.defaultValue}
            />
            <div className="icon-button" style={{ backgroundColor: 'black' }}>
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.getHelpFunction(
                  value.longLabel,
                  value.description
                )}
              />
            </div>
          </div>
        );
      } else if (value.type === 'Boolean') {
        // TODO: White -> color: $css.colors.TEXT_DARK;
        inputElements.push(
          <div
            style={{
              display: 'flex',
              textTransform: 'capitalize',
              width: '100%',
            }}
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
                    value="true"
                    id={'id-true-' + value.longLabel}
                    onChange={this.handleGenderChange}
                  />
                  <label htmlFor={'id-true-' + value.longLabel}>True</label>
                </div>
                <div className="radio-button-option">
                  <input
                    type="radio"
                    name={value.longLabel}
                    value="false"
                    id={'id-false-' + value.longLabel}
                    onChange={this.handleGenderChange}
                    checked={true}
                  />
                  <label htmlFor={'id-false-' + value.longLabel}>False</label>
                </div>
              </fieldset>
            </div>
            <div className="icon-button" style={{ backgroundColor: 'black' }}>
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.getHelpFunction(
                  value.longLabel,
                  value.description
                )}
              />
            </div>
          </div>
        );
      } else if (value.type === 'Enumeration') {
        // Build values object
        let options = {};
        for (let index in value.values) {
          options[value.values[index]] = value.values[index];
        }
        console.log('Options', options, value.values);

        inputElements.push(
          <div style={{ display: 'flex', textTransform: 'capitalize' }}>
            <FloatingSelect
              selectId={key}
              label={value.longLabel}
              //initialValue={this.props.game.lineupType || 2}
              onChange={function (value) {
                console.log(value);
              }}
              values={options}
            ></FloatingSelect>
            <div className="icon-button" style={{ backgroundColor: 'black' }}>
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.getHelpFunction(
                  value.longLabel,
                  value.description
                )}
              />
            </div>
          </div>
        );
      } else if (value.type === 'Number') {
        inputElements.push(
          <div style={{ display: 'flex', textTransform: 'capitalize' }}>
            <FloatingInput
              type="number"
              inputId={key}
              max={value.max}
              min={value.min}
              step={value.step}
              label={value.longLabel}
              onChange={function (v) {
                console.log(v);
              }}
              defaultValue={value.defaultValue}
            />
            <div className="icon-button" style={{ backgroundColor: 'black' }}>
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.getHelpFunction(
                  value.longLabel,
                  value.description
                )}
              />
            </div>
          </div>
        );
      }
    }
    JSON.stringify(this.props.options, null, 2);

    return (
      <div class="loading-container">
        <div
          className={`loading ${this.props.options ? 'gone' : ''}`}
          id="loading"
          style={{ backgroundColor: 'gray', opacity: 0.9, zIndex: 1 }}
        >
          <Loading style={{ width: '85px', height: '85px' }}></Loading>
        </div>
        <div
          className={`${this.props.options ? 'gone' : ''}`}
          style={{ height: '103px' }}
        ></div>
        <div>{inputElements}</div>
      </div>
    );
    /*}
        <FloatingInput
          key="iterations"
          inputId="iterations"
          maxLength="12"
          label="Iterations"
          onChange={this.onOptionsChange.bind(this, 'iterations')}
          type="number"
          defaultValue={parsedCustomData.iterations}
          disabled={
            this.optimization.status !==
            state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
          }
        />
        <FloatingInput
          key="innings"
          inputId="innings"
          label="Innings to Simulate"
          onChange={this.onOptionsChange.bind(this, 'innings')}
          maxLength="2"
          type="number"
          defaultValue={parsedCustomData.innings}
          disabled={
            this.optimization.status !==
            state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
          }
        />
        */
  }
}

import React from 'react';
import FloatingSelect from 'elements/floating-select';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import Loading from '../elements/loading';

export default class OptimizerStandardOptions extends React.Component {
  constructor(props) {
    super(props);

    this.handleOptimizerHelp = function () {
      dialog.show_notification(
        <div>
          <b>Optimizers</b>
          <div style={{ margin: '1rem' }}>
            The optimizer is the algorithm used to select the optimal the
            batting lineup. By default, the app intelligently selects lineups
            and simulates millions of games to try to select the highest scoring
            one. There are lots of other ways to choose the optimal lineup and
            there often exists a trade off between solution quality vs speed.
            You can view and select other optimizers by clicking the search icon
            to the right of the this help button.
          </div>
          <div></div>
          <b>{this.selectedOptimizerName}</b>
          <div style={{ margin: '1rem' }}>
            {this.selectedOptimizerDescription}
          </div>
        </div>,
        undefined
      );
    }.bind(this);

    this.handleOptimizerSearch = function () {
      setRoute(`/account/select-optimizers`);
    };

    this.setup = function () {}.bind(this);
  }

  render() {
    // Process info about all available optimizers
    this.options = {};
    for (const id in this.props.optimizerData) {
      this.options[id] = this.props.optimizerData[id].name;
    }

    // Process info about the selected optimizer
    this.selectedOptimizerName = '';
    this.selectedOptimizerDescription =
      'No optimizer selected. To see a description for a specific optimizer please select one from the drop down menu.';
    if (this.props.selectedOptimizerId) {
      let id = this.props.selectedOptimizerId;
      this.selectedOptimizerName = this.props.optimizerData[id].name;
      this.selectedOptimizerDescription = this.props.optimizerData[
        id
      ].shortDescription;
    }

    return (
      <div className="loading-container">
        <div
          className={`loading ${this.props.optimizerData ? 'gone' : ''}`}
          id="loading"
          style={{ backgroundColor: 'gray', opacity: 0.9, zIndex: 1 }}
        >
          <Loading style={{ width: '85px', height: '85px' }}></Loading>
        </div>
        <div style={{ display: 'flex' }}>
          <FloatingSelect
            selectId="lineupType"
            label="Lineup Type"
            initialValue={this.props.lineupType}
            onChange={this.props.onOptionChange}
            values={{
              1: 'Normal',
              2: 'Alternating Gender',
              3: 'No Consecutive Females',
            }}
            disabled={this.props.disabled}
          />
          <div className="icon-button" style={{ backgroundColor: 'black' }}>
            <img
              alt="help"
              className="help-icon"
              src="/server/assets/help.svg"
              onClick={this.handleOptimizerHelp}
            />
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <FloatingSelect
            selectId="optimizer"
            label="Optimizer"
            initialValue={this.props.optimizer}
            onChange={this.props.onOptimizerChange}
            values={this.options}
            disabled={this.props.disabled}
          />
          <div className="icon-button" style={{ backgroundColor: 'black' }}>
            <img
              alt="help"
              className="help-icon"
              src="/server/assets/search.svg"
              onClick={this.handleOptimizerSearch}
            />
          </div>
        </div>
      </div>
    );
  }
}

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
            The optimizer is the algorithm used to select the optimal batting
            lineup. By default, the app tests all possible lineups and simulates
            lots of games to try to select the highest scoring one. This can
            take a long time. There are lots of other ways to choose the optimal
            lineup and there often exists a trade off between solution quality
            vs speed. You can view and select other optimizers by clicking the
            search icon to the right of the this help button.
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

    this.onLineupChange = function (value) {
      state.setOptimizationField(
        this.props.optimizationId,
        'lineupType',
        value
      );
    }.bind(this);

    this.onOptimizerChange = function (newOptimizerId) {
      state.setOptimizationField(
        this.props.optimizationId,
        'optimizerType',
        newOptimizerId
      );
    }.bind(this);

    this.handleOptimizerSearch = function () {
      setRoute(`/account/select-optimizers`);
    };

    this.setup = function () {}.bind(this);
  }

  render() {
    // Process info about all available optimizers
    let optimizerOptions = {};
    for (const id in this.props.optimizerData) {
      optimizerOptions[id] = this.props.optimizerData[id].name;
    }

    // Process info about the selected optimizer
    this.selectedOptimizerName = '';
    this.selectedOptimizerDescription =
      'No optimizer selected. To see a description for a specific optimizer please select one from the drop down menu.';
    if (this.props.optimizerData) {
      let id = this.props.selectedOptimizerId;
      this.selectedOptimizerName = this.props.optimizerData[id].name;
      this.selectedOptimizerDescription = this.props.optimizerData[
        id
      ].shortDescription;
    }

    // Main content
    let content = (
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
            onChange={this.onLineupChange}
            values={{
              0: 'Normal',
              1: 'Alternating Gender',
              2: 'No Consecutive Females',
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
            initialValue={this.props.selectedOptimizerId}
            onChange={this.onOptimizerChange}
            values={optimizerOptions}
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

    // Decide if we should show the loading component or the main content
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
    }

    return <div class="loading-container">{content}</div>;
  }
}

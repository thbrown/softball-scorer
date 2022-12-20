import React from 'react';
import FloatingSelect from 'elements/floating-select';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import Loading from '../elements/loading';
import state from 'state';
import IconButton from './icon-button';
import { showLineupTypeHelp } from 'utils/help-functions';

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
            and optimization execution time. You can view and select other
            optimizers by clicking the search icon to the right of the this help
            button.
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
      this.props.onChange();
      state.setOptimizationField(
        this.props.optimizationId,
        'lineupType',
        parseInt(value)
      );
    }.bind(this);

    this.onOptimizerChange = function (newOptimizerId) {
      this.props.onChange();
      state.setOptimizationField(
        this.props.optimizationId,
        'optimizerType',
        parseInt(newOptimizerId)
      );
    }.bind(this);

    this.handleOptimizerSearch = function () {
      setRoute(`/account/select-optimizers`);
    };

    this.setup = function () {}.bind(this);
  }

  render() {
    // Process info about all available optimizers
    const optimizerOptions = [];
    for (const id in this.props.optimizerData) {
      optimizerOptions.push({
        label: this.props.optimizerData[id].name,
        value: parseInt(id),
        key: id,
      });
    }

    // Process info about the selected optimizer
    this.selectedOptimizerName = '';
    this.selectedOptimizerDescription =
      'No optimizer selected. To see a description for a specific optimizer please select one from the drop down menu.';
    let optId = this.props.selectedOptimizerId;
    if (
      this.props.optimizerData &&
      optId !== undefined &&
      this.props.optimizerData[optId] !== undefined
    ) {
      this.selectedOptimizerName = this.props.optimizerData[optId].name;
      this.selectedOptimizerDescription =
        this.props.optimizerData[optId].shortDescription;
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
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <FloatingSelect
            selectId="lineupType"
            label="Lineup Type"
            initialValue={this.props.lineupType}
            onChange={this.onLineupChange}
            values={[
              { key: 0, label: 'Normal', value: 0 },
              { key: 1, label: 'Alternating Gender', value: 1 },
              { key: 2, label: 'No Consecutive Females', value: 2 },
              {
                key: 3,
                label: 'No Consecutive Females and No Three Consecutive Males',
                value: 3,
              },
            ]}
            disabled={this.props.disabled}
            fullWidth
          />
          <IconButton
            alt="help"
            className="help-icon"
            src="/assets/help.svg"
            onClick={showLineupTypeHelp}
            invert
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <FloatingSelect
            selectId="optimizer"
            label="Optimizer"
            initialValue={this.props.selectedOptimizerId}
            onChange={this.onOptimizerChange}
            values={optimizerOptions}
            disabled={this.props.disabled}
            fullWidth
          />
          <IconButton
            alt="help"
            className="help-icon"
            src="/assets/help.svg"
            onClick={this.handleOptimizerHelp}
            invert
          />
          <IconButton
            alt="help"
            className="help-icon"
            src="/assets/search.svg"
            onClick={this.handleOptimizerSearch}
            invert
          />
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

    return <div className="loading-container">{content}</div>;
  }
}

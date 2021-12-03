import React from 'react';
import dialog from 'dialog';
import state from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome, setRoute } from 'actions/route';
import constants from '/../constants.js';

export default class CardOptimizationStatsOverride extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.homeOrBack = function () {};

    this.handleNewPaClick = function () {
      let newPa = state.addOptimizationOverridePlateAppearance(
        this.props.optimization.id,
        this.props.player.id
      );
      setRoute(
        `/optimizations/${this.props.optimization.id}/overrides/${this.props.player.id}/plateAppearances/${newPa.id}?isNew=true`
      );
    };

    this.handleExistingPaClick = function (paId) {
      setRoute(
        `/optimizations/${this.props.optimization.id}/overrides/${this.props.player.id}/plateAppearances/${paId}`
      );
    };

    this.getHelpFunction = function () {
      return function () {
        dialog.show_notification(
          <div>
            <b style={{ textTransform: 'capitalize' }}>{'PA Overrides'}</b>
            <div
              style={{ margin: '1rem' }}
            >{`You can add additional plate appearances for any player that only
                  apply to this optimization. This is useful for cases when you have a
                  player who doesn't have any historical hitting data (such
                  as a sub).`}</div>
          </div>
        );
      };
    };

    this.handleDeleteClick = function () {
      dialog.show_confirm(
        'Are you sure you want to delete all stat overrides for player "' +
          props.player.name +
          '"?',
        () => {
          let allOverrides = JSON.parse(props.optimization.overrideData);
          delete allOverrides[props.player.id];
          state.setOptimizationField(
            props.optimization.id,
            'overrideData',
            allOverrides,
            true
          );
          goBack();
        }
      );
    };
  }

  componentDidMount() {}

  renderSaveOptions(overrides) {
    return (
      <>
        {overrides.length <= 0 ? null : (
          <ListButton id="delete" onClick={this.handleDeleteClick}>
            <img
              className="edit-button-icon"
              src="/server/assets/delete.svg"
              alt="delete"
            />
            <span className="edit-button-icon">Delete All</span>
          </ListButton>
        )}
      </>
    );
  }

  renderPage() {
    // Get the existing override for this player in this optimization (if it exists)
    let existingOverride = JSON.parse(this.props.optimization.overrideData)[
      this.props.player.id
    ];

    if (
      this.props.optimization.status !==
      constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      return DOM.div(
        {
          className: 'auth-input-container',
        },
        'This page is only available when optimization status is NOT_STARTED. Status is currently ' +
          constants.OPTIMIZATION_STATUS_ENUM_INVERSE[
            this.props.optimization.status
          ]
      );
    } else {
      let overrides = state.getParsedOptimizationOverridePlateAppearances(
        this.props.optimization.id,
        this.props.player.id
      );
      let paDisplayList = [];
      for (let pa in overrides) {
        let paObject = overrides[pa];
        paDisplayList.push(
          <div
            id={'pa-' + paObject.id}
            key={`box${paObject.id}`}
            onClick={this.handleExistingPaClick.bind(this, paObject.id)}
            className="lineup-box"
          >
            <span className="no-select">{paObject.result || ''}</span>
          </div>
        );
      }
      paDisplayList.push(
        <div
          id={'newPa'}
          key={`newPa`}
          onClick={
            this.handleNewPaClick.bind(this)
            /*this.handleNewPlateAppearanceClick.bind(
        this,
        player,
        this.props.game.id,
        this.props.team.id
        )*/
          }
          className="lineup-box"
        >
          <span className="no-select">+</span>
        </div>
      );

      return (
        <div>
          <div
            style={{
              display: 'flex',
              fontSize: '14pt',
              padding: '10px 10px 0px 20px',
            }}
          >
            <div>Additional Plate Appearances for {this.props.player.name}</div>
            <div
              className="icon-button"
              style={{
                backgroundColor: 'black',
              }}
            >
              <img
                alt="help"
                className="help-icon"
                src="/server/assets/help.svg"
                onClick={this.getHelpFunction()}
              />
            </div>
          </div>

          <div>
            <div
              className="plate-appearance-list-container"
              style={{ padding: '25px', display: 'flex' }}
            >
              {paDisplayList}
            </div>
          </div>
          <div></div>
          <div>{this.renderSaveOptions(overrides)}</div>
        </div>
      );
    }
  }

  render() {
    return (
      <Card
        title="PA Override"
        leftHeaderProps={{ onClick: this.homeOrBack('back') }}
        rightHeaderProps={{ onClick: this.homeOrBack('home') }}
      >
        {this.renderPage()}
      </Card>
    );
  }
}

import React from 'react';
import dialog from 'dialog';
import state from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome, setRoute } from 'actions/route';
import SharedLib from '/../shared-lib';
import IconButton from '../elements/icon-button';
import { colors } from '../css/theme';

const constants = SharedLib.constants;

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
            <b style={{ textTransform: 'capitalize' }}>
              {'Plate Appearance (PA) Overrides'}
            </b>
            <div
              style={{ margin: '1rem' }}
            >{`You can add plate appearances for any player that only
                  apply to this optimization. This is useful for cases when you have a
                  player who doesn't have any historical hitting data (such
                  as a sub). If you add PAs here, they will be used by the optimizer instead of any PAs indicated on the optimization menu.`}</div>
          </div>
        );
      };
    };

    this.handleAddAllPa = function () {
      let toAdd = state.getAllPlateAppearancesForPlayer(this.props.player.id);

      let allOverrides = JSON.parse(props.optimization.overrideData);
      let overridesForPlayer =
        allOverrides[props.player.id] === undefined
          ? []
          : allOverrides[props.player.id];

      // Add all the new PAs
      for (let pa of toAdd) {
        overridesForPlayer.push(pa);
      }
      allOverrides[props.player.id] = overridesForPlayer;

      // Set it in the state
      state.setOptimizationField(
        props.optimization.id,
        'overrideData',
        allOverrides,
        true
      );
    }.bind(this);

    this.handleAddTeamPas = function (teamId) {
      let toAdd = state.getPlateAppearancesForPlayerOnTeam(
        this.props.player.id,
        teamId
      );

      let allOverrides = JSON.parse(props.optimization.overrideData);
      let overridesForPlayer =
        allOverrides[props.player.id] === undefined
          ? []
          : allOverrides[props.player.id];

      // Add all the new PAs
      for (let pa of toAdd) {
        overridesForPlayer.push(pa);
      }
      allOverrides[props.player.id] = overridesForPlayer;

      // Set it in the state
      state.setOptimizationField(
        props.optimization.id,
        'overrideData',
        allOverrides,
        true
      );
    }.bind(this);

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
          <ListButton
            id="delete"
            type="delete-button"
            onClick={this.handleDeleteClick}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconButton src="/server/assets/delete.svg" alt="delete" />
              <span
                style={{
                  marginLeft: '4px',
                }}
              >
                Delete All
              </span>
            </div>
          </ListButton>
        )}
      </>
    );
  }

  renderPage() {
    if (
      this.props.optimization.status !==
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      return (
        <div className="auth-input-container">
          {'This page is only available when optimization status is NOT_STARTED. Status is currently ' +
            constants.OPTIMIZATION_STATUS_ENUM_INVERSE[
              this.props.optimization.status
            ]}
        </div>
      );
    }

    let overrides = state.getParsedOptimizationOverridePlateAppearances(
      this.props.optimization.id,
      this.props.player.id
    );
    let overrideStats = state.buildStatsObject(this.props.player.id, overrides);
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
        <div
          style={{
            backgroundColor: colors.PRIMARY_LIGHT,
          }}
        >
          <span className="no-select">+</span>
        </div>
      </div>
    );

    let teamAtBatButtons = [];
    for (let team of state.getAllTeams()) {
      let teamPAs = state.getPlateAppearancesForPlayerOnTeam(
        this.props.player.id,
        team.id
      );
      if (teamPAs.length > 0) {
        teamAtBatButtons.push(
          <div
            onClick={this.handleAddTeamPas.bind(this, team.id)}
            className="button list-button"
          >
            Use All
            <b style={{ paddingLeft: '3px', paddingRight: '3px' }}>
              {team.name}
            </b>
            PAs ({teamPAs.length})
          </div>
        );
      }
    }

    return (
      <div>
        <div
          style={{
            display: 'flex',
            fontSize: '14pt',
            padding: '10px 10px 0px 20px',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            Plate Appearances for{' '}
            <span
              style={{
                color: colors.PRIMARY_DARK,
                fontWeight: 'bold',
              }}
            >
              {this.props.player.name}
            </span>
            .
          </div>
          <IconButton
            alt="help"
            className="help-icon"
            src="/server/assets/help.svg"
            onClick={this.getHelpFunction()}
            invert
          />
        </div>

        <div
          style={{
            background: colors.BACKGROUND,
            margin: '20px 0',
          }}
        >
          <div style={{ padding: '25px', display: 'flex', flexWrap: 'wrap' }}>
            {paDisplayList}
          </div>
        </div>
        <div
          style={{
            margin: '20px',
            display: 'flex',
            justifyContent: 'space-evenly',
          }}
        >
          <div>
            <b>PAs</b> {overrideStats.plateAppearances}
          </div>
          <div>
            <b>Avg</b> {overrideStats.battingAverage}
          </div>
          <div>
            <b>Slg</b> {overrideStats.sluggingPercentage}
          </div>
        </div>
        <div onClick={this.handleAddAllPa} className="button list-button">
          Use All Available PA (
          {state.getAllPlateAppearancesForPlayer(this.props.player.id).length})
        </div>
        <div>{teamAtBatButtons}</div>
        <div>{this.renderSaveOptions(overrides)}</div>
      </div>
    );
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

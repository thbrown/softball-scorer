import React from 'react';
import dialog from 'dialog';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, setRoute } from 'actions/route';
import SharedLib from 'shared-lib';
import IconButton from '../elements/icon-button';
import css from 'css';
const colors = css.colors;

const constants = SharedLib.constants;

export default class CardOptimizationStatsOverride extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    this.homeOrBack = function () {};

    this.handleNewPaClick = function () {
      let newPa = getGlobalState().addOptimizationOverridePlateAppearance(
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

    this.handleAddPas = function (toAdd) {
      let allOverrides = JSON.parse(
        JSON.stringify(props.optimization.overrideData)
      );
      let overridesForPlayer = [];

      // Add all the new PAs
      for (let pa of toAdd) {
        overridesForPlayer.push(pa);
      }
      allOverrides[props.player.id] = overridesForPlayer;

      // Set it in the state
      getGlobalState().setOptimizationField(
        props.optimization.id,
        'overrideData',
        allOverrides
      );
    };

    this.handleDeleteClick = function () {
      dialog.show_confirm(
        'Are you sure you want to delete all stat overrides for player  "' +
          props.player.name +
          '"?',
        () => {
          let allOverrides = JSON.parse(
            JSON.stringify(props.optimization.overrideData)
          );
          delete allOverrides[props.player.id];
          getGlobalState().setOptimizationField(
            props.optimization.id,
            'overrideData',
            allOverrides
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
              <IconButton src="/assets/delete.svg" alt="delete" />
              <span>Delete All</span>
            </div>
          </ListButton>
        )}
        <ListButton
          id="next"
          type="primary-button"
          onClick={() => {
            goBack();
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton src="/assets/check.svg" alt="check" />
            <span>Confirm</span>
          </div>
        </ListButton>
      </>
    );
  }

  renderPage() {
    if (
      !SharedLib.constants.EDITABLE_OPTIMIZATION_STATUSES_ENUM.has(
        this.props.optimization.status
      )
    ) {
      return (
        <div className="auth-input-container">
          {'This page is only available when optimization status is editable. Status is currently ' +
            constants.OPTIMIZATION_STATUS_ENUM_INVERSE[
              this.props.optimization.status
            ]}
        </div>
      );
    }

    let overrides = getGlobalState().getOptimizationOverridesForPlayer(
      this.props.optimization.id,
      this.props.player.id
    );
    let overrideStats = getGlobalState().buildStatsObject(
      overrides,
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
    for (let team of getGlobalState().getAllTeams()) {
      let teamPAs = getGlobalState().getPlateAppearancesForPlayerOnTeam(
        this.props.player.id,
        team.id
      );
      if (teamPAs.length > 0) {
        teamAtBatButtons.push(
          <div
            key={`team-${team.id}`}
            onClick={this.handleAddPas.bind(
              this,
              getGlobalState().getPlateAppearancesForPlayerOnTeam(
                this.props.player.id,
                team.id
              )
            )}
            className="button list-button"
            style={{
              justifyContent: 'flex-start',
            }}
          >
            Use{' '}
            <b style={{ paddingLeft: '7px', paddingRight: '7px' }}>
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
            src="/assets/help.svg"
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
        <div
          onClick={this.handleAddPas.bind(
            this,
            getGlobalState().getAllPlateAppearancesForPlayer(
              this.props.player.id
            )
          )}
          className="button list-button"
          style={{
            justifyContent: 'flex-start',
          }}
        >
          Use All Available PA (
          {
            getGlobalState().getAllPlateAppearancesForPlayer(
              this.props.player.id
            ).length
          }
          )
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

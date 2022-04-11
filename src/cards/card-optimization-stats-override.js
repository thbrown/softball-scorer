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
    // Get the existing override for this player in this optimization (if it exists)
    let existingOverride = JSON.parse(this.props.optimization.overrideData)[
      this.props.player.id
    ];

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
            className="lineup-box-beginning"
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
              Additional Plate Appearances for{' '}
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

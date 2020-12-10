import React from 'react';
import dialog from 'dialog';
import state from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';
import FloatingInput from 'elements/floating-input';
import FloatingSelect from 'elements/floating-select';

export default class CardGameEdit extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...this.props.game,
    };

    this.isPristine = props.isNew ? false : true;

    this.homeOrBack = (type) => (cb) => {
      if (!this.isPristine) {
        dialog.show_confirm(
          props.isNew
            ? 'Are you sure you wish to discard this game?'
            : 'Are you sure you wish to discard changes to this game?',
          () => {
            if (props.isNew) {
              state.removeGame(props.game.id, props.team.id);
            }
            if (type === 'home') {
              goHome();
            } else {
              goBack();
            }
          }
        );
        return true;
      }
      if (cb) {
        cb();
      }
    };

    this.handleConfirmClick = () => {
      state.replaceGame(props.game.id, props.team.id, { ...this.state });
      goBack();
    };

    this.handleCancelClick = () => {
      this.homeOrBack('back')(goBack);
    };

    this.handleDeleteClick = () => {
      dialog.show_confirm(
        `Are you sure you want to delete the game against ${props.game.opponent}?`,
        () => {
          // FIXME this causes a brief 404 to flash on the page
          goBack();
          state.removeGame(props.game.id, props.team.id);
        }
      );
    };

    this.handleOpponentNameChange = (value) => {
      this.isPristine = false;
      this.setState({
        opponent: value,
      });
    };

    this.handleLineupTypeChange = (newValue) => {
      this.isPristine = false;
      this.setState({
        lineupType: parseInt(newValue),
      });
    };

    this.handleLineupTypeHelpClick = () => {
      dialog.show_notification(
        <div>
          <b>Lineup Type</b> is used by the lineup simulator to determine what
          lineups are valid. Some leagues have restrictions on which players can
          bat in which slots. Softball.app supports three types of lineups:
          <div style={{ margin: '1rem' }}>
            <b>- Normal</b> Any batter is allowed to bat anywhere in the lineup.
          </div>
          <div style={{ margin: '1rem' }}>
            <b>- Alternating Gender</b> Consecutive batters must have different
            genders.
          </div>
          <div style={{ margin: '1rem' }}>
            <b>- No Consecutive Females</b> Females may not bat back-to-back.
          </div>
        </div>,
        undefined
      );
    };
  }

  renderGameEdit() {
    return (
      <>
        <div className="auth-input-container">
          <FloatingInput
            inputId="opponentName"
            maxLength="50"
            label="Opponent"
            onChange={this.handleOpponentNameChange}
            defaultValue={this.props.game.opponent}
          />
          <div className="help-parent">
            <FloatingSelect
              selectId="lineupType"
              label="Lineup Type"
              initialValue={this.props.game.lineupType || 2}
              onChange={this.handleLineupTypeChange}
              values={{
                1: 'Normal',
                2: 'Alternating Gender',
                3: 'No Consecutive Females',
              }}
            />
            <div className="help-container">
              <img
                className="help-icon"
                src="/server/assets/help.svg"
                alt="help"
                onClick={this.handleLineupTypeHelpClick}
              />
            </div>
          </div>
        </div>
        {this.renderSaveOptions()}
      </>
    );
  }

  renderSaveOptions() {
    return (
      <>
        <ListButton id="save" onClick={this.handleConfirmClick}>
          <img
            className="edit-button-icon"
            src="/server/assets/check.svg"
            alt="save"
          />
          <span className="edit-button-icon">Save</span>
        </ListButton>
        <ListButton id="cancel" onClick={this.handleCancelClick}>
          <img
            className="edit-button-icon"
            src="/server/assets/cancel.svg"
            alt="cancel"
          />
          <span className="edit-button-icon">Cancel</span>
        </ListButton>
        {this.props.isNew ? null : (
          <ListButton id="delete" onClick={this.handleDeleteClick}>
            <img
              className="edit-button-icon"
              src="/server/assets/delete.svg"
              alt="delete"
            />
            <span className="edit-button-icon">Delete</span>
          </ListButton>
        )}
      </>
    );
  }

  render() {
    return (
      <Card
        title="Edit Game"
        leftHeaderProps={{ onClick: this.homeOrBack('back') }}
        rightHeaderProps={{ onClick: this.homeOrBack('home') }}
      >
        {this.renderGameEdit()}
      </Card>
    );
  }
}

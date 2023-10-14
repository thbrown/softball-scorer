import React from 'react';
import dialog from 'dialog';
import css from 'css';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome, setRoute } from 'actions/route';
import FloatingInput from 'elements/floating-input';
import FloatingSelect from 'elements/floating-select';
import IconButton from '../elements/icon-button';
import { showLineupTypeHelp } from 'utils/help-functions';

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
              getGlobalState().removeGame(props.game.id);
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
      getGlobalState().replaceGame(props.game.id, props.team.id, {
        ...this.state,
      });
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
          getGlobalState().removeGame(props.game.id);
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
              initialValue={this.props.game.lineupType || 0}
              onChange={this.handleLineupTypeChange}
              values={[
                { label: 'Normal', value: 0 },
                { label: 'Alternating Gender', value: 1 },
                { label: 'No Consecutive Females', value: 2 },
                {
                  label:
                    'No Consecutive Females and No Three Consecutive Males',
                  value: '3',
                },
              ]}
              fullWidth
            />
            <IconButton
              className="help-icon"
              src="/assets/help.svg"
              alt="help"
              onClick={showLineupTypeHelp}
              invert
            />
          </div>
        </div>
        {this.renderSaveOptions()}
      </>
    );
  }

  renderSaveOptions() {
    return (
      <>
        <ListButton
          id="save"
          type="primary-button"
          onClick={this.handleConfirmClick}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton src="/assets/check.svg" alt="save" />
            <span
              style={{
                marginLeft: css.spacing.xSmall,
              }}
            >
              Save
            </span>
          </div>
        </ListButton>
        <ListButton
          id="cancel"
          type="edit-button"
          onClick={this.handleCancelClick}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton src="/assets/cancel.svg" alt="cancel" invert />
            <span
              style={{
                marginLeft: css.spacing.xSmall,
              }}
            >
              Cancel
            </span>
          </div>
        </ListButton>
        {this.props.isNew ? null : (
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
              <span
                style={{
                  marginLeft: css.spacing.xSmall,
                }}
              >
                Delete
              </span>
            </div>
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

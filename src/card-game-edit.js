import React from 'react';
import expose from './expose';
import DOM from 'react-dom-factories';
import dialog from 'dialog';
import state from 'state';

import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

import FloatingInput from 'elements/floating-input';
import FloatingPicklist from 'component-floating-picklist';

export default class CardGameEdit extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.game = props.game;
    this.isNew = props.isNew;

    let gameCopy = JSON.parse(JSON.stringify(this.game));

    let goBack = function() {
      window.history.back();
    };

    this.homeOrBack = function() {
      if (
        props.isNew &&
        JSON.stringify(gameCopy) === JSON.stringify(props.game)
      ) {
        // No changes, don't save a blank game
        state.removeGame(props.game.id, props.team.id);
      } else {
        state.replaceGame(props.game.id, props.team.id, gameCopy);
      }
    };

    this.handleConfirmClick = function() {
      state.replaceGame(props.game.id, props.team.id, gameCopy);
      goBack();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removeGame(props.game.id, props.team.id);
      }
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        `Are you sure you want to delete the game vs ${props.game.opponent}?`,
        () => {
          state.removeGame(props.game.id, props.team.id);
          goBack();
        }
      );
    };

    this.handleOpponentNameChange = function() {
      let newValue = document.getElementById('opponentName').value;
      gameCopy.opponent = newValue;
    };

    this.handleLineupTypeChange = function() {
      let newValue = document.getElementById('lineupType').value;
      gameCopy.lineupType = parseInt(newValue);
    };

    this.handleLineupTypeHelpClick = function() {
      dialog.show_notification(
        `**Lineup Type** is used by the lineup simulator to determine what lineups are valid. Some leagues have restrictions on which players can bat in which slots. Softball.app supports three types of lineups:
* **Normal** Any batter is allowed to bat anywhere in the lineup
* **Alternating Gender** Consecutive batters must have different genders
* **No Consecutive Females** Females may not bat back-to-back`,
        undefined
      );
    };
  }

  renderGameEdit() {
    return DOM.div(
      {
        className: 'auth-input-container',
      },
      [
        React.createElement(FloatingInput, {
          key: 'opponentName',
          id: 'opponentName',
          maxLength: '50',
          label: 'Opponent',
          onChange: this.handleOpponentNameChange,
          defaultValue: this.game.opponent,
        }),
        DOM.div(
          {
            key: 'helpParent',
            className: 'help-parent',
          },
          React.createElement(FloatingPicklist, {
            id: 'lineupType',
            label: 'Lineup Type',
            defaultValue: this.game.lineupType,
            onChange: this.handleLineupTypeChange,
          }),
          DOM.div(
            { className: 'help-container' },
            DOM.img({
              className: 'help-icon',
              src: '/server/assets/help.svg',
              onClick: this.handleLineupTypeHelpClick,
            })
          )
        ),
      ],
      this.renderSaveOptions()
    );
  }

  renderSaveOptions() {
    let buttons = [];

    buttons.push(
      DOM.div(
        {
          key: 'confirm',
          className: 'edit-button button confirm-button',
          onClick: this.handleConfirmClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/check.svg',
          alt: 'back',
        }),
        DOM.span(
          {
            className: 'edit-button-icon',
          },
          'Save'
        )
      )
    );

    buttons.push(
      DOM.div(
        {
          key: 'cancel',
          className: 'edit-button button cancel-button',
          onClick: this.handleCancelClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/cancel.svg',
        }),
        DOM.span(
          {
            className: 'edit-button-icon',
          },
          'Cancel'
        )
      )
    );

    if (!this.isNew) {
      buttons.push(
        DOM.div(
          {
            key: 'delete',
            className: 'edit-button button cancel-button',
            onClick: this.handleDeleteClick,
          },
          DOM.img({
            className: 'edit-button-icon',
            src: '/server/assets/delete.svg',
          }),
          DOM.span(
            {
              className: 'edit-button-icon',
            },
            'Delete'
          )
        )
      );
    }

    return DOM.div(
      {
        key: 'saveOptions',
      },
      buttons
    );
  }

  render() {
    return DOM.div(
      {
        className: 'card',
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack,
        }),
        DOM.div(
          {
            className: 'card-title-text-with-arrow',
          },
          'Edit Game'
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack,
        })
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderGameEdit()
      )
    );
  }
}

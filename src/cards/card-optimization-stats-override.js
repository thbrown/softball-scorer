import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import dialog from 'dialog';
import FloatingInput from 'elements/floating-input';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { goBack } from 'actions/route';

export default class CardOptimizationStatsOverride extends React.Component {
  constructor(props) {
    super(props);

    this.state = {};

    let parseIntWithDefault = function(toParse, defaultValue) {
      let parsedInt = parseInt(toParse);
      return isNaN(parsedInt) ? defaultValue : parsedInt;
    };

    let buildOverride = function() {
      return {
        outs: parseIntWithDefault(document.getElementById('outs').value, 0),
        singles: parseIntWithDefault(document.getElementById('1b').value, 0),
        doubles: parseIntWithDefault(document.getElementById('2b').value, 0),
        triples: parseIntWithDefault(document.getElementById('3b').value, 0),
        homeruns: parseIntWithDefault(document.getElementById('hr').value, 0),
      };
    };

    this.homeOrBack = function() {
      let newOverride = buildOverride();
      let allOverrides = JSON.parse(props.optimization.overrideData);
      allOverrides[props.player.id] = newOverride;
      state.setOptimizationField(
        props.optimization.id,
        'overrideData',
        allOverrides,
        true
      );
    };

    this.handleConfirmClick = function() {
      this.homeOrBack();
      goBack();
    }.bind(this);

    this.handleCancelClick = function() {
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete this stat override for player "' +
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

    this.handleOutsChange = function() {};

    this.handle1BChange = function() {};

    this.handle2BChange = function() {};

    this.handle3BChange = function() {};

    this.handleHrChange = function() {};
  }

  componentDidMount() {}

  renderOverridePlayerStats(existingOverride) {
    if (
      this.props.optimization.status !==
      state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      return DOM.div(
        {
          className: 'auth-input-container',
        },
        'This page is only available when optimization status is NOT_STARTED. Status is currently ' +
          state.OPTIMIZATION_STATUS_ENUM_INVERSE[this.props.optimization.status]
      );
    } else {
      return DOM.div(
        {
          className: 'auth-input-container',
        },
        [
          React.createElement(FloatingInput, {
            key: 'outs',
            inputId: 'outs',
            label: 'Outs',
            type: 'number',
            maxLength: '50',
            onChange: this.handleOutsChange.bind(this),
            defaultValue: existingOverride ? existingOverride.outs : undefined,
          }),
        ],
        [
          React.createElement(FloatingInput, {
            key: '1b',
            inputId: '1b',
            label: '1B',
            type: 'number',
            maxLength: '50',
            onChange: this.handle1BChange.bind(this),
            defaultValue: existingOverride
              ? existingOverride.singles
              : undefined,
          }),
        ],
        [
          React.createElement(FloatingInput, {
            key: '2b',
            inputId: '2b',
            label: '2B',
            type: 'number',
            maxLength: '50',
            onChange: this.handle2BChange.bind(this),
            defaultValue: existingOverride
              ? existingOverride.doubles
              : undefined,
          }),
        ],
        [
          React.createElement(FloatingInput, {
            key: '3b',
            inputId: '3b',
            label: '3B',
            type: 'number',
            maxLength: '50',
            onChange: this.handle3BChange.bind(this),
            defaultValue: existingOverride
              ? existingOverride.triples
              : undefined,
          }),
        ],
        [
          React.createElement(FloatingInput, {
            key: 'hr',
            inputId: 'hr',
            label: 'HR',
            type: 'number',
            maxLength: '50',
            onChange: this.handleHrChange.bind(this),
            defaultValue: existingOverride
              ? existingOverride.homeruns
              : undefined,
          }),
        ],
        this.renderSaveOptions(existingOverride)
      );
    }
  }

  renderSaveOptions(existingOverride) {
    // We don't need an isNew prop here because the override doesn't have an id as it can be described (for url purposes)
    // by a combination of the optimization id and the player id. So we'll just detemine whether or not it's new
    // based on the data inside the state.
    let isNew = false;
    if (existingOverride === undefined) {
      isNew = true;
    }

    let buttons = [];

    buttons.push(
      DOM.div(
        {
          key: 'confirm',
          className: 'edit-button button confirm-button',
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: '0',
            marginRight: '0',
          },
          onClick: this.handleConfirmClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/check.svg',
        }),
        'Save'
      )
    );

    buttons.push(
      DOM.div(
        {
          key: 'cancel',
          className: 'edit-button button cancel-button',
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: '0',
            marginRight: '0',
          },
          onClick: this.handleCancelClick,
        },
        DOM.img({
          className: 'edit-button-icon',
          src: '/server/assets/cancel.svg',
        }),
        'Cancel'
      )
    );

    if (!isNew) {
      buttons.push(
        DOM.div(
          {
            key: 'delete',
            className: 'edit-button button cancel-button',
            // TODO - Make this a component and fix the style there with CSS.
            style: {
              marginLeft: '0',
              marginRight: '0',
            },
            onClick: this.handleDeleteClick,
          },
          DOM.img({
            className: 'edit-button-icon',
            src: '/server/assets/delete.svg',
          }),
          'Delete'
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
    // Get the existing override for this player in this optimization (if it exists)
    let existingOverride = JSON.parse(this.props.optimization.overrideData)[
      this.props.player.id
    ];

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
          'Override ' + this.props.player.name
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack,
        })
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderOverridePlayerStats(existingOverride)
      )
    );
  }
}

import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';
import { getShallowCopy } from 'utils/functions';

export default class CardOptimizationList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.handleOptimizationClick = function(optimization) {
      setRoute(`/optimizations/${optimization.id}`);
    };

    this.handleEditClick = function(optimization, ev) {
      setRoute(`/optimizations/${optimization.id}/edit`);
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      var d = new Date();
      let optimization = state.addOptimization(
        `${d.getMonth() + 1}/${d.getDate()} optimization`
      );
      setRoute(`/optimizations/${optimization.id}/edit?isNew=true`);
    };
  }

  renderOptimizationsList() {
    const s = state.getLocalState();
    let elems = getShallowCopy(s.optimizations)
      .reverse()
      .map(optimization => {
        return DOM.div(
          {
            optimization_id: optimization.id,
            key: 'optimization' + optimization.id,
            className: 'list-item',
            onClick: this.handleOptimizationClick.bind(this, optimization),
            style: {
              display: 'flex',
              justifyContent: 'space-between',
            },
          },
          DOM.div(
            {
              className: 'prevent-overflow',
            },
            optimization.name
          ),
          DOM.div(
            {
              style: {},
            },
            DOM.img({
              src: '/server/assets/edit.svg',
              className: 'list-button',
              onClick: this.handleEditClick.bind(this, optimization),
              alt: 'edit',
            })
          )
        );
      });

    elems.unshift(
      DOM.div(
        {
          key: 'newoptimization',
          className: 'list-item add-list-item',
          onClick: this.handleCreateClick,
        },
        '+ Add New Optimization'
      )
    );

    return DOM.div({}, elems);
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
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'prevent-overflow card-title-text-with-arrow',
          },
          'Optimizations'
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderOptimizationsList()
      )
    );
  }
}
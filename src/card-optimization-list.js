import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

export default class CardOptimizationList extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleOptimizationClick = function(optimization) {
      expose.set_state('main', {
        page: `/optimizations/${optimization.id}`,
      });
    };

    this.handleEditClick = function(optimization, ev) {
      expose.set_state('main', {
        page: `/optimizations/${optimization.id}/edit`,
        isNew: false,
      });
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      var d = new Date();
      let optimization = state.addOptimization(
        `${d.getMonth() + 1}/${d.getDate()} optimization`
      );
      expose.set_state('main', {
        page: `/optimizations/${optimization.id}/edit`,
        isNew: true,
      });
    };
  }

  renderOptimizationsList() {
    const s = state.getLocalState();
    let elems = s.optimizations.slice(0).map(optimization => {
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

    elems.push(
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
};

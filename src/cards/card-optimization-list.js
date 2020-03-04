import React from 'react';
import state from 'state';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import { compose, withHandlers } from 'recompose';
import NoSelect from 'elements/no-select';

const enhance = compose(
  withHandlers({
    handleOptimizationClick: props => optimization => () => {
      setRoute(`/optimizations/${optimization.id}`);
    },
    handleEditClick: props => optimization => ev => {
      setRoute(`/optimizations/${optimization.id}/edit`);
      ev.stopPropagation();
    },
    handleCreateClick: props => () => {
      const d = new Date();
      const optimization = state.addOptimization(
        `${d.getMonth() + 1}/${d.getDate()} optimization`
      );
      setRoute(`/optimizations/${optimization.id}/edit?isNew=true`);
    },
  })
);

const CardOptimizationList = props => (
  <Card title="Optimizations">
    <div
      id="new-optimization"
      className={'list-item add-list-item'}
      onClick={props.handleCreateClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <NoSelect className="prevent-overflow">+ Add New Optimization</NoSelect>
    </div>
    {[...state.getLocalState().optimizations].reverse().map(optimization => (
      <div
        id={'optimization-' + optimization.id}
        key={optimization.id}
        className={'list-item'}
        onClick={props.handleOptimizationClick(optimization)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <NoSelect className="prevent-overflow">{optimization.name}</NoSelect>
        <div>
          <img
            id={'edit-optimization-' + optimization.id}
            alt="edit"
            src="/server/assets/edit.svg"
            className="list-button"
            onClick={props.handleEditClick(optimization)}
          />
        </div>
      </div>
    ))}
  </Card>
);

export default enhance(CardOptimizationList);

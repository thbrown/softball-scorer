import React from 'react';
import state from 'state';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import { compose, withHandlers } from 'recompose';
import NoSelect from 'elements/no-select';
import ListButton from 'elements/list-button';
import SharedLib from '/../shared-lib';

const enhance = compose(
  withHandlers({
    handleOptimizationClick: (props) => (optimization) => () => {
      setRoute(`/optimizations/${optimization.id}`);
    },
    handleEditClick: (props) => (optimization) => (ev) => {
      setRoute(`/optimizations/${optimization.id}/edit`);
      ev.stopPropagation();
    },
    handleCreateClick: (props) => () => {
      const d = new Date();
      const optimization = state.addOptimization(
        `${d.getMonth() + 1}/${d.getDate()} optimization`
      );
      setRoute(`/optimizations/${optimization.id}/edit?isNew=true`);
    },
  })
);

const CardOptimizationList = (props) => (
  <Card title="Optimizations">
    <ListButton
      id="new-optimization"
      onClick={props.handleCreateClick}
      type="tertiary-button"
    >
      <NoSelect className="prevent-overflow">+ Add New Optimization</NoSelect>
    </ListButton>
    {[...state.getLocalState().optimizations].reverse().map((optimization) => (
      <ListButton
        id={'optimization-' + optimization.id}
        key={optimization.id}
        className={'list-item'}
        onClick={props.handleOptimizationClick(optimization)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <NoSelect className="prevent-overflow">
            <div style={{ display: 'flex' }}>
              <div>{optimization.name}</div>
              <div className="secondary" style={{ marginLeft: '5px' }}>
                {'['}
                {
                  SharedLib.constants.OPTIMIZATION_STATUS_ENUM_INVERSE[
                    optimization.status
                  ]
                }
                {']'}
              </div>
            </div>
          </NoSelect>
          <div>
            <img
              id={'edit-optimization-' + optimization.id}
              alt="edit"
              src="/server/assets/more.svg"
              onClick={props.handleEditClick(optimization)}
            />
          </div>
        </div>
      </ListButton>
    ))}
  </Card>
);

export default enhance(CardOptimizationList);

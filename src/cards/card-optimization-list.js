import React from 'react';
import state from 'state';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import NoSelect from 'elements/no-select';
import ListButton from 'elements/list-button';
import SharedLib from 'shared-lib';
import IconButton from 'elements/icon-button';

const CardOptimizationList = (props) => {
  const handleOptimizationClick = (optimization) => () => {
    setRoute(`/optimizations/${optimization.id}`);
  };
  const handleEditClick = (optimization) => (ev) => {
    setRoute(`/optimizations/${optimization.id}/edit`);
    ev.stopPropagation();
  };
  const handleCreateClick = (props) => {
    const d = new Date();
    const optimization = state.addOptimization(
      `${d.getMonth() + 1}/${d.getDate()} optimization`
    );
    setRoute(`/optimizations/${optimization.id}/edit?isNew=true`);
  };

  return (
    <Card title="Optimizations">
      <ListButton
        id="new-optimization"
        onClick={handleCreateClick}
        type="primary-button"
      >
        <NoSelect className="prevent-overflow">+ Add New Optimization</NoSelect>
      </ListButton>
      {[...state.getLocalState().optimizations]
        .reverse()
        .map((optimization) => (
          <ListButton
            id={'optimization-' + optimization.id}
            key={optimization.id}
            className={'list-item'}
            onClick={handleOptimizationClick(optimization)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <NoSelect className="prevent-overflow">
                <div style={{ display: 'flex' }}>
                  <div>{optimization.name}</div>
                  <div style={{ marginLeft: '5px', color: '#a6a6a6' }}>
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
                <IconButton
                  id={'edit-optimization-' + optimization.id}
                  alt="edit"
                  src="/assets/edit.svg"
                  onClick={handleEditClick(optimization)}
                  invert
                />
              </div>
            </div>
          </ListButton>
        ))}
    </Card>
  );
};

export default CardOptimizationList;

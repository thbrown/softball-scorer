import React from 'react';
import state from 'state';
import dialog from 'dialog';
import FloatingInput from 'elements/floating-input';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome, setRoute } from 'actions/route';
import IconButton from '../elements/icon-button';

const CardOptimizationEdit = (props) => {
  const [optName, setOptName] = React.useState(props.optimization.name);
  const [isPristine, setIsPristine] = React.useState(
    props.isNew ? false : true
  );

  const buildOptimization = function () {
    const optimization = JSON.parse(JSON.stringify(props.optimization));
    optimization.name = optName;
    return optimization;
  };

  const homeOrBack = function (type) {
    if (!isPristine) {
      dialog.show_confirm(
        props.isNew
          ? 'Are you sure you wish to discard this optimization?'
          : 'Are you sure you wish to discard changes to this optimization?',
        () => {
          if (props.isNew) {
            state.removeOptimization(props.optimization.id);
          }
          if (type === 'home') {
            goHome();
          } else {
            goBack();
          }
        }
      );
      return true;
    } else {
      // This uses a callback for a bunch of other *-edit pages, not sure why
      goBack();
    }
  };

  const handleConfirmClick = function () {
    state.replaceOptimization(props.optimization.id, buildOptimization());
    setRoute('/optimizations');
  };

  const handleCancelClick = function () {
    homeOrBack('back');
  };

  const handleDeleteClick = function () {
    dialog.show_confirm(
      'Are you sure you want to delete this optimization "' + optName + '"?',
      () => {
        state.removeOptimization(props.optimization.id);
        goBack();
      }
    );
  };

  const handleDuplicateClick = function () {
    dialog.show_confirm(
      'Are you sure you want to duplicate optimization "' +
        optName +
        '"? This will result in a new optimization with the same players, overrides, and selected games but with status NOT_STARTED. The existing optimization will not be affected.',
      () => {
        state.duplicateOptimization(props.optimization.id);
        goBack();
      }
    );
  };

  const handleOptimizationNameChange = (value) => {
    setIsPristine(false);
    setOptName(value);
  };

  return (
    <Card title="Edit Optimization">
      <div className="auth-input-container">
        <FloatingInput
          inputId="optimizationName"
          defaultValue={optName}
          label="Optimization Name"
          onChange={(value) => handleOptimizationNameChange(value)}
        />
      </div>
      <ListButton id="save" type="primary-button" onClick={handleConfirmClick}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton src="/assets/check.svg" alt="" />
          <span
            style={{
              marginLeft: '4px',
            }}
          >
            Save
          </span>
        </div>
      </ListButton>
      <ListButton
        id="cancel"
        type="edit-button"
        className="edit-button button cancel-button"
        onClick={handleCancelClick}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton src="/assets/cancel.svg" alt="" invert />
          <span
            style={{
              marginLeft: '4px',
            }}
          >
            Cancel
          </span>
        </div>
      </ListButton>
      {!props.isNew && (
        <ListButton
          id="duplicate"
          type="edit-button"
          onClick={handleDuplicateClick}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton src="/assets/duplicate.svg" alt="" invert />
            <span
              style={{
                marginLeft: '4px',
              }}
            >
              Duplicate
            </span>
          </div>
        </ListButton>
      )}
      {!props.isNew && (
        <ListButton
          id="delete"
          type="delete-button"
          onClick={handleDeleteClick}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton src="/assets/delete.svg" alt="" />
            <span
              style={{
                marginLeft: '4px',
              }}
            >
              Delete
            </span>
          </div>
        </ListButton>
      )}
    </Card>
  );
};

export default CardOptimizationEdit;

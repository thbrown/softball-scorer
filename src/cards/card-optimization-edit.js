import React from 'react';
import state from 'state';
import dialog from 'dialog';
import FloatingInput from 'elements/floating-input';
import Card from 'elements/card';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';

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
    goBack();
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
    <Card
      title="Edit Optimization"
      leftHeaderProps={{ onClick: () => homeOrBack('back') }}
      rightHeaderProps={{ onClick: () => homeOrBack('home') }}
    >
      <div className="auth-input-container">
        <FloatingInput
          inputId="optimizationName"
          defaultValue={optName}
          label="Optimization Name"
          onChange={(value) => handleOptimizationNameChange(value)}
        />
      </div>
      <ListButton type="edit-button" onClick={handleConfirmClick}>
        <img
          className="edit-button-icon"
          src="/server/assets/check.svg"
          alt=""
        />
        <span className="edit-button-icon"> Save </span>
      </ListButton>
      <ListButton
        type="edit-button"
        className="edit-button button cancel-button"
        onClick={handleCancelClick}
      >
        <img
          className="edit-button-icon"
          src="/server/assets/cancel.svg"
          alt=""
        />
        <span className="edit-button-icon"> Cancel </span>
      </ListButton>
      {!props.isNew && (
        <ListButton type="edit-button" onClick={handleDeleteClick}>
          <img
            className="edit-button-icon"
            src="/server/assets/delete.svg"
            alt=""
          />
          <span className="edit-button-icon"> Delete </span>
        </ListButton>
      )}
      {!props.isNew && (
        <ListButton type="edit-button" onClick={handleDuplicateClick}>
          <img
            className="edit-button-icon"
            src="/server/assets/duplicate.svg"
            alt=""
          />
          <span className="edit-button-icon"> Duplicate </span>
        </ListButton>
      )}
    </Card>
  );
};

export default CardOptimizationEdit;

import React from 'react';
import state from 'state';
import dialog from 'dialog';
import FloatingInput from 'elements/floating-input';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import Button from 'elements/button';
import NoSelect from 'elements/no-select';
import { goBack, goHome } from 'actions/route';

const CardOptimizationEdit = props => {
  const [optName, setOptName] = React.useState(props.optimization.name);
  const [isPristine, setIsPristine] = React.useState(
    props.isNew ? false : true
  );

  const buildOptimization = function() {
    const optimization = JSON.parse(JSON.stringify(props.optimization));
    optimization.name = optName;
    return optimization;
  };

  const homeOrBack = function(type) {
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
    }
  };

  const handleConfirmClick = function() {
    state.replaceOptimization(props.optimization.id, buildOptimization());
    goBack();
  };

  const handleCancelClick = function() {
    homeOrBack('back');
  };

  const handleDeleteClick = function() {
    dialog.show_confirm(
      'Are you sure you want to delete this optimization "' +
        state.optimizationName +
        '"?',
      () => {
        state.removeOptimization(props.optimization.id);
        goBack();
      }
    );
  };

  const handleOptimizationNameChange = value => {
    setIsPristine(false);
    setOptName(value);
  };

  return (
    <Card
      title="Edit Optimization"
      leftHeaderProps={{ onClick: () => homeOrBack('back') }}
      rightHeaderProps={{ onClick: () => homeOrBack('home') }}
    >
      <CardSection>
        <FloatingInput
          inputId="optimizationName"
          defaultValue={optName}
          label="Optimization Name"
          onChange={value => handleOptimizationNameChange(value)}
        />
        <Button id="save" onClick={handleConfirmClick}>
          <div className="flex-center-row">
            <img
              alt="check"
              className="edit-button-icon"
              src="/server/assets/check.svg"
            />
            <NoSelect>Save</NoSelect>
          </div>
        </Button>
        <Button id="cancel" onClick={handleCancelClick} type="cancel">
          <div className="flex-center-row">
            <img
              alt="x"
              className="edit-button-icon"
              src="/server/assets/cancel.svg"
            />
            <NoSelect>Cancel</NoSelect>
          </div>
        </Button>
        <Button id="delete" onClick={handleDeleteClick} type="delete">
          <div className="flex-center-row">
            <img
              alt="del"
              className="edit-button-icon"
              src="/server/assets/delete.svg"
            />
            <NoSelect>Delete</NoSelect>
          </div>
        </Button>
      </CardSection>
    </Card>
  );
};

export default CardOptimizationEdit;

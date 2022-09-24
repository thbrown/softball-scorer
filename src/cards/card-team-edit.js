import React from 'react';
import state from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import FloatingInput from 'elements/floating-input';
import ListButton from 'elements/list-button';
import { goBack, goHome } from 'actions/route';
import IconButton from '../elements/icon-button';

const CardTeamEdit = (props) => {
  const [team, setTeam] = React.useState(props.team);
  let isPristine = props.isNew ? false : true;

  const homeOrBack = (type, cb) => {
    if (!isPristine) {
      dialog.show_confirm(
        props.isNew
          ? 'Are you sure you wish to discard team?'
          : 'Are you sure you wish to discard changes to team?',
        () => {
          if (props.isNew) {
            state.removeTeam(props.team.id);
          }
          if (type === 'home') {
            goHome();
          } else {
            goBack();
          }
        }
      );
      return true;
    }
    if (cb) {
      cb();
    }
  };

  const handleConfirmClick = () => {
    const newTeam = { ...team };
    delete newTeam.copiedNotificationVisible;
    state.replaceTeam(props.team.id, newTeam);
    goBack();
  };

  const handleCancelClick = () => {
    homeOrBack('back', goBack);
  };

  const handleDeleteClick = () => {
    dialog.show_confirm(
      `Are you sure you want to delete the team ${props.team.name}?`,
      () => {
        // FIXME causes a brief 404 to flash on the page
        goBack();
        state.removeTeam(props.team.id);
      }
    );
    return true;
  };

  const handleNameChange = (value) => {
    isPristine = false;
    setTeam({
      ...team,
      name: value,
    });
  };

  return (
    <Card
      title="Edit Team"
      leftHeaderProps={{
        onClick: () => homeOrBack('back'),
      }}
      rightHeaderProps={{
        onClick: () => homeOrBack('home'),
      }}
    >
      <div className="auth-input-container">
        <FloatingInput
          maxLength="50"
          label="Team Name"
          onChange={handleNameChange}
          defaultValue={props.team.name}
        />
      </div>
      <ListButton id="save" type="primary-button" onClick={handleConfirmClick}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton src="/server/assets/check.svg" alt="" hideBackground />
          <span style={{ marginLeft: '8px' }}> Save </span>
        </div>
      </ListButton>
      <ListButton
        // type="secondary-button"
        className="edit-button button"
        onClick={handleCancelClick}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton
            src="/server/assets/cancel.svg"
            alt=""
            hideBackground
            invert
          />
          <span style={{ marginLeft: '8px' }}> Cancel </span>
        </div>
      </ListButton>
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
            <IconButton src="/server/assets/delete.svg" alt="" hideBackground />
            <span style={{ marginLeft: '8px' }}> Delete </span>
          </div>
        </ListButton>
      )}
    </Card>
  );
};

export default CardTeamEdit;

import React from 'react';
import { getGlobalState } from 'state';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import IconButton from '../elements/icon-button';

const TeamList = () => {
  const handleTeamClick = (team) => {
    setRoute(`/teams/${team.id}`);
  };

  const handleEditClick = (team, ev) => {
    setRoute(`/teams/${team.id}/edit`);
    ev.stopPropagation();
  };

  const handleCreateClick = () => {
    const team = getGlobalState().addTeam('');
    setRoute(`/teams/${team.id}/edit?isNew=true`);
  };

  const elems = getGlobalState()
    .getAllTeams()
    .reverse()
    .map((team) => {
      return (
        <ListButton
          id={'team-' + team.id}
          team_id={team.id}
          key={'team' + team.id}
          className={'list-item'}
          onClick={() => handleTeamClick(team)}
        >
          <div className="centered-row">
            <div className="prevent-overflow">{team.name}</div>
            <IconButton
              src="/assets/edit.svg"
              alt="edit"
              id={'team-' + team.id + '-edit'}
              onClick={handleEditClick.bind(this, team)}
              invert
              hideBackground
            />
          </div>
        </ListButton>
      );
    });

  elems.unshift(
    <ListButton
      key={'newTeam'}
      id={'newTeam'}
      type="primary-button"
      onClick={handleCreateClick}
    >
      + Add New Team
    </ListButton>
  );

  return <div id="teamList">{elems}</div>;
};

export default TeamList;

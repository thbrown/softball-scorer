import React from 'react';
import { getGlobalState } from 'state';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import IconButton from '../elements/icon-button';
import { Team } from 'shared-lib/types/team';

const TeamList = () => {
  const handleTeamClick = (team: Team) => {
    setRoute(`/teams/${team.id}`);
  };

  const handleEditClick = (team: Team, ev: React.MouseEvent) => {
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
    .map((team: Team) => {
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
              onClick={(ev: React.MouseEvent) => handleEditClick(team, ev)}
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

import React from 'react';
import state from 'state';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import { getShallowCopy } from 'utils/functions';

const TeamList = () => {
  const handleTeamClick = team => {
    setRoute(`/teams/${team.id}`);
  };

  const handleEditClick = (team, ev) => {
    setRoute(`/teams/${team.id}/edit`);
    ev.stopPropagation();
  };

  const handleCreateClick = () => {
    const team = state.addTeam('');
    setRoute(`/teams/${team.id}/edit?isNew=true`);
  };

  const s = state.getLocalState();
  const elems = getShallowCopy(s.teams)
    .reverse()
    .map(team => {
      return (
        <ListButton
          id={'team-' + team.id}
          team_id={team.id}
          key={'team' + team.id}
          className={'list-item'}
          onClick={() => handleTeamClick(team)}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div className="prevent-overflow">{team.name}</div>
            <div>
              <img
                id={'team-' + team.id + '-edit'}
                src={'/server/assets/edit.svg'}
                alt={'edit'}
                className={'list-button'}
                onClick={handleEditClick.bind(this, team)}
              />
            </div>
          </div>
        </ListButton>
      );
    });

  elems.unshift(
    <ListButton
      key={'newTeam'}
      id={'newTeam'}
      type="secondary"
      onClick={handleCreateClick}
    >
      + Add New Team
    </ListButton>
  );

  return <div id="teamList">{elems}</div>;
};

export default TeamList;

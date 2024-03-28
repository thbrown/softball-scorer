import dialog from 'dialog';
import React from 'react';

export const showLineupTypeHelp = () => {
  dialog.show_notification(
    <div>
      <b>Lineup Type</b> is used by the lineup simulator to determine what
      lineups are valid. Some leagues have restrictions on which players can bat
      in which slots. Softball.app supports these types of lineups:
      <div style={{ margin: '1rem' }}>
        <b>- Normal</b> Any batter is allowed to bat anywhere in the lineup.
      </div>
      <div style={{ margin: '1rem' }}>
        <b>- Alternating Gender</b> Consecutive batters must have different
        genders.
      </div>
      <div style={{ margin: '1rem' }}>
        <b>- No Consecutive Females</b> Females may not bat back-to-back.
      </div>
      <div style={{ margin: '1rem' }}>
        <b>- No Consecutive Females and No Three Consecutive Males</b> Females
        may not bat back-to-back and three males may not bat in a row.
      </div>
    </div>,
    undefined
  );
};

export const showStatsHelp = () => {
  const rowStyle = {
    margin: '.5rem',
    display: 'flex',
  };
  const labelStyle = {
    fontWeight: 'bold',
    width: '3rem',
    display: 'inline-block',
    flexShrink: 0,
  };
  dialog.show_notification(
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2>Stat Glossary</h2>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>PA</span> <span>Plate appearances</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Avg</span> <span>Batting average</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Slg</span> <span>Slugging percentage</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>2B</span> <span>Doubles</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>3B</span> <span>Triples</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>HR</span> <span>Home runs</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>HRo</span>{' '}
        <span>Outside the park home runs</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>HRi</span>{' '}
        <span>Inside the park home runs</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>rG</span>{' '}
        <span>
          Autocorrelation of batting average across games. In other words, how a
          players AVG in one game is correlated with their average in the next
          game. It measures a player's "streakiness". It's a value between -1
          and 1. Value is only displayed if the correlation is statistically
          significant (alpha of .05).
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>rPA</span>{' '}
        <span>
          Autocorrelation of batting average across games. In other words, how
          the result of a PA (hit/no hit) is correlated with the result of the
          subsequent PA. It measures a player's "streakiness". It's a value
          between -1 and 1. Value is only displayed if the correlation is
          statistically significant (alpha of .05).
        </span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>PA/G</span>{' '}
        <span>Plate appearances per game</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>O/G</span> <span>Outs per game</span>
      </div>
    </div>,
    undefined
  );
};

export const showEmailHelp = () => {
  dialog.show_notification(
    <div>
      <p>
        This functionality is disabled because your email has not been verified.
      </p>
      <p>
        Click the link in the validation email that was sent to you on signup.
      </p>
      <p>
        Link expired?{' '}
        <a href="/account">
          {' '}
          Go to account settings to re-send validation email.
        </a>
      </p>
    </div>,
    undefined
  );
};

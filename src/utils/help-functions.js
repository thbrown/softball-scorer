import dialog from 'dialog';

export const showLineupTypeHelp = () => {
  dialog.show_notification(
    <div>
      <b>Lineup Type</b> is used by the lineup simulator to determine what
      lineups are valid. Some leagues have restrictions on which players can bat
      in which slots. Softball.app supports three types of lineups:
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
  dialog.show_notification(
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <b>Stat Glossary</b>
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>PA</b> Plate appearances
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>Avg</b> Batting average
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>Slg</b> Slugging percentage
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>2B</b> Doubles
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>3B</b> Triples
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>HR</b> Home runs
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>HRo</b> Outside the park home runs
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>HRi</b> Inside the park home runs
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>rG</b> Autocorrelation of batting average across games. In other
        words, how a players AVG in one game is correlated with their average in
        the next game. It measures a player's "streakiness". It's a value
        between -1 and 1. Value is only displayed if the correlation is
        statistically significant (alpha of .05).
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>rPA</b> Autocorrelation of batting average across games. In other
        words, how the result of a PA (hit/no hit) is correlated with the result
        of the subsequent PA. It measures a player's "streakiness". It's a value
        between -1 and 1. Value is only displayed if the correlation is
        statistically significant (alpha of .05).
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>PA/G</b> Plate appearances per game
      </div>
      <div style={{ margin: '.5rem' }}>
        <b>O/G</b> Outs per game
      </div>
    </div>,
    undefined
  );
};

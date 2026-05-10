import React from 'react';
import Select from 'react-select';
import type { Team, TopLevelExport } from 'shared-lib';

interface GameMappingProps {
  importData: TopLevelExport;
  localTeams: Team[];
  teamMapping: Record<string, string | null>;
  mapping: Record<string, string | null>;
  onMappingChange: (mapping: Record<string, string | null>) => void;
}

interface GameOption {
  value: string;
  label: string;
}

const KEEP_AS_NEW: GameOption = { value: '', label: '-- Keep as new game --' };

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function formatDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString();
}

function gameLabel(opponent: string, date: number): string {
  return `vs ${opponent} (${formatDate(date)})`;
}

const GameMapping = ({
  importData,
  localTeams,
  teamMapping,
  mapping,
  onMappingChange,
}: GameMappingProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const localTeamById = React.useMemo(
    () => new Map(localTeams.map((t) => [t.id as string, t])),
    [localTeams]
  );

  // Only show game mapping for teams explicitly mapped to a local team
  const teamPairs = React.useMemo(() => {
    const pairs: Array<{
      importTeam: TopLevelExport['teams'][number];
      localTeam: Team;
      unrecognizedGames: TopLevelExport['teams'][number]['games'];
      localGameOptions: GameOption[];
    }> = [];

    for (const importTeam of importData.teams) {
      const localTeamId = teamMapping[importTeam.id];
      if (!localTeamId) continue; // null (keep as new) or undefined (already recognized)

      const localTeam = localTeamById.get(localTeamId);
      if (!localTeam) continue;

      const localGameIds = new Set(localTeam.games.map((g) => g.id as string));
      const unrecognizedGames = importTeam.games.filter((g) => !localGameIds.has(g.id));
      if (unrecognizedGames.length === 0) continue;

      const localGameOptions: GameOption[] = [
        KEEP_AS_NEW,
        ...localTeam.games.map((g) => ({
          value: g.id as string,
          label: gameLabel(g.opponent, g.date),
        })),
      ];

      pairs.push({ importTeam, localTeam, unrecognizedGames, localGameOptions });
    }
    return pairs;
  }, [importData.teams, teamMapping, localTeamById]);

  if (teamPairs.length === 0) return null;

  const totalUnrecognized = teamPairs.reduce((s, p) => s + p.unrecognizedGames.length, 0);
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  const handleAutoMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMapping: Record<string, string | null> = { ...mapping };
    for (const { unrecognizedGames, localTeam } of teamPairs) {
      for (const impGame of unrecognizedGames) {
        let bestId: string | null = null;
        let bestScore = Infinity;
        for (const localGame of localTeam.games) {
          const dist = levenshtein(
            impGame.opponent.toLowerCase(),
            localGame.opponent.toLowerCase()
          );
          // Weight by date proximity (1 day = 86400 seconds)
          const dateDiff = Math.abs(impGame.date - localGame.date) / 86400;
          const score = dist + dateDiff * 0.1;
          if (score < bestScore) {
            bestScore = score;
            bestId = localGame.id as string;
          }
        }
        newMapping[impGame.id] = bestId;
      }
    }
    onMappingChange(newMapping);
  };

  const handleSelectChange = (importGameId: string, option: GameOption | null) => {
    onMappingChange({ ...mapping, [importGameId]: option?.value || null });
  };

  return (
    <div className="wizard-panel" style={{ marginTop: 'var(--spacing-large)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          cursor: 'pointer',
          background: 'var(--color-background)',
          height: '48px',
          boxSizing: 'border-box',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ fontWeight: 'bold' }}>
          {expanded ? '▼' : '▶'} Game Mapping{' '}
          <span
            style={{
              fontWeight: 'normal',
              fontSize: '0.88em',
              color: 'var(--color-primary-dark)',
            }}
          >
            ({totalUnrecognized} unrecognized
            {mappedCount > 0 ? `, ${mappedCount} mapped` : ''})
          </span>
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '8px 14px 12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <div style={{ fontSize: '0.82em', color: '#666' }}>
              Map unrecognized games to existing ones. Mapped games&apos; plate appearances will be merged in.
            </div>
            <div
              className="button primary-button"
              style={{ padding: '4px 12px', fontSize: '0.85em', flexShrink: 0, marginLeft: '12px' }}
              onClick={handleAutoMap}
            >
              Auto-map
            </div>
          </div>
          {teamPairs.map(({ importTeam, localTeam, unrecognizedGames, localGameOptions }) => (
            <div key={importTeam.id}>
              <div
                style={{
                  fontSize: '0.78em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary-dark)',
                  margin: '8px 0 4px',
                }}
              >
                {importTeam.name} → {localTeam.name}
              </div>
              {unrecognizedGames.map((impGame) => (
                <div
                  key={impGame.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ flex: '0 0 auto', minWidth: '140px', fontSize: '0.9em' }}>
                    {gameLabel(impGame.opponent, impGame.date)}
                  </span>
                  <span style={{ color: '#aaa' }}>→</span>
                  <div style={{ flex: 1 }}>
                    <Select
                      options={localGameOptions}
                      value={
                        localGameOptions.find((o) => o.value === (mapping[impGame.id] ?? '')) ??
                        KEEP_AS_NEW
                      }
                      onChange={(opt) => handleSelectChange(impGame.id, opt)}
                      isSearchable
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({ ...base, minHeight: '32px' }),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameMapping;

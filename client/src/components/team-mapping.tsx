import React from 'react';
import Select from 'react-select';
import type { Team, TopLevelExport } from 'shared-lib';

interface TeamMappingProps {
  importData: TopLevelExport;
  localTeams: Team[];
  mapping: Record<string, string | null>;
  onMappingChange: (mapping: Record<string, string | null>) => void;
}

interface TeamOption {
  value: string;
  label: string;
}

const KEEP_AS_NEW: TeamOption = { value: '', label: '-- Keep as new team --' };

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

const TeamMapping = ({
  importData,
  localTeams,
  mapping,
  onMappingChange,
}: TeamMappingProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const localIds = React.useMemo(
    () => new Set(localTeams.map((t) => t.id as string)),
    [localTeams]
  );

  const unrecognized = React.useMemo(
    () => importData.teams.filter((t) => !localIds.has(t.id)),
    [importData.teams, localIds]
  );

  const options: TeamOption[] = React.useMemo(
    () => [KEEP_AS_NEW, ...localTeams.map((t) => ({ value: t.id as string, label: t.name }))],
    [localTeams]
  );

  if (unrecognized.length === 0) return null;

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  const handleAutoMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMapping: Record<string, string | null> = { ...mapping };
    for (const imp of unrecognized) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const local of localTeams) {
        const dist = levenshtein(imp.name.toLowerCase(), local.name.toLowerCase());
        if (dist < bestDist) {
          bestDist = dist;
          bestId = local.id as string;
        }
      }
      newMapping[imp.id] = bestId;
    }
    onMappingChange(newMapping);
  };

  const handleSelectChange = (importId: string, option: TeamOption | null) => {
    onMappingChange({ ...mapping, [importId]: option?.value || null });
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
          {expanded ? '▼' : '▶'} Team Mapping{' '}
          <span
            style={{
              fontWeight: 'normal',
              fontSize: '0.88em',
              color: 'var(--color-primary-dark)',
            }}
          >
            ({unrecognized.length} unrecognized
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
              Map unrecognized teams to existing ones. Mapped teams&apos; games will be merged in.
            </div>
            <div
              className="button primary-button"
              style={{ padding: '4px 12px', fontSize: '0.85em', flexShrink: 0, marginLeft: '12px' }}
              onClick={handleAutoMap}
            >
              Auto-map
            </div>
          </div>
          {unrecognized.map((imp) => (
            <div
              key={imp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
              }}
            >
              <span style={{ flex: '0 0 auto', minWidth: '140px', fontSize: '0.9em' }}>
                {imp.name}
              </span>
              <span style={{ color: '#aaa' }}>→</span>
              <div style={{ flex: 1 }}>
                <Select
                  options={options}
                  value={options.find((o) => o.value === (mapping[imp.id] ?? '')) ?? KEEP_AS_NEW}
                  onChange={(opt) => handleSelectChange(imp.id, opt)}
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
      )}
    </div>
  );
};

export default TeamMapping;

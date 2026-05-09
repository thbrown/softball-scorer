import React from 'react';
import Select from 'react-select';
import type { Player, TopLevelExport } from 'shared-lib';

interface PlayerMappingProps {
  importData: TopLevelExport;
  localPlayers: Player[];
  mapping: Record<string, string | null>;
  onMappingChange: (mapping: Record<string, string | null>) => void;
}

interface PlayerOption {
  value: string;
  label: string;
}

const KEEP_AS_NEW: PlayerOption = { value: '', label: '-- Keep as new player --' };

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

const PlayerMapping = ({
  importData,
  localPlayers,
  mapping,
  onMappingChange,
}: PlayerMappingProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const localIds = React.useMemo(
    () => new Set(localPlayers.map((p) => p.id)),
    [localPlayers]
  );

  const unrecognized = React.useMemo(
    () => importData.players.filter((p) => !localIds.has(p.id)),
    [importData.players, localIds]
  );

  const options: PlayerOption[] = React.useMemo(
    () => [KEEP_AS_NEW, ...localPlayers.map((p) => ({ value: p.id, label: `${p.name} (${p.gender})` }))],
    [localPlayers]
  );

  if (unrecognized.length === 0) return null;

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  const handleAutoMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMapping: Record<string, string | null> = { ...mapping };
    for (const imp of unrecognized) {
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const local of localPlayers) {
        const dist = levenshtein(imp.name.toLowerCase(), local.name.toLowerCase());
        if (dist < bestDist) {
          bestDist = dist;
          bestId = local.id;
        }
      }
      newMapping[imp.id] = bestId;
    }
    onMappingChange(newMapping);
  };

  const handleSelectChange = (importId: string, option: PlayerOption | null) => {
    onMappingChange({ ...mapping, [importId]: option?.value || null });
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-primary-dark)',
        borderRadius: '6px',
        margin: '12px 0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          cursor: 'pointer',
          background: 'var(--color-background-secondary, #f5f5f5)',
          minHeight: '44px',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ fontWeight: 'bold' }}>
          {expanded ? '▼' : '▶'} Player Mapping{' '}
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
        {/* Always reserve space for the button to keep the header height stable */}
        <div
          className="button primary-button"
          style={{
            padding: '4px 12px',
            fontSize: '0.85em',
            visibility: expanded ? 'visible' : 'hidden',
          }}
          onClick={handleAutoMap}
        >
          Auto-map
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '8px 14px 12px' }}>
          <div style={{ fontSize: '0.82em', color: '#666', marginBottom: '8px' }}>
            Map each unrecognized player to an existing player, or leave as &quot;Keep as new
            player&quot;. Mapped players will not be duplicated.
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
                <span style={{ color: '#888', marginLeft: '4px' }}>({imp.gender})</span>
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

export default PlayerMapping;

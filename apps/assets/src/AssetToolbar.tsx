import {
  ASSET_STATUSES,
  ASSET_TYPES,
  SITES,
  type AssetStatus,
  type AssetType,
  type ParsedAssetListQuery,
  type Site,
} from '@fleet/api';
import { useSearchInput } from '@fleet/app-runtime';
import { Button, FacetFilter, Input } from '@fleet/ui';
import { SearchIcon, XIcon } from 'lucide-react';
import { capitalise } from './format';

const toOptions = <T extends string>(values: readonly T[]) =>
  values.map((value) => ({ value, label: capitalise(value) }));

const STATUS_OPTIONS = toOptions<AssetStatus>(ASSET_STATUSES);
const TYPE_OPTIONS = toOptions<AssetType>(ASSET_TYPES);
const SITE_OPTIONS = toOptions<Site>(SITES);

interface AssetToolbarProps {
  query: ParsedAssetListQuery;
  onChange: (change: Partial<ParsedAssetListQuery>) => void;
}

export function AssetToolbar({ query, onChange }: AssetToolbarProps) {
  const [search, setSearch] = useSearchInput(query.q, (q) => onChange({ q }));

  const hasFilters = Boolean(
    query.q || query.status?.length || query.type?.length || query.site?.length,
  );

  const clearFilters = () => {
    setSearch('');
    onChange({ q: '', status: [], type: [], site: [] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <SearchIcon
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search ID, name, make…"
          aria-label="Search assets"
          className="h-8 pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <FacetFilter
        title="Status"
        options={STATUS_OPTIONS}
        selected={query.status ?? []}
        onChange={(status) => onChange({ status })}
      />
      <FacetFilter
        title="Type"
        options={TYPE_OPTIONS}
        selected={query.type ?? []}
        onChange={(type) => onChange({ type })}
      />
      <FacetFilter
        title="Site"
        options={SITE_OPTIONS}
        selected={query.site ?? []}
        onChange={(site) => onChange({ site })}
      />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Reset
          <XIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}

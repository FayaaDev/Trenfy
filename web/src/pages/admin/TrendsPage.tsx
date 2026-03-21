import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getTrends } from '@/api/trends';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FilterState = {
  status?: 'pending' | 'approved' | 'rejected';
  platform?: string;
  category?: string;
  region_code?: string;
};

type SortField = 'published_date' | 'metric_value';

export function TrendsPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortField | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trends', filters, cursor, sortBy, sortDir],
    queryFn: ({ signal }) =>
      getTrends({
        ...filters,
        cursor,
        limit: 50,
        sort_by: sortBy ? `${sortBy}:${sortDir}` : undefined,
        signal,
      }),
  });

  function setFilter<K extends keyof FilterState>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setCursor(undefined);
    setCursorStack([]);
  }

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setCursor(undefined);
    setCursorStack([]);
  }

  function handleNext() {
    if (!data?.paging.next_cursor) return;
    setCursorStack((prev) => [...prev, cursor ?? '']);
    setCursor(data.paging.next_cursor);
  }

  function handlePrev() {
    if (cursorStack.length === 0) return;
    const stack = [...cursorStack];
    const prev = stack.pop();
    setCursorStack(stack);
    setCursor(prev || undefined);
  }

  function sortIndicator(field: SortField) {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function statusBadge(status: string | null) {
    if (status === 'approved') return <Badge variant="default">Approved</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">{status ?? 'Pending'}</Badge>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Trends</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.status ?? ''}
          onValueChange={(v) => setFilter('status', v ?? '')}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.platform ?? ''}
          onValueChange={(v) => setFilter('platform', v ?? '')}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Platforms</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category ?? ''}
          onValueChange={(v) => setFilter('category', v ?? '')}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            <SelectItem value="gaming">Gaming</SelectItem>
            <SelectItem value="music">Music</SelectItem>
            <SelectItem value="entertainment">Entertainment</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.region_code ?? ''}
          onValueChange={(v) => setFilter('region_code', v ?? '')}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Regions</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="SA">SA</SelectItem>
            <SelectItem value="JP">JP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Region</TableHead>
            <TableHead
              className="cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort('published_date')}
            >
              Published{sortIndicator('published_date')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort('metric_value')}
            >
              Metric{sortIndicator('metric_value')}
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground py-8"
              >
                Loading…
              </TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground py-8"
              >
                Failed to load trends.
              </TableCell>
            </TableRow>
          )}
          {data?.items.map((trend) => (
            <TableRow key={trend.Id}>
              <TableCell className="max-w-[240px] truncate font-medium">
                {trend.title}
              </TableCell>
              <TableCell className="capitalize">{trend.platform}</TableCell>
              <TableCell className="capitalize">{trend.category}</TableCell>
              <TableCell>{statusBadge(trend.status)}</TableCell>
              <TableCell>{trend.region_code}</TableCell>
              <TableCell>
                {format(new Date(trend.published_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{trend.metric_value.toLocaleString()}</TableCell>
              <TableCell>{/* actions: 09-02 */}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={cursorStack.length === 0}
        >
          ← Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!data?.paging.has_more}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

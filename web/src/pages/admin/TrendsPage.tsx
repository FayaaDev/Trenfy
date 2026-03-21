import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getTrends, patchTrend, deleteTrend } from '@/api/trends';
import type { PaginatedTrends, PatchTrendPayload, Trend } from '@/api/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { TrendEditModal } from '@/components/admin/TrendEditModal';

type FilterState = {
  status?: 'pending' | 'approved' | 'rejected';
  platform?: string;
  category?: string;
  region_code?: string;
};

type SortField = 'published_date' | 'metric_value';

export function TrendsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({});
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortField | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Trend | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);

  const queryKey = ['trends', filters, cursor, sortBy, sortDir] as const;

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      getTrends({
        ...filters,
        cursor,
        limit: 50,
        sort_by: sortBy ? `${sortBy}:${sortDir}` : undefined,
        signal,
      }),
  });

  const allVisibleIds = data?.items.map((t) => t.Id) ?? [];
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchTrendPayload }) =>
      patchTrend(id, data),
    onMutate: async ({ id, data: patchData }) => {
      await queryClient.cancelQueries({ queryKey: ['trends'] });
      const previousData = queryClient.getQueryData<PaginatedTrends>(queryKey);
      queryClient.setQueryData<PaginatedTrends>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((t) =>
            t.Id === id ? { ...t, ...patchData } : t
          ),
        };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error('Action failed');
    },
    onSuccess: (_data, { data: patchData }) => {
      toast.success(
        patchData.status === 'approved'
          ? 'Approved'
          : patchData.status === 'rejected'
            ? 'Rejected'
            : 'Updated'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTrend(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['trends'] });
      const previousData = queryClient.getQueryData<PaginatedTrends>(queryKey);
      queryClient.setQueryData<PaginatedTrends>(queryKey, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((t) => t.Id !== id) };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error('Delete failed');
    },
    onSuccess: () => {
      toast.success('Deleted');
      setDeleteTarget(null);
    },
  });

  function setFilter<K extends keyof FilterState>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setCursor(undefined);
    setCursorStack([]);
    setSelectedIds(new Set());
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
    setSelectedIds(new Set());
  }

  function handleNext() {
    if (!data?.paging.next_cursor) return;
    setCursorStack((prev) => [...prev, cursor ?? '']);
    setCursor(data.paging.next_cursor);
    setSelectedIds(new Set());
  }

  function handlePrev() {
    if (cursorStack.length === 0) return;
    const stack = [...cursorStack];
    const prev = stack.pop();
    setCursorStack(stack);
    setCursor(prev || undefined);
    setSelectedIds(new Set());
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAction(status: 'approved' | 'rejected') {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkPending(true);
    try {
      await Promise.all(ids.map((id) => patchTrend(id, { status })));
      toast.success(
        `${status === 'approved' ? 'Approved' : 'Rejected'} ${ids.length} trend${ids.length === 1 ? '' : 's'}`
      );
    } catch {
      toast.error('Some updates failed — refresh to see current state');
    } finally {
      setSelectedIds(new Set());
      setIsBulkPending(false);
      queryClient.invalidateQueries({ queryKey: ['trends'] });
    }
  }

  function sortIndicator(field: SortField) {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function statusBadge(status: string | null) {
    if (status === 'approved') return <Badge variant="default">Approved</Badge>;
    if (status === 'rejected')
      return <Badge variant="destructive">Rejected</Badge>;
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

      {/* Bulk action bar — visible when 2+ rows are selected */}
      {selectedIds.size >= 2 && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-sm text-slate-600">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkPending}
            onClick={() => handleBulkAction('approved')}
          >
            Approve {selectedIds.size}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBulkPending}
            onClick={() => handleBulkAction('rejected')}
          >
            Reject {selectedIds.size}
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
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
                colSpan={9}
                className="text-center text-muted-foreground py-8"
              >
                Loading…
              </TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground py-8"
              >
                Failed to load trends.
              </TableCell>
            </TableRow>
          )}
          {data?.items.map((trend) => (
            <TableRow key={trend.Id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(trend.Id)}
                  onCheckedChange={() => toggleSelectOne(trend.Id)}
                  aria-label={`Select trend ${trend.Id}`}
                />
              </TableCell>
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
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={
                      trend.status === 'approved' || patchMutation.isPending
                    }
                    onClick={() =>
                      patchMutation.mutate({
                        id: trend.Id,
                        data: { status: 'approved' },
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={
                      trend.status === 'rejected' || patchMutation.isPending
                    }
                    onClick={() =>
                      patchMutation.mutate({
                        id: trend.Id,
                        data: { status: 'rejected' },
                      })
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setEditTarget(trend)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteTarget(trend.Id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
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

      {/* Modals */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget !== null) deleteMutation.mutate(deleteTarget);
        }}
        isPending={deleteMutation.isPending}
      />
      <TrendEditModal
        trend={editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}

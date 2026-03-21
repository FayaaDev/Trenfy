import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getSources, patchSource } from '@/api/sources';
import type { TrendSource } from '@/api/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SourceToggle } from '@/components/admin/SourceToggle';

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">
        Success
      </Badge>
    );
  }
  if (status === 'error') {
    return <Badge variant="destructive">Error</Badge>;
  }
  return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
}

export function SourcesPage() {
  const queryClient = useQueryClient();

  const {
    data: sources,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['sources'],
    queryFn: ({ signal }) => getSources(signal),
  });

  const mutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      patchSource(id, { enabled }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['sources'] });
      const previous = queryClient.getQueryData<TrendSource[]>(['sources']);
      queryClient.setQueryData<TrendSource[]>(['sources'], (old) =>
        old?.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['sources'], ctx.previous);
      toast.error('Failed to update source');
    },
    onSuccess: () => toast.success('Source updated'),
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Sources</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Last Fetched</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                Loading…
              </TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                Failed to load sources.
              </TableCell>
            </TableRow>
          )}
          {sources?.map((source) => (
            <TableRow key={source.id}>
              <TableCell className="font-medium">{source.name}</TableCell>
              <TableCell className="capitalize">{source.platform}</TableCell>
              <TableCell>
                <SourceToggle
                  enabled={source.enabled}
                  onChange={(enabled) =>
                    mutation.mutate({ id: source.id, enabled })
                  }
                  disabled={mutation.isPending}
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {source.last_fetched_at
                  ? formatDistanceToNow(new Date(source.last_fetched_at), {
                      addSuffix: true,
                    })
                  : 'Never'}
              </TableCell>
              <TableCell>
                <StatusBadge status={source.last_fetch_status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patchTrend } from '@/api/trends';
import type { Trend, PatchTrendPayload } from '@/api/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().max(2000, 'Description too long'),
  status: z.enum(['pending', 'approved', 'rejected']),
});

type EditFormValues = z.infer<typeof editSchema>;

interface TrendEditModalProps {
  trend: Trend | null;
  onClose: () => void;
}

export function TrendEditModal({ trend, onClose }: TrendEditModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    reset({
      title: trend?.title ?? '',
      category: trend?.category ?? '',
      description: trend?.description ?? '',
      status: trend?.status ?? 'pending',
    });
  }, [trend, reset]);

  const mutation = useMutation({
    mutationFn: (data: PatchTrendPayload) => patchTrend(trend!.Id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      toast.success('Trend updated');
      onClose();
    },
    onError: () => toast.error('Failed to update trend'),
  });

  const onSubmit = (values: EditFormValues) => mutation.mutate(values);

  return (
    <Dialog open={trend !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Edit Trend
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <Input {...register('title')} placeholder="Title" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Category
            </label>
            <Input
              {...register('category')}
              placeholder="e.g. gaming, music"
            />
            {errors.category && (
              <p className="text-xs text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              {...register('description')}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 resize-none"
              placeholder="Description"
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => { if (v) field.onChange(v); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-xs text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import {
  WORK_ORDER_PRIORITIES,
  workOrderCreateSchema,
  type WorkOrderCreate,
  type WorkOrderPriority,
} from '@fleet/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@fleet/ui';
import { PlusIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { capitalise } from './format';

type FieldErrors = Partial<Record<keyof WorkOrderCreate, string>>;

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

const emptyForm = (): WorkOrderCreate => ({
  assetId: '',
  title: '',
  priority: 'medium',
  dueDate: defaultDueDate(),
});

export function CreateWorkOrderDialog({
  onCreate,
}: {
  onCreate: (input: WorkOrderCreate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = <K extends keyof WorkOrderCreate>(key: K, value: WorkOrderCreate[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    // A field's error goes as soon as it is edited; the rest stay until the next submit.
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = workOrderCreateSchema.safeParse({
      ...form,
      assetId: form.assetId.trim().toUpperCase(),
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof WorkOrderCreate;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    // The dialog closes straight away; the new row appears optimistically in the table.
    onCreate(parsed.data);
    setOpen(false);
    setForm(emptyForm());
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon aria-hidden />
          New work order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>New work order</DialogTitle>
            <DialogDescription>It is added as open and assigned to the asset.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="wo-asset">Asset ID</Label>
            <Input
              id="wo-asset"
              placeholder="AST-00042"
              value={form.assetId}
              aria-invalid={Boolean(errors.assetId)}
              aria-describedby={errors.assetId ? 'wo-asset-error' : undefined}
              onChange={(event) => update('assetId', event.target.value)}
            />
            {errors.assetId && (
              <p id="wo-asset-error" className="text-sm text-destructive">
                {errors.assetId}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wo-title">Title</Label>
            <Input
              id="wo-title"
              placeholder="Replace hydraulic hose"
              value={form.title}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'wo-title-error' : undefined}
              onChange={(event) => update('title', event.target.value)}
            />
            {errors.title && (
              <p id="wo-title-error" className="text-sm text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="wo-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => update('priority', value as WorkOrderPriority)}
              >
                <SelectTrigger id="wo-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ORDER_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {capitalise(priority)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wo-due">Due date</Label>
              <Input
                id="wo-due"
                type="date"
                value={form.dueDate}
                aria-invalid={Boolean(errors.dueDate)}
                onChange={(event) => update('dueDate', event.target.value)}
              />
              {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

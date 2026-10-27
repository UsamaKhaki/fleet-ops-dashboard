import { z } from 'zod';

export const ASSET_TYPES = [
  'truck',
  'excavator',
  'loader',
  'crane',
  'generator',
  'forklift',
] as const;
export const ASSET_STATUSES = ['active', 'idle', 'maintenance', 'offline'] as const;
export const SITES = [
  'North Yard',
  'Harbour Depot',
  'Ridge Quarry',
  'Eastgate Site',
  'Central Hub',
] as const;

// Fictional operating area. The mock server keeps vehicles inside it and the live map
// projects it onto its canvas.
export const MAP_BOUNDS = { minLat: 51.4, maxLat: 51.6, minLng: -0.3, maxLng: 0.1 } as const;

export const SITE_LOCATIONS: Record<(typeof SITES)[number], { lat: number; lng: number }> = {
  'North Yard': { lat: 51.57, lng: -0.18 },
  'Harbour Depot': { lat: 51.43, lng: 0.05 },
  'Ridge Quarry': { lat: 51.45, lng: -0.26 },
  'Eastgate Site': { lat: 51.53, lng: 0.02 },
  'Central Hub': { lat: 51.5, lng: -0.1 },
};

export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const WORK_ORDER_STATUSES = ['open', 'in_progress', 'completed'] as const;

export const assetTypeSchema = z.enum(ASSET_TYPES);
export const assetStatusSchema = z.enum(ASSET_STATUSES);
export const siteSchema = z.enum(SITES);

export const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: assetTypeSchema,
  status: assetStatusSchema,
  site: siteSchema,
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  engineHours: z.number().int().nonnegative(),
  fuelPercent: z.number().min(0).max(100),
  updatedAt: z.iso.datetime(),
});
export type Asset = z.infer<typeof assetSchema>;
export type AssetType = z.infer<typeof assetTypeSchema>;
export type AssetStatus = z.infer<typeof assetStatusSchema>;
export type Site = z.infer<typeof siteSchema>;

export const assetPatchSchema = z
  .object({
    status: assetStatusSchema,
    site: siteSchema,
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'At least one field is required');
export type AssetPatch = z.infer<typeof assetPatchSchema>;

export const workOrderPrioritySchema = z.enum(WORK_ORDER_PRIORITIES);
export const workOrderStatusSchema = z.enum(WORK_ORDER_STATUSES);

export const workOrderSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetName: z.string(),
  title: z.string(),
  priority: workOrderPrioritySchema,
  status: workOrderStatusSchema,
  createdAt: z.iso.datetime(),
  dueDate: z.iso.date(),
  completedAt: z.iso.datetime().nullable(),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;
export type WorkOrderPriority = z.infer<typeof workOrderPrioritySchema>;
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const workOrderCreateSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  priority: workOrderPrioritySchema,
  dueDate: z.iso.date(),
});
export type WorkOrderCreate = z.infer<typeof workOrderCreateSchema>;

export const workOrderPatchSchema = z.object({ status: workOrderStatusSchema });
export type WorkOrderPatch = z.infer<typeof workOrderPatchSchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Query strings arrive as text, so list filters are comma separated and numbers are coerced.
const csvOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((raw) => raw.split(',').filter(Boolean))
    .pipe(z.array(z.enum(values)));

export const MAX_PAGE_SIZE = 1000;

const paginationShape = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(50),
  order: z.enum(['asc', 'desc']).default('asc'),
  q: z.string().trim().optional(),
};

export const ASSET_SORT_FIELDS = [
  'id',
  'name',
  'type',
  'status',
  'site',
  'year',
  'engineHours',
  'fuelPercent',
  'updatedAt',
] as const;
export type AssetSortField = (typeof ASSET_SORT_FIELDS)[number];

export const assetListQuerySchema = z.object({
  ...paginationShape,
  sort: z.enum(ASSET_SORT_FIELDS).default('id'),
  status: csvOf(ASSET_STATUSES).optional(),
  type: csvOf(ASSET_TYPES).optional(),
  site: csvOf(SITES).optional(),
});
export type ParsedAssetListQuery = z.output<typeof assetListQuerySchema>;
/** What a client sends: the parsed shape with every field optional, so defaults stay on the server. */
export type AssetListQuery = Partial<ParsedAssetListQuery>;

export const WORK_ORDER_SORT_FIELDS = ['id', 'priority', 'status', 'dueDate', 'createdAt'] as const;
export type WorkOrderSortField = (typeof WORK_ORDER_SORT_FIELDS)[number];

export const workOrderListQuerySchema = z.object({
  ...paginationShape,
  sort: z.enum(WORK_ORDER_SORT_FIELDS).default('createdAt'),
  // Newest first, which is also where an optimistically created work order is shown.
  order: z.enum(['asc', 'desc']).default('desc'),
  status: csvOf(WORK_ORDER_STATUSES).optional(),
  priority: csvOf(WORK_ORDER_PRIORITIES).optional(),
});
export type ParsedWorkOrderListQuery = z.output<typeof workOrderListQuerySchema>;
export type WorkOrderListQuery = Partial<ParsedWorkOrderListQuery>;

export const vehiclePositionSchema = z.object({
  assetId: z.string(),
  name: z.string(),
  status: assetStatusSchema,
  lat: z.number(),
  lng: z.number(),
  speedKph: z.number().nonnegative(),
  heading: z.number().min(0).max(360),
  reportedAt: z.iso.datetime(),
});
export type VehiclePosition = z.infer<typeof vehiclePositionSchema>;

export const liveMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('telemetry.snapshot'),
    vehicles: z.array(vehiclePositionSchema),
  }),
  z.object({
    type: z.literal('telemetry.update'),
    vehicles: z.array(vehiclePositionSchema),
  }),
  z.object({ type: z.literal('asset.updated'), asset: assetSchema }),
  z.object({ type: z.literal('workOrder.updated'), workOrder: workOrderSchema }),
]);
export type LiveMessage = z.infer<typeof liveMessageSchema>;

export const apiErrorBodySchema = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

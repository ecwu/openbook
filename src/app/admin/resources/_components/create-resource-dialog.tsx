"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createResourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.string().min(1, "Type is required").max(50),
  description: z.string().optional(),
  location: z.string().optional(),
  totalCapacity: z.number().min(1, "Capacity must be at least 1"),
  capacityUnit: z.string().min(1, "Capacity unit is required").max(50),
  isIndivisible: z.boolean(),
  minAllocation: z.number().min(1).optional(),
  maxAllocation: z.number().min(1).optional(),
  isActive: z.boolean(),
});

type CreateResourceForm = z.infer<typeof createResourceSchema>;

interface CreateResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const COMMON_RESOURCE_TYPES = [
  "gpu",
  "cpu",
  "memory",
  "storage",
  "compute",
  "server",
  "cluster",
  "other",
];

const COMMON_CAPACITY_UNITS = [
  "GB",
  "TB",
  "cores",
  "instances",
  "nodes",
  "units",
  "hours",
];

export function CreateResourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateResourceDialogProps) {
  const { toast } = useToast();
  const [customType, setCustomType] = useState("");
  const [customUnit, setCustomUnit] = useState("");

  const form = useForm<CreateResourceForm>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      location: "",
      totalCapacity: 1,
      capacityUnit: "",
      isIndivisible: false,
      minAllocation: undefined,
      maxAllocation: undefined,
      isActive: true,
    },
  });

  const createResource = api.resources.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Resource created successfully",
      });
      form.reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CreateResourceForm) => {
    // Use custom type/unit if provided
    const finalValues = {
      ...values,
      type: customType || values.type,
      capacityUnit: customUnit || values.capacityUnit,
    };

    createResource.mutate(finalValues);
  };

  const watchIsIndivisible = form.watch("isIndivisible");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Resource</DialogTitle>
          <DialogDescription>
            Add a new computing resource to the system
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GPU Server 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "custom") {
                          field.onChange("");
                        } else {
                          field.onChange(value);
                          setCustomType("");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_RESOURCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.value === "" && (
                      <Input
                        placeholder="Enter custom type"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the resource"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rack 1 Slot 4, Building A"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Physical location or server identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number.parseInt(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacityUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity Unit</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "custom") {
                          field.onChange("");
                        } else {
                          field.onChange(value);
                          setCustomUnit("");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_CAPACITY_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.value === "" && (
                      <Input
                        placeholder="Enter custom unit"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isIndivisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Indivisible Resource
                    </FormLabel>
                    <FormDescription>
                      Resource must be allocated entirely (cannot be shared)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!watchIsIndivisible && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Allocation</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Optional"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              Number.parseInt(e.target.value) || undefined
                            )
                          }
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum amount that can be allocated
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAllocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Allocation</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Optional"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              Number.parseInt(e.target.value) || undefined
                            )
                          }
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum amount per booking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Resource is available for bookings
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createResource.isPending}>
                {createResource.isPending ? "Creating..." : "Create Resource"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

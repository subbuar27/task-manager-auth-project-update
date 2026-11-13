"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required.").max(120, "Title must be 120 characters or fewer."),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer."),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

type TaskFormProps = {
  initialValues?: TaskFormValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onCancel?: () => void;
};

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function TaskForm({
  initialValues = { title: "", description: "", status: "TODO" },
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div>
        <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium">Title *</label>
        <input id="task-title" {...register("title")} maxLength={120} className={fieldClass} placeholder="Enter task title" />
        {errors.title && <p role="alert" className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="task-description" className="mb-1.5 block text-sm font-medium">Description</label>
        <textarea id="task-description" {...register("description")} maxLength={1000} rows={3} className={fieldClass} placeholder="Add task details (optional)" />
        {errors.description && <p role="alert" className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="task-status" className="mb-1.5 block text-sm font-medium">Status</label>
        <select id="task-status" {...register("status")} className={fieldClass}>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </select>
        {errors.status && <p role="alert" className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? "Saving..." : submitLabel}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium hover:bg-slate-50">Cancel</button>}
      </div>
    </form>
  );
}

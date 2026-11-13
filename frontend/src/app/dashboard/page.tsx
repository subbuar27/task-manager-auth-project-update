"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTodo, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthContext";
import TaskForm, { TaskFormValues } from "@/components/TaskForm";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
       router.replace("/login");
  }
}, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api<Task[]>("/api/tasks"),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (values: TaskFormValues) =>
      api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      setShowCreate(false);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => setPageError(error instanceof Error ? error.message : "Could not create task."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: TaskFormValues }) =>
      api<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: async () => {
      setEditingTask(null);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => setPageError(error instanceof Error ? error.message : "Could not update task."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<{ message: string }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => setPageError(error instanceof Error ? error.message : "Could not delete task."),
  });

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      accessorKey: "title",
      header: "Title",
      cell: info => <span className="font-semibold">{String(info.getValue())}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: info => <span className="whitespace-pre-wrap text-slate-600">{String(info.getValue() || "—")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: info => {
        const status = info.getValue<Task["status"]>();
        return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{statusLabel[status]}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditingTask(row.original)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-50">
            <Pencil size={14} /> Edit
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete "${row.original.title}"? This cannot be undone.`)) {
                deleteMutation.mutate(row.original.id);
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      ),
    },
  ], [deleteMutation.isPending]);

  const table = useReactTable({
    data: tasksQuery.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Checking your session...</main>;
  }
  if (!isAuthenticated || !user) {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Redirecting to login...</main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3 text-white"><ListTodo size={24} /></div>
            <div>
              <h1 className="text-xl font-bold">Task Manager</h1>
              <p className="text-sm text-slate-500">Hello, {user.name} · {user.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
            <LogOut size={17} /> Logout
          </button>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">My tasks</h2>
              <p className="text-sm text-slate-500">Only tasks belonging to your account are shown.</p>
            </div>
            <button onClick={() => { setEditingTask(null); setShowCreate(true); }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">
              <Plus size={18} /> New task
            </button>
          </div>

          {pageError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pageError}</p>}

          {showCreate && (
            <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Create a task</h3>
                <button aria-label="Close create form" onClick={() => setShowCreate(false)} className="rounded p-1 text-slate-500 hover:bg-white"><X size={18} /></button>
              </div>
              <TaskForm submitLabel="Create task" busy={createMutation.isPending} onSubmit={values => createMutation.mutate(values)} onCancel={() => setShowCreate(false)} />
            </div>
          )}

          {editingTask && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Edit task</h3>
                <button aria-label="Close edit form" onClick={() => setEditingTask(null)} className="rounded p-1 text-slate-500 hover:bg-white"><X size={18} /></button>
              </div>
              <TaskForm
                key={editingTask.id}
                initialValues={{ title: editingTask.title, description: editingTask.description, status: editingTask.status }}
                submitLabel="Save changes"
                busy={updateMutation.isPending}
                onSubmit={values => updateMutation.mutate({ id: editingTask.id, values })}
                onCancel={() => setEditingTask(null)}
              />
            </div>
          )}

          {tasksQuery.isLoading && <p className="py-8 text-center text-slate-500">Loading your tasks...</p>}
          {tasksQuery.isError && <p role="alert" className="py-8 text-center text-red-600">{tasksQuery.error instanceof Error ? tasksQuery.error.message : "Could not load tasks."}</p>}
          {tasksQuery.isSuccess && tasksQuery.data.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
              <ListTodo className="mx-auto mb-2 text-slate-400" size={32} />
              <p className="font-medium">No tasks yet</p>
              <p className="mt-1 text-sm text-slate-500">Select New task to create your first task.</p>
            </div>
          )}

          {tasksQuery.isSuccess && tasksQuery.data.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  {table.getHeaderGroups().map(group => (
                    <tr key={group.id}>
                      {group.headers.map(header => (
                        <th key={header.id} className="px-4 py-3 font-semibold">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="align-top hover:bg-slate-50/70">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

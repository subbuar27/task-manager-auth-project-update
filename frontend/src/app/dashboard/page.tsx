"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ListTodo, LogOut, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

type User = { id: string; name: string; email: string };
type Task = { id: string; title: string; description: string; status: "TODO" | "IN_PROGRESS" | "DONE"; createdAt: string };
type MeResponse = { user: User };

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/api/auth/me"),
    retry: false,
  });
  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api<Task[]>("/api/tasks"),
    enabled: me.isSuccess,
  });

  useEffect(() => {
    if (me.isError) router.replace("/login");
  }, [me.isError, router]);

  const createTask = useMutation({
    mutationFn: (values: { title: string; description: string }) =>
      api<Task>("/api/tasks", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not create task."),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task["status"] }) =>
      api<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api<{ message: string }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  async function logout() {
    try { await api("/api/auth/logout", { method: "POST" }); }
    finally {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    createTask.mutate({ title: title.trim(), description: description.trim() });
  }

  if (me.isLoading || (!me.isError && !me.data)) {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Checking your session...</main>;
  }
  if (me.isError) {
    return <main className="flex min-h-screen items-center justify-center text-slate-600">Redirecting to login...</main>;
  }

  const user = me.data.user;
  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3 text-white"><ListTodo size={24} /></div>
            <div><h1 className="text-xl font-bold">Task Manager</h1><p className="text-sm text-slate-500">Hello, {user.name}</p></div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"><LogOut size={17} /> Logout</button>
        </header>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create a task</h2>
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Task title (required)" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" />
            <input value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} placeholder="Description (optional)" className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" />
            <button disabled={createTask.isPending} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"><Plus size={18} /> Add</button>
          </form>
          {formError && <p role="alert" className="mt-3 text-sm text-red-600">{formError}</p>}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">My tasks</h2><span className="text-sm text-slate-500">{tasks.data?.length ?? 0} total</span></div>
          {tasks.isLoading && <p className="py-6 text-slate-500">Loading your tasks...</p>}
          {tasks.isError && <p role="alert" className="py-6 text-red-600">{tasks.error instanceof Error ? tasks.error.message : "Could not load tasks."}</p>}
          {tasks.isSuccess && tasks.data.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center"><ListTodo className="mx-auto mb-2 text-slate-400" size={30} /><p className="font-medium">No tasks yet</p><p className="mt-1 text-sm text-slate-500">Add your first task above.</p></div>}
          <div className="space-y-3">
            {tasks.data?.map(task => (
              <article key={task.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button aria-label={task.status === "DONE" ? "Mark as not done" : "Mark as done"} onClick={() => updateTask.mutate({ id: task.id, status: task.status === "DONE" ? "TODO" : "DONE" })} className="mt-0.5 text-indigo-600">{task.status === "DONE" ? <CheckCircle2 size={22} /> : <Circle size={22} />}</button>
                  <div className="min-w-0"><h3 className={`break-words font-semibold ${task.status === "DONE" ? "text-slate-400 line-through" : ""}`}>{task.title}</h3>{task.description && <p className="mt-1 break-words text-sm text-slate-600">{task.description}</p>}<span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{task.status.replace("_", " ")}</span></div>
                </div>
                <button aria-label={`Delete ${task.title}`} onClick={() => { if (window.confirm("Delete this task?")) deleteTask.mutate(task.id); }} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={18} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

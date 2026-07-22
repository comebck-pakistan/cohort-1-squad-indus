import { customFetch } from "@workspace/api-client-react";

export type WorkspaceGoal = {
  id: number;
  bakerId: number;
  label: string;
  metric: string;
  targetValue: number;
  period: string;
  currentValue: number;
  progressPercent: number;
  achieved: boolean;
  achievedAt: string | null;
};

export type WorkspaceNote = {
  id: number;
  bakerId: number;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceReminder = {
  id: number;
  bakerId: number;
  title: string;
  dueAt: string;
  done: boolean;
};

export type BakerWorkspace = {
  goals: WorkspaceGoal[];
  notes: WorkspaceNote[];
  reminders: WorkspaceReminder[];
};

export async function getBakerWorkspace(bakerId: number): Promise<BakerWorkspace> {
  return customFetch<BakerWorkspace>(`/api/bakers/${bakerId}/workspace`, {
    responseType: "json",
  });
}

export async function createBakerGoal(bakerId: number, data: { label: string; targetValue: number; metric?: string }) {
  return customFetch(`/api/bakers/${bakerId}/goals`, {
    method: "POST",
    responseType: "json",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function createBakerNote(bakerId: number, content: string) {
  return customFetch(`/api/bakers/${bakerId}/notes`, {
    method: "POST",
    responseType: "json",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function createBakerReminder(bakerId: number, data: { title: string; dueAt: string }) {
  return customFetch(`/api/bakers/${bakerId}/reminders`, {
    method: "POST",
    responseType: "json",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateBakerReminder(bakerId: number, reminderId: number, done: boolean) {
  return customFetch(`/api/bakers/${bakerId}/reminders/${reminderId}`, {
    method: "PATCH",
    responseType: "json",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
}

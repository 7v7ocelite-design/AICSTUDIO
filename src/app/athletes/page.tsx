"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import type { Athlete } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Users, Plus, Search, Edit2, Trash2, User } from "lucide-react";
import { toast } from "sonner";

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [form, setForm] = useState({
    name: "",
    sport: "",
    team: "",
    headshot_url: "",
  });
  const [saving, setSaving] = useState(false);

  async function fetchAthletes() {
    try {
      const res = await fetch("/api/athletes");
      if (res.ok) {
        const data = await res.json();
        setAthletes(data.athletes || []);
      }
    } catch {
      toast.error("Failed to load athletes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAthletes();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", sport: "", team: "", headshot_url: "" });
    setModalOpen(true);
  }

  function openEdit(a: Athlete) {
    setEditing(a);
    setForm({
      name: a.name,
      sport: a.sport,
      team: a.team,
      headshot_url: a.headshot_url || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.sport) {
      toast.error("Name and sport are required");
      return;
    }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch("/api/athletes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editing ? "Athlete updated" : "Athlete created");
        setModalOpen(false);
        fetchAthletes();
      } else {
        toast.error("Failed to save athlete");
      }
    } catch {
      toast.error("Failed to save athlete");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this athlete?")) return;
    try {
      const res = await fetch("/api/athletes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Athlete deleted");
        fetchAthletes();
      }
    } catch {
      toast.error("Failed to delete athlete");
    }
  }

  const filtered = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.sport.toLowerCase().includes(search.toLowerCase()) ||
      a.team.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Athletes</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage athlete profiles for content generation
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Athlete
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Search athletes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            {search ? "No athletes match your search" : "No athletes yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? "Try a different search term"
              : "Add your first athlete to get started"}
          </p>
          {!search && (
            <Button onClick={openCreate} className="mt-4">
              <Plus className="h-4 w-4" />
              Add Athlete
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((athlete) => (
            <Card key={athlete.id} hover className="group relative">
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(athlete)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(athlete.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent/10">
                  {athlete.headshot_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={athlete.headshot_url}
                      alt={athlete.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-brand-accent" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{athlete.name}</h3>
                  <p className="text-sm text-gray-400">{athlete.sport}</p>
                  <p className="text-xs text-gray-500">{athlete.team}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Added {formatDate(athlete.created_at)}</span>
                <span>
                  {athlete.reference_photos?.length || 0} reference photos
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Athlete" : "Add Athlete"}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., LeBron James"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Sport"
            placeholder="e.g., Basketball"
            value={form.sport}
            onChange={(e) => setForm({ ...form, sport: e.target.value })}
          />
          <Input
            label="Team"
            placeholder="e.g., Los Angeles Lakers"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
          />
          <Input
            label="Headshot URL"
            placeholder="https://..."
            value={form.headshot_url}
            onChange={(e) =>
              setForm({ ...form, headshot_url: e.target.value })
            }
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

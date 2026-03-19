"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Athlete } from "@/lib/types";

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/athletes", { cache: "no-store" });
      const payload = (await response.json()) as { athletes: Athlete[] };
      setAthletes(payload.athletes ?? []);
    } catch {
      toast.error("Failed to load athletes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return athletes.filter(
      (athlete) => athlete.name.toLowerCase().includes(q) || athlete.sport.toLowerCase().includes(q)
    );
  }, [athletes, search]);

  const createAthlete = async () => {
    if (!name.trim() || !sport.trim()) {
      toast.error("Name and sport are required.");
      return;
    }

    const response = await fetch("/api/athletes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), sport: sport.trim() })
    });

    if (!response.ok) {
      toast.error("Could not create athlete.");
      return;
    }

    toast.success("Athlete created.");
    setName("");
    setSport("");
    void load();
  };

  const deleteAthlete = async (id: string) => {
    const response = await fetch("/api/athletes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      toast.error("Delete failed.");
      return;
    }

    setAthletes((prev) => prev.filter((athlete) => athlete.id !== id));
    toast.success("Athlete removed.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Athletes"
        description="Manage athlete profiles used for prompt assembly and personalized video generation."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Athlete</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            placeholder="Athlete name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input placeholder="Sport" value={sport} onChange={(event) => setSport(event.target.value)} />
          <Button onClick={createAthlete} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Athlete Library</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                className="pl-9"
                placeholder="Search athletes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">No athletes match this search.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-slate-900/40 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-100">{athlete.name}</p>
                    <p className="text-sm text-slate-400">{athlete.sport}</p>
                  </div>
                  <Button variant="ghost" onClick={() => deleteAthlete(athlete.id)} className="text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

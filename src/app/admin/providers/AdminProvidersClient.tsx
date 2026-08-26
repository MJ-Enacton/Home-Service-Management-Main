"use client";

import { useMemo, useState } from "react";
import { HardHat, Search, Wrench } from "lucide-react";

import { BanUnbanDialog } from "../_components/BanUnbanDialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProviderWithServices {
  id: string;
  name: string;
  email: string;
  contact: string | null;
  banned: boolean;
  banReason: string | null;
  serviceList: { id: string; name: string; description: string | null }[];
}

export function AdminProvidersClient({
  providers,
}: {
  providers: ProviderWithServices[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "banned" | "active">(
    "all",
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return providers.filter((provider) => {
      if (statusFilter === "banned" && !provider.banned) return false;
      if (statusFilter === "active" && provider.banned) return false;

      if (!query) return true;

      return (
        provider.name.toLowerCase().includes(query) ||
        provider.email.toLowerCase().includes(query)
      );
    });
  }, [providers, search, statusFilter]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All service providers and the services they offer.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search providers..."
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "banned"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === value
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <HardHat className="size-8 text-muted-foreground" />
            <p className="font-medium">No providers found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((provider) => (
            <Card key={provider.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b [.border-b]:pb-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 truncate">
                    <span className="truncate">{provider.name}</span>
                    {provider.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </CardTitle>
                  <p className="truncate text-sm text-muted-foreground">
                    {provider.email}
                  </p>
                  {provider.contact && (
                    <p className="text-xs text-muted-foreground">
                      {provider.contact}
                    </p>
                  )}
                </div>
                <BanUnbanDialog target={provider} />
              </CardHeader>
              <CardContent className="pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <Wrench className="size-3.5" />
                  Services ({provider.serviceList.length})
                </p>
                {provider.serviceList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No services added yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {provider.serviceList.map((service) => (
                      <Badge key={service.id} variant="secondary">
                        {service.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {provider.banned && provider.banReason && (
                  <p className="mt-3 rounded-md bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-300">
                    Ban reason: {provider.banReason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

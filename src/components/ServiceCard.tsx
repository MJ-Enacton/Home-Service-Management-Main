import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  id: string;
  name: string;
  description: string | null;
  hasImage?: boolean;
  imageAlt?: string | null;
}

export function ServiceCard({
  id,
  name,
  description,
  hasImage,
  imageAlt,
}: ServiceCardProps) {
  return (
    <Link href={`/services/${id}`} className="group block h-full">
      <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-zinc-900/5 dark:group-hover:shadow-black/20">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/services/${id}/image`}
            alt={imageAlt || `${name} service`}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40">
            <Hammer className="size-10 text-blue-300 dark:text-blue-700" />
          </div>
        )}
        <CardContent className="pt-4">
          <h3 className="font-semibold">{name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {description || "Professional service at your doorstep."}
          </p>
          <p className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
            Book now
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

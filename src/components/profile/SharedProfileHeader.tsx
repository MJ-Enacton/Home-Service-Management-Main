import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SharedProfileHeaderProps {
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  contact?: string | null;
}

export function SharedProfileHeader({ name, email, image, role, contact }: SharedProfileHeaderProps) {
  const initials =
    name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="mb-6 flex gap-4 rounded-xl border bg-white p-4 dark:bg-zinc-900">
      <Avatar className="size-14">
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback className="bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{name}</h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <div className="mt-2 flex items-center gap-2">
          {role && <Badge variant="secondary" className="capitalize">{role}</Badge>}
          {contact && <span className="text-xs text-muted-foreground">{contact}</span>}
        </div>
      </div>
    </div>
  );
}

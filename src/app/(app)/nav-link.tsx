
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
    href: string;
    children: React.ReactNode;
    mobile?: boolean;
};

export default function NavLink({ href, children, mobile = false }: NavLinkProps) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                "transition-colors",
                mobile ? "text-muted-foreground hover:text-foreground" : "text-foreground",
                isActive && !mobile ? "" : "text-muted-foreground",
                mobile && isActive ? "text-foreground" : "text-muted-foreground"
            )}
        >
            {children}
        </Link>
    );
}

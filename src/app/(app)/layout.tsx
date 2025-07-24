"use client";

import Link from "next/link";
import * as React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  Users,
  ListChecks,
  BookText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import NavLink from "./nav-link";
import { useToast } from "@/hooks/use-toast";
import { checkDbConnection } from "./actions";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inspections", icon: ClipboardList, label: "Inspections" },
  { href: "/hirac", icon: ListChecks, label: "HIRAC" },
  { href: "/hirac-guidelines", icon: BookText, label: "Guidelines" },
  { href: "/admin", icon: Users, label: "Admin Panel" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  React.useEffect(() => {
    // Only run this check once per session on the client
    // if (!sessionStorage.getItem('db_checked')) {
    //     checkDbConnection().then(result => {
    //         if (result.ok) {
    //             toast({
    //                 title: "Database Connected",
    //                 description: "Successfully connected to the database.",
    //             });
    //         } else {
    //              toast({
    //                 variant: 'destructive',
    //                 title: "Database Connection Failed",
    //                 description: result.error,
    //             });
    //         }
    //         sessionStorage.setItem('db_checked', 'true');
    //     });
    // }
  }, [toast]);


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-[5px] md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="sr-only">SafetySight</span>
          </Link>
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="">SafetySight</span>
              </Link>
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} mobile>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial"></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarImage
                    src="https://placehold.co/40x40.png"
                    alt="Safety Officer"
                    data-ai-hint="profile avatar"
                  />
                  <AvatarFallback>SO</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem asChild>
                  <Link href="/">Log Out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 py-4 px-[5px] md:gap-8 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

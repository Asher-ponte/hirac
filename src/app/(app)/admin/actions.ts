
'use server';

import { db } from '@/lib/db';
import { users, departments } from '@/lib/db/schema';
import type { User, UserRole, Department } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { eq, desc } from 'drizzle-orm';

// User Actions
export async function getUsers(): Promise<User[]> {
    return await db.query.users.findMany({ orderBy: desc(users.id) });
}

export async function upsertUser(userData: { id?: number, name: string, email: string, role: UserRole }) {
    if (userData.id) {
        await db.update(users).set(userData).where(eq(users.id, userData.id));
    } else {
        await db.insert(users).values(userData);
    }
    revalidatePath('/admin');
}

export async function deleteUser(id: number) {
    // Check if user is a supervisor
    const supervising = await db.query.departments.findFirst({ where: eq(departments.supervisorId, id) });
    if (supervising) {
        throw new Error("Cannot delete user. They are assigned as a supervisor to a department.");
    }
    await db.delete(users).where(eq(users.id, id));
    revalidatePath('/admin');
}

// Department Actions
export async function getDepartments(options?: { withSupervisor: boolean }): Promise<Department[]> {
    if (options?.withSupervisor) {
        return await db.query.departments.findMany({
            with: { supervisor: true },
            orderBy: desc(departments.id)
        });
    }
    return await db.query.departments.findMany({ orderBy: desc(departments.id) });
}

export async function upsertDepartment(deptData: { id?: number, name: string, supervisorId?: number | null }) {
    const dataToInsert = {
        name: deptData.name,
        supervisorId: deptData.supervisorId === null ? null : deptData.supervisorId,
    };

    if (deptData.id) {
        await db.update(departments).set(dataToInsert).where(eq(departments.id, deptData.id));
    } else {
        await db.insert(departments).values(dataToInsert);
    }
    revalidatePath('/admin');
    revalidatePath('/hirac');
}

export async function deleteDepartment(id: number) {
    await db.delete(departments).where(eq(departments.id, id));
    revalidatePath('/admin');
    revalidatePath('/hirac');
}

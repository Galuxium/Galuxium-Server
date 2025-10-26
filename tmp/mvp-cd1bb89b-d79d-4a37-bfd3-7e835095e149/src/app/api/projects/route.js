import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const projects = await prisma.project.findMany();
        return NextResponse.json(projects);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name, description, userId } = await request.json();

        if (!name || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                userId,
            },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
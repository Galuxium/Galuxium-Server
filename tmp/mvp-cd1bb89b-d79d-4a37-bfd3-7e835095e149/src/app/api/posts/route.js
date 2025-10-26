import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const posts = await prisma.post.findMany();
    return NextResponse.json(posts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, content, authorId } = await request.json();

    if (!title || !authorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
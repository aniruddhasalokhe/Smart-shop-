import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, attendances } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Log attendance
    await db.insert(attendances).values({
      id: `att-${Date.now()}`,
      userId: user.id,
      loginTime: new Date()
    });

    // Create session token
    const token = await signToken({ id: user.id, role: user.role, name: user.name });

    const cookieStore = await cookies();
    cookieStore.set('shopfloor_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return NextResponse.json({ 
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

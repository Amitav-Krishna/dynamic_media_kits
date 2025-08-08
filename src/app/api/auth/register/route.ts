import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await register(name, email, password, ipAddress, userAgent);

    if (result.success) {
      return NextResponse.json({
        success: true,
        agency: result.agency
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Invalid request data'
    }, { status: 400 });
  }
}

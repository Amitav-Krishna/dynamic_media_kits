import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await logout();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during logout'
    }, { status: 500 });
  }
}

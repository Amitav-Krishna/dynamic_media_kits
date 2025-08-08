import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const agency = await getSession();

    if (agency) {
      return NextResponse.json({
        success: true,
        agency: agency
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No valid session'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while checking session'
    }, { status: 500 });
  }
}

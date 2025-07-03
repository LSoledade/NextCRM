import { supabaseAdmin } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { role } = await request.json();
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
      user_metadata: { role },
    });

    if (error) throw error;
    return NextResponse.json(data.user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

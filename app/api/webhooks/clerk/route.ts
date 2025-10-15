import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const payload = await req.json();
  const headersList = await headers();

  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Invalid headers' }, { status: 400 });
  }

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');
  
  try {
    webhook.verify(JSON.stringify(payload), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // DEBUG: Log the full payload to see what's available
  console.log('Webhook payload:', JSON.stringify(payload, null, 2));

  if (payload.type === 'user.created') {
    const { id, email_addresses, unsafe_metadata, public_metadata } = payload.data;
    const email = email_addresses[0]?.email_address;
    
    // Get referrerId from metadata (where it was set in SignUp component)
    const referrerId = 
      unsafe_metadata?.referrerId || 
      public_metadata?.referrerId || 
      null;

    console.log('Creating user with referrerId:', referrerId);

    try {
      // Check if referrer exists (optional validation)
      if (referrerId) {
        const referrerExists = await prisma.user.findUnique({
          where: { id: referrerId },
        });
        
        if (!referrerExists) {
          console.warn(`Referrer ID ${referrerId} not found in database`);
        }
      }

      // Use upsert to handle duplicate email scenarios
      await prisma.user.upsert({
        where: { email },
        update: {
          // Optionally update referrerId if it wasn't set before
          ...(referrerId && { referrerId }),
        },
        create: {
          id,
          email,
          referrerId,
        },
      });

      console.log(`User ${email} created/updated successfully`);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
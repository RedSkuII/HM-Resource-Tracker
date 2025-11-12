import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, getUserIdentifier } from '@/lib/auth';
import { db } from '@/lib/db';
import { discordOrders, resourceHistory, resources, websiteChanges } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { hasResourceAdminAccess } from '@/lib/discord-roles';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/discord/orders/[id]
 * Fulfill or cancel a Discord order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !hasResourceAdminAccess(session.user.roles)) {
      return NextResponse.json(
        { error: 'Unauthorized - requires resource admin access' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    const orderId = params.id;
    const userIdentifier = getUserIdentifier(session);

    if (!action || !['fulfill', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "fulfill" or "cancel"' },
        { status: 400 }
      );
    }

    // Get order details
    const [order] = await db
      .select()
      .from(discordOrders)
      .where(eq(discordOrders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order already ${order.status}` },
        { status: 400 }
      );
    }

    const currentTime = new Date();

    if (action === 'fulfill') {
      // Mark order as fulfilled
      await db
        .update(discordOrders)
        .set({
          status: 'fulfilled',
          fulfilledBy: userIdentifier,
          fulfilledAt: currentTime,
        })
        .where(eq(discordOrders.id, orderId));

      // Log website change for bot to detect
      await db.insert(websiteChanges).values({
        id: nanoid(),
        changeType: 'order_fulfilled',
        resourceId: order.resourceId,
        orderId: order.id,
        previousValue: 'pending',
        newValue: 'fulfilled',
        changedBy: userIdentifier,
        createdAt: currentTime,
        processedByBot: false,
      });

      return NextResponse.json({
        message: 'Order fulfilled successfully',
        order: { ...order, status: 'fulfilled', fulfilledBy: userIdentifier },
      });

    } else if (action === 'cancel') {
      // Get current resource quantity
      const [resource] = await db
        .select()
        .from(resources)
        .where(eq(resources.id, order.resourceId))
        .limit(1);

      if (!resource) {
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        );
      }

      const previousQuantity = resource.quantity;
      const newQuantity = previousQuantity + order.quantity; // Restore stock

      // Update resource quantity
      await db
        .update(resources)
        .set({
          quantity: newQuantity,
          updatedAt: currentTime,
          lastUpdatedBy: userIdentifier,
        })
        .where(eq(resources.id, order.resourceId));

      // Create history entry
      await db.insert(resourceHistory).values({
        id: nanoid(),
        resourceId: order.resourceId,
        previousQuantity,
        newQuantity,
        changeAmount: order.quantity,
        changeType: 'relative',
        updatedBy: 'system',
        reason: `order_cancelled (Order #${orderId} by ${order.username})`,
        createdAt: currentTime,
      });

      // Mark order as cancelled
      await db
        .update(discordOrders)
        .set({
          status: 'cancelled',
        })
        .where(eq(discordOrders.id, orderId));

      // Log website change for bot to detect
      await db.insert(websiteChanges).values({
        id: nanoid(),
        changeType: 'order_cancelled',
        resourceId: order.resourceId,
        orderId: order.id,
        previousValue: 'pending',
        newValue: 'cancelled',
        changedBy: userIdentifier,
        createdAt: currentTime,
        processedByBot: false,
      });

      return NextResponse.json({
        message: 'Order cancelled and stock restored',
        order: { ...order, status: 'cancelled' },
        stockRestored: order.quantity,
      });
    }

  } catch (error) {
    console.error('Error updating Discord order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

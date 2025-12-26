/**
 * Event Emitter Layer
 * 
 * This is the foundation for all automations. Every major action in the system
 * emits an event that the Automation Center can subscribe to.
 */

type EventType =
  | "booking.created"
  | "booking.updated"
  | "booking.status.changed"
  | "booking.assigned"
  | "booking.completed"
  | "sitter.assigned"
  | "sitter.unassigned"
  | "sitter.changed"
  | "sitter.checked_in"
  | "sitter.checked_out"
  | "payment.success"
  | "payment.failed"
  | "visit.overdue"
  | "visit.completed"
  | "client.created"
  | "sitter.tier.changed"
  | "custom";

type EventContext = Record<string, any>;

type EventHandler = (context: EventContext) => Promise<void> | void;

class EventEmitter {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];

  /**
   * Subscribe to a specific event type
   */
  on(eventType: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  async emit(eventType: EventType, context: EventContext): Promise<void> {
    // Call specific handlers
    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }

    // Call global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler({ ...context, eventType });
      } catch (error) {
        console.error(`Error in global event handler for ${eventType}:`, error);
      }
    }
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers = [];
  }
}

// Singleton instance
export const eventEmitter = new EventEmitter();

/**
 * Helper functions to emit common events
 */
export async function emitBookingCreated(booking: any): Promise<void> {
  await eventEmitter.emit("booking.created", {
    bookingId: booking.id,
    booking,
    service: booking.service,
    clientName: `${booking.firstName} ${booking.lastName}`,
    clientPhone: booking.phone,
    clientEmail: booking.email,
    totalPrice: booking.totalPrice,
    status: booking.status,
  });
}

export async function emitBookingUpdated(booking: any, previousStatus?: string): Promise<void> {
  await eventEmitter.emit("booking.updated", {
    bookingId: booking.id,
    booking,
    previousStatus,
    service: booking.service,
    clientName: `${booking.firstName} ${booking.lastName}`,
    totalPrice: booking.totalPrice,
    status: booking.status,
  });

  // Also emit status change if status changed
  if (previousStatus && previousStatus !== booking.status) {
    await eventEmitter.emit("booking.status.changed", {
      bookingId: booking.id,
      booking,
      previousStatus,
      newStatus: booking.status,
      service: booking.service,
    });
  }
}

export async function emitSitterAssigned(booking: any, sitter: any): Promise<void> {
  await eventEmitter.emit("sitter.assigned", {
    bookingId: booking.id,
    booking,
    sitterId: sitter.id,
    sitter,
    service: booking.service,
    clientName: `${booking.firstName} ${booking.lastName}`,
  });

  await eventEmitter.emit("booking.assigned", {
    bookingId: booking.id,
    booking,
    sitterId: sitter.id,
    sitter,
  });
}

export async function emitSitterUnassigned(booking: any, sitterId: string): Promise<void> {
  await eventEmitter.emit("sitter.unassigned", {
    bookingId: booking.id,
    booking,
    sitterId,
    service: booking.service,
  });
}

export async function emitPaymentSuccess(booking: any, amount: number): Promise<void> {
  await eventEmitter.emit("payment.success", {
    bookingId: booking.id,
    booking,
    amount,
    service: booking.service,
    clientName: `${booking.firstName} ${booking.lastName}`,
  });
}

export async function emitPaymentFailed(booking: any, error: string): Promise<void> {
  await eventEmitter.emit("payment.failed", {
    bookingId: booking.id,
    booking,
    error,
    service: booking.service,
  });
}

export async function emitSitterCheckedIn(booking: any, sitter: any, timeSlot?: any): Promise<void> {
  await eventEmitter.emit("sitter.checked_in", {
    bookingId: booking.id,
    booking,
    sitterId: sitter.id,
    sitter,
    timeSlot,
    service: booking.service,
  });
}

export async function emitSitterCheckedOut(booking: any, sitter: any, timeSlot?: any): Promise<void> {
  await eventEmitter.emit("sitter.checked_out", {
    bookingId: booking.id,
    booking,
    sitterId: sitter.id,
    sitter,
    timeSlot,
    service: booking.service,
  });
}

export async function emitVisitCompleted(booking: any, report: any): Promise<void> {
  await eventEmitter.emit("visit.completed", {
    bookingId: booking.id,
    booking,
    report,
    service: booking.service,
  });
}

export async function emitSitterTierChanged(sitter: any, previousTierId: string | null, newTierId: string): Promise<void> {
  await eventEmitter.emit("sitter.tier.changed", {
    sitterId: sitter.id,
    sitter,
    previousTierId,
    newTierId,
  });
}

export async function emitClientCreated(client: any): Promise<void> {
  await eventEmitter.emit("client.created", {
    clientId: client.id,
    client,
    clientName: `${client.firstName} ${client.lastName}`,
    phone: client.phone,
    email: client.email,
  });
}

export async function emitCustomEvent(eventName: string, context: EventContext): Promise<void> {
  await eventEmitter.emit("custom", {
    ...context,
    customEventName: eventName,
  });
}



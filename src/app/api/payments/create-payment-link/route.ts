import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { calculatePriceBreakdown } from "@/lib/booking-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        pets: true,
        sitter: true,
        timeSlots: true, // Include timeSlots to calculate quantities
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let customer;
    if (booking.email) {
      const existingCustomers = await stripe.customers.list({
        email: booking.email,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: booking.email,
          name: `${booking.firstName} ${booking.lastName}`,
          phone: booking.phone,
        });
      }
    }

    // Calculate the true total using price breakdown
    const breakdown = calculatePriceBreakdown(booking);
    const calculatedTotal = breakdown.total;
    
    // Stripe product IDs mapping
    // 30 min drop in - prod_Rl01hX4ZnMjyUw
    // 60 min drop in - prod_ShJTVMShHBwi0o
    // 30 min walk - prod_Rl026cvNa4BMWR
    // 60 min walk - prod_TL04HXcE0bnF0P
    // Additional pet for pet taxi, drop ins, walks - prod_ShJPPmGgqrJoFL
    // Additional pet for house sitting and 24/7 care - prod_ShJNSDo3hN9JDj
    // House sitting - prod_Rl02B1KaOPO5pt
    // 24/7 care - prod_ShJRl7fx9eG6Q8

    const STRIPE_PRODUCTS = {
      DROP_IN_30: 'prod_Rl01hX4ZnMjyUw',
      DROP_IN_60: 'prod_ShJTVMShHBwi0o',
      WALK_30: 'prod_Rl026cvNa4BMWR',
      WALK_60: 'prod_TL04HXcE0bnF0P',
      ADDITIONAL_PET_DROP_WALK_TAXI: 'prod_ShJPPmGgqrJoFL',
      ADDITIONAL_PET_HOUSE_24_7: 'prod_ShJNSDo3hN9JDj',
      HOUSE_SITTING: 'prod_Rl02B1KaOPO5pt',
      CARE_24_7: 'prod_ShJRl7fx9eG6Q8',
    };

    // Determine which base product to use based on service and duration
    let baseProductId: string | null = null;
    let additionalPetProductId: string | null = null;
    const lineItems: any[] = [];

    if (booking.service === 'Drop-ins' || booking.service === 'Dog Walking') {
      // For drop-ins and walks, count 30 min vs 60 min timeSlots separately
      let count30 = 0;
      let count60 = 0;
      
      console.log(`Booking ${bookingId} has ${booking.timeSlots?.length || 0} timeSlots`);
      
      if (booking.timeSlots && booking.timeSlots.length > 0) {
        booking.timeSlots.forEach(ts => {
          const dur = ts.duration || 30;
          console.log(`TimeSlot duration: ${dur} minutes`);
          if (dur >= 60) {
            count60++;
          } else {
            count30++;
          }
        });
        console.log(`Counted: ${count30} x 30 min, ${count60} x 60 min`);
      } else {
        // Fallback if no timeSlots
        console.log(`No timeSlots found, using fallback: minutes=${booking.minutes}, quantity=${booking.quantity}`);
        const duration = booking.minutes || 30;
        const quantity = booking.quantity || 1;
        if (duration >= 60) {
          count60 = quantity;
        } else {
          count30 = quantity;
        }
      }
      
      // Create separate line items for 30 min and 60 min services
      if (count30 > 0) {
        const product30 = booking.service === 'Drop-ins' ? STRIPE_PRODUCTS.DROP_IN_30 : STRIPE_PRODUCTS.WALK_30;
        const expectedPrice = 20; // $20 for 30 min drop-ins and walks
        const prices30 = await stripe.prices.list({
          product: product30,
          active: true,
          limit: 100,
        });
        const price30 = prices30.data.find(p => p.type === 'one_time') || prices30.data[0];
        if (price30) {
          const actualPrice = price30.unit_amount ? price30.unit_amount / 100 : 0; // Convert cents to dollars
          console.log(`Added ${count30} x ${booking.service} (30 min) - Product: ${product30}, Price: ${price30.id}, Amount: $${actualPrice}`);
          
          if (actualPrice !== expectedPrice && actualPrice > 0) {
            console.warn(`⚠️ WARNING: 30 min ${booking.service} price is $${actualPrice} but expected $${expectedPrice}. Please update the price in Stripe for product ${product30}.`);
          }
          
          lineItems.push({
            price: price30.id,
            quantity: count30,
          });
        } else {
          console.error(`No prices found for 30 min ${booking.service} product ${product30}`);
          throw new Error(`No active prices found for 30 min ${booking.service} product ${product30}`);
        }
      }
      
      if (count60 > 0) {
        const product60 = booking.service === 'Drop-ins' ? STRIPE_PRODUCTS.DROP_IN_60 : STRIPE_PRODUCTS.WALK_60;
        const expectedPrice = booking.service === 'Drop-ins' ? 32 : 32; // $32 for 60 min drop-ins and walks
        const prices60 = await stripe.prices.list({
          product: product60,
          active: true,
          limit: 100,
        });
        const price60 = prices60.data.find(p => p.type === 'one_time') || prices60.data[0];
        if (price60) {
          const actualPrice = price60.unit_amount ? price60.unit_amount / 100 : 0; // Convert cents to dollars
          console.log(`Added ${count60} x ${booking.service} (60 min) - Product: ${product60}, Price: ${price60.id}, Amount: $${actualPrice}`);
          
          if (actualPrice !== expectedPrice && actualPrice > 0) {
            console.warn(`⚠️ WARNING: 60 min ${booking.service} price is $${actualPrice} but expected $${expectedPrice}. Please update the price in Stripe for product ${product60}.`);
          }
          
          lineItems.push({
            price: price60.id,
            quantity: count60,
          });
        } else {
          console.error(`No prices found for 60 min ${booking.service} product ${product60}`);
          throw new Error(`No active prices found for 60 min ${booking.service} product ${product60}`);
        }
      }
      
      additionalPetProductId = STRIPE_PRODUCTS.ADDITIONAL_PET_DROP_WALK_TAXI;
      
      // Skip the single product logic below since we've already added line items
      baseProductId = null;
    } else if (booking.service === 'Housesitting' || booking.service === '24/7 Care') {
      // For house sitting and 24/7 care, calculate number of nights
      const startDate = new Date(booking.startAt);
      const endDate = new Date(booking.endAt);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (booking.service === 'Housesitting') {
        baseProductId = STRIPE_PRODUCTS.HOUSE_SITTING;
      } else {
        baseProductId = STRIPE_PRODUCTS.CARE_24_7;
      }
      additionalPetProductId = STRIPE_PRODUCTS.ADDITIONAL_PET_HOUSE_24_7;
      
      console.log(`House sitting/24-7 care: ${diffDays} nights from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Store the number of nights to use as quantity later
      (booking as any).nights = diffDays;
    } else if (booking.service === 'Pet Taxi') {
      // For Pet Taxi, we'll need to create a custom product or use a default
      // For now, let's create a product (since no product ID was provided)
      baseProductId = null;
      additionalPetProductId = STRIPE_PRODUCTS.ADDITIONAL_PET_DROP_WALK_TAXI;
    }

    if (baseProductId) {
      // Get all active prices for the base product
      const basePrices = await stripe.prices.list({
        product: baseProductId,
        active: true,
        limit: 100,
      });

      // Use the first available price (prefer one-time prices, but use any active price)
      const basePrice = basePrices.data.find(p => p.type === 'one_time') || basePrices.data[0];
      if (basePrice) {
        // Calculate quantity based on service type
        let quantity = 1;
        if (booking.service === 'Drop-ins' || booking.service === 'Dog Walking' || booking.service === 'Pet Taxi') {
          // For visit-based services, use timeSlots length if available, otherwise use booking.quantity
          quantity = booking.timeSlots?.length || booking.quantity || 1;
        } else if (booking.service === 'Housesitting' || booking.service === '24/7 Care') {
          // For house sitting/24-7 care, quantity is the number of nights
          const startDate = new Date(booking.startAt);
          const endDate = new Date(booking.endAt);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          quantity = diffDays || 1; // Default to 1 if calculation fails
          console.log(`House sitting/24-7 care quantity (nights): ${quantity}`);
        } else {
          quantity = booking.quantity || 1;
        }
        
        console.log(`Using existing product ${baseProductId} with price ${basePrice.id} (quantity: ${quantity})`);
        lineItems.push({
          price: basePrice.id,
          quantity: quantity,
        });
      } else {
        console.error(`No prices found for product ${baseProductId}. Product exists but has no active prices.`);
        console.log(`Product details:`, await stripe.products.retrieve(baseProductId).catch(() => ({ error: 'Could not retrieve product' })));
        throw new Error(`No active prices found for product ${baseProductId}. Please ensure the product has at least one active price in your Stripe dashboard.`);
      }
    }

    // Add additional pet products if there are multiple pets
    if (additionalPetProductId && booking.pets.length > 1) {
      const additionalPetsCount = booking.pets.length - 1;
      
      // Get prices for additional pet product
      const additionalPetPrices = await stripe.prices.list({
        product: additionalPetProductId,
        active: true,
        limit: 100,
      });

      // Use the first available price (prefer one-time prices, but use any active price)
      const additionalPetPrice = additionalPetPrices.data.find(p => p.type === 'one_time') || additionalPetPrices.data[0];
      if (additionalPetPrice) {
        // For services with quantity (multiple visits), multiply by quantity
        // For house sitting/24-7, it's per booking, so multiply by number of nights
        const isPerVisitService = booking.service === 'Drop-ins' || booking.service === 'Dog Walking' || booking.service === 'Pet Taxi';
        let additionalPetQuantity = additionalPetsCount;
        
        if (isPerVisitService) {
          // For visit-based services, multiply by total number of visits (30 min + 60 min)
          // For Drop-ins/Dog Walking, we need to count all visits regardless of duration
          const visitCount = booking.timeSlots?.length || booking.quantity || 1;
          additionalPetQuantity = additionalPetsCount * visitCount;
        } else if (booking.service === 'Housesitting' || booking.service === '24/7 Care') {
          // For house sitting/24-7, multiply by number of nights
          const startDate = new Date(booking.startAt);
          const endDate = new Date(booking.endAt);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          additionalPetQuantity = additionalPetsCount * diffDays;
        }
        
        console.log(`Using existing additional pet product ${additionalPetProductId} with price ${additionalPetPrice.id} (quantity: ${additionalPetQuantity})`);
        lineItems.push({
          price: additionalPetPrice.id,
          quantity: additionalPetQuantity,
        });
      } else {
        console.error(`No prices found for additional pet product ${additionalPetProductId}`);
        console.log(`Product exists but has no active prices. Payment link will be created without additional pet charges.`);
        // Don't throw error here, just log it - the payment link can still be created without additional pets
        // But we should warn the user
        console.warn(`Warning: Additional pets will not be charged because product ${additionalPetProductId} has no active prices.`);
      }
    }

    // If no base product ID or no prices found, fall back to creating custom product
    // This should only happen if:
    // 1. The service is "Pet Taxi" (no product ID configured)
    // 2. Or the product exists but has no active prices
    if (lineItems.length === 0) {
      console.warn(`No line items created from existing products. Falling back to creating custom product for ${booking.service}.`);
      console.log(`Base product ID: ${baseProductId || 'none'}`);
      
      const petList = booking.pets.map(pet => pet.species).join(', ');
      const serviceDate = new Date(booking.startAt).toLocaleDateString();
      const serviceTime = new Date(booking.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      const product = await stripe.products.create({
        name: `${booking.service} Service`,
        description: `${booking.service} for ${booking.pets.length} pet(s): ${petList} on ${serviceDate} at ${serviceTime}. Service includes: ${booking.service.toLowerCase()} care for your pets.`,
        metadata: {
          bookingId: booking.id,
          service: booking.service,
          clientName: `${booking.firstName} ${booking.lastName}`,
          petCount: booking.pets.length.toString(),
          serviceDate,
          serviceTime,
        },
      });

      const baseAmount = Math.round(calculatedTotal * 100);
      const basePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: baseAmount,
        currency: 'usd',
        metadata: {
          type: 'service',
          bookingId: booking.id,
          description: `${booking.service} service ($${calculatedTotal.toFixed(2)})`,
        },
      });

      lineItems.push({
        price: basePrice.id,
        quantity: 1,
      });
    }

    // Create payment link with line items
    const paymentLinkData: any = {
      line_items: lineItems,
      metadata: {
        bookingId: booking.id,
        service: booking.service,
        clientName: `${booking.firstName} ${booking.lastName}`,
        customerId: customer?.id || '',
      },
    };

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create(paymentLinkData);

    // Update booking with payment link
    await prisma.booking.update({
      where: { id: bookingId },
      data: { stripePaymentLinkUrl: paymentLink.url },
    });

    return NextResponse.json({
      paymentLink: paymentLink.url,
      bookingId: booking.id,
      baseAmount: calculatedTotal,
      customerEmail: booking.email,
      customerName: `${booking.firstName} ${booking.lastName}`,
      serviceDescription: `${booking.service} for ${booking.pets.length} pet(s)`,
    });

  } catch (error) {
    console.error("Failed to create payment link:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: "Failed to create payment link",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

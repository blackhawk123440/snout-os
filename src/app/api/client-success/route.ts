/**
 * Client Success API
 * 
 * Master Spec Reference: Section 8.3
 * 
 * Provides client success insights:
 * - Review requests (clients who should be asked for reviews)
 * - Churn risk (clients at risk of leaving)
 * - Repeat booking nudges (clients who should be encouraged to book again)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ReviewRequest {
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string;
  lastBookingId: string;
  lastBookingDate: Date;
  lastBookingService: string;
  daysSinceCompletion: number;
  totalBookings: number;
  priority: "high" | "medium" | "low";
  recommendation: string;
}

interface ChurnRisk {
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string;
  lastBookingId: string;
  lastBookingDate: Date;
  daysSinceLastBooking: number;
  totalBookings: number;
  totalSpent: number;
  churnRisk: "high" | "medium" | "low";
  riskFactors: string[];
  recommendation: string;
}

interface RepeatBookingNudge {
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string;
  lastBookingId: string;
  lastBookingDate: Date;
  lastBookingService: string;
  daysSinceLastBooking: number;
  typicalBookingFrequency: number; // days between bookings
  expectedNextBookingDate: Date;
  priority: "high" | "medium" | "low";
  recommendation: string;
}

/**
 * GET /api/client-success
 * 
 * Get client success insights
 * Query params:
 * - includeReviewRequests: Include review requests (default: true)
 * - includeChurnRisk: Include churn risk (default: true)
 * - includeRepeatNudges: Include repeat booking nudges (default: true)
 * - daysLookback: Days to look back for analysis (default: 90)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeReviewRequests = searchParams.get("includeReviewRequests") !== "false";
    const includeChurnRisk = searchParams.get("includeChurnRisk") !== "false";
    const includeRepeatNudges = searchParams.get("includeRepeatNudges") !== "false";
    const daysLookback = parseInt(searchParams.get("daysLookback") || "90", 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - daysLookback);

    // Fetch all completed bookings in the lookback period
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: "completed",
        endAt: {
          gte: lookbackDate,
        },
      },
      orderBy: {
        endAt: "desc",
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Group bookings by client (using clientId or phone/email as fallback)
    const clientBookings = new Map<string, typeof completedBookings>();
    
    for (const booking of completedBookings) {
      let clientKey: string;
      if (booking.clientId) {
        clientKey = `client_${booking.clientId}`;
      } else {
        // Fallback: use phone or email as identifier
        clientKey = `contact_${booking.phone || booking.email || booking.id}`;
      }

      if (!clientBookings.has(clientKey)) {
        clientBookings.set(clientKey, []);
      }
      clientBookings.get(clientKey)!.push(booking);
    }

    const reviewRequests: ReviewRequest[] = [];
    const churnRisks: ChurnRisk[] = [];
    const repeatBookingNudges: RepeatBookingNudge[] = [];

    const now = new Date();

    // Analyze each client
    for (const [clientKey, bookings] of clientBookings.entries()) {
      if (bookings.length === 0) continue;

      // Sort bookings by completion date (most recent first)
      bookings.sort((a, b) => b.endAt.getTime() - a.endAt.getTime());

      const lastBooking = bookings[0];
      const clientId = lastBooking.clientId;
      const clientName = lastBooking.client
        ? `${lastBooking.client.firstName} ${lastBooking.client.lastName}`
        : `${lastBooking.firstName} ${lastBooking.lastName}`;
      const clientEmail = lastBooking.client?.email || lastBooking.email || null;
      const clientPhone = lastBooking.client?.phone || lastBooking.phone;

      // Calculate days since last booking completion
      const daysSinceCompletion = Math.floor(
        (now.getTime() - lastBooking.endAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate total bookings and spending
      const totalBookings = bookings.length;
      const totalSpent = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

      // 8.3.1: Review Requests
      if (includeReviewRequests) {
        // Clients with completed bookings in last 7-30 days who haven't been asked recently
        if (daysSinceCompletion >= 7 && daysSinceCompletion <= 30) {
          // Check if review request was sent (via EventLog or automation logs)
          // For now, assume no review request sent if within window
          const priority = daysSinceCompletion <= 14 ? "high" : daysSinceCompletion <= 21 ? "medium" : "low";
          
          reviewRequests.push({
            clientId,
            clientName,
            clientEmail,
            clientPhone,
            lastBookingId: lastBooking.id,
            lastBookingDate: lastBooking.endAt,
            lastBookingService: lastBooking.service,
            daysSinceCompletion,
            totalBookings,
            priority,
            recommendation: `Send review request for ${lastBooking.service} booking completed ${daysSinceCompletion} days ago`,
          });
        }
      }

      // 8.3.2: Churn Risk
      if (includeChurnRisk) {
        const riskFactors: string[] = [];
        let churnRisk: "high" | "medium" | "low" = "low";

        // Risk factor: Long time since last booking
        if (daysSinceCompletion > 60) {
          riskFactors.push(`No booking in ${daysSinceCompletion} days`);
          if (daysSinceCompletion > 90) {
            churnRisk = "high";
          } else if (daysSinceCompletion > 60) {
            churnRisk = "medium";
          }
        }

        // Risk factor: Declining booking frequency
        if (totalBookings >= 3) {
          const recentBookings = bookings.slice(0, 3);
          const olderBookings = bookings.slice(3, 6);
          
          if (olderBookings.length >= 2) {
            const recentAvgDays = recentBookings.length > 1
              ? (recentBookings[0].endAt.getTime() - recentBookings[recentBookings.length - 1].endAt.getTime()) / (1000 * 60 * 60 * 24) / (recentBookings.length - 1)
              : 0;
            
            const olderAvgDays = (olderBookings[0].endAt.getTime() - olderBookings[olderBookings.length - 1].endAt.getTime()) / (1000 * 60 * 60 * 24) / (olderBookings.length - 1);
            
            if (recentAvgDays > olderAvgDays * 1.5) {
              riskFactors.push("Declining booking frequency");
              if (churnRisk === "low") churnRisk = "medium";
            }
          }
        }

        // Risk factor: High-value client (high priority for retention)
        if (totalSpent > 500 && daysSinceCompletion > 30) {
          riskFactors.push("High-value client");
          if (churnRisk === "low") churnRisk = "medium";
        }

        // Only include if there's actual risk
        if (riskFactors.length > 0 || daysSinceCompletion > 45) {
          let recommendation = "Monitor client engagement";
          if (daysSinceCompletion > 90) {
            recommendation = "Reach out to re-engage client - no booking in 90+ days";
          } else if (daysSinceCompletion > 60) {
            recommendation = "Send re-engagement message - encourage repeat booking";
          } else if (riskFactors.includes("High-value client")) {
            recommendation = "High-value client - prioritize retention outreach";
          }

          churnRisks.push({
            clientId,
            clientName,
            clientEmail,
            clientPhone,
            lastBookingId: lastBooking.id,
            lastBookingDate: lastBooking.endAt,
            daysSinceLastBooking: daysSinceCompletion,
            totalBookings,
            totalSpent,
            churnRisk,
            riskFactors,
            recommendation,
          });
        }
      }

      // 8.3.3: Repeat Booking Nudges
      if (includeRepeatNudges) {
        // Calculate typical booking frequency
        let typicalBookingFrequency = 0;
        if (totalBookings >= 2) {
          const intervals: number[] = [];
          for (let i = 0; i < bookings.length - 1; i++) {
            const daysBetween = Math.floor(
              (bookings[i].endAt.getTime() - bookings[i + 1].endAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            intervals.push(daysBetween);
          }
          typicalBookingFrequency = Math.round(
            intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
          );
        }

        // Expected next booking date
        const expectedNextBookingDate = new Date(lastBooking.endAt);
        expectedNextBookingDate.setDate(
          expectedNextBookingDate.getDate() + (typicalBookingFrequency || 30)
        );

        // Determine if nudge is needed
        const daysUntilExpected = Math.floor(
          (expectedNextBookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Nudge if we're within 7 days of expected booking date, or past it
        if (daysUntilExpected <= 7 && daysSinceCompletion >= 14) {
          const priority = daysUntilExpected <= 0 ? "high" : daysUntilExpected <= 3 ? "medium" : "low";
          
          repeatBookingNudges.push({
            clientId,
            clientName,
            clientEmail,
            clientPhone,
            lastBookingId: lastBooking.id,
            lastBookingDate: lastBooking.endAt,
            lastBookingService: lastBooking.service,
            daysSinceLastBooking: daysSinceCompletion,
            typicalBookingFrequency,
            expectedNextBookingDate,
            priority,
            recommendation: typicalBookingFrequency > 0
              ? `Client typically books every ${typicalBookingFrequency} days - send booking reminder`
              : `Send booking reminder - last booking was ${daysSinceCompletion} days ago`,
          });
        }
      }
    }

    // Sort results by priority and date
    reviewRequests.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysSinceCompletion - b.daysSinceCompletion;
    });

    churnRisks.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      const riskDiff = riskOrder[a.churnRisk] - riskOrder[b.churnRisk];
      if (riskDiff !== 0) return riskDiff;
      return b.daysSinceLastBooking - a.daysSinceLastBooking;
    });

    repeatBookingNudges.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.daysSinceLastBooking - b.daysSinceLastBooking;
    });

    return NextResponse.json({
      reviewRequests: includeReviewRequests ? reviewRequests : [],
      churnRisks: includeChurnRisk ? churnRisks : [],
      repeatBookingNudges: includeRepeatNudges ? repeatBookingNudges : [],
      summary: {
        totalClients: clientBookings.size,
        reviewRequestCount: reviewRequests.length,
        churnRiskCount: churnRisks.length,
        repeatNudgeCount: repeatBookingNudges.length,
        highPriorityReviews: reviewRequests.filter((r) => r.priority === "high").length,
        highRiskChurn: churnRisks.filter((c) => c.churnRisk === "high").length,
        highPriorityNudges: repeatBookingNudges.filter((n) => n.priority === "high").length,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch client success data:", error);
    return NextResponse.json(
      { error: "Failed to fetch client success data" },
      { status: 500 }
    );
  }
}


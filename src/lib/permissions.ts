/**
 * Permission & Role System
 * 
 * Utilities for checking user permissions
 */

import { prisma } from "@/lib/db";

type Resource = string; // e.g., "client.phone", "booking.edit", "sitter.payout"
type Action = "read" | "write" | "delete" | "manage";

interface PermissionCheck {
  userId: string;
  userType: "sitter" | "admin";
  resource: Resource;
  action: Action;
}

/**
 * Check if a user has permission for a resource/action
 */
export async function hasPermission(
  userId: string,
  userType: "sitter" | "admin",
  resource: Resource,
  action: Action
): Promise<boolean> {
  try {
    // Get user's roles
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        userType,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    // Check if any role has the required permission
    for (const userRole of userRoles) {
      const hasPermission = userRole.role.permissions.some(
        (perm) =>
          perm.resource === resource &&
          perm.action === action &&
          perm.granted === true
      );

      if (hasPermission) {
        return true;
      }
    }

    // Default permissions for admin (if no roles assigned)
    if (userType === "admin") {
      return true; // Admins have all permissions by default
    }

    return false;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string,
  userType: "sitter" | "admin"
): Promise<Array<{ resource: string; action: string }>> {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        userType,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    const permissions: Array<{ resource: string; action: string }> = [];

    for (const userRole of userRoles) {
      for (const perm of userRole.role.permissions) {
        if (perm.granted) {
          permissions.push({
            resource: perm.resource,
            action: perm.action,
          });
        }
      }
    }

    // Remove duplicates
    const unique = permissions.filter(
      (p, index, self) =>
        index ===
        self.findIndex(
          (t) => t.resource === p.resource && t.action === p.action
        )
    );

    return unique;
  } catch (error) {
    console.error("Get permissions error:", error);
    return [];
  }
}

/**
 * Check if user can see client phone number
 */
export async function canSeeClientPhone(
  userId: string,
  userType: "sitter" | "admin"
): Promise<boolean> {
  return hasPermission(userId, userType, "client.phone", "read");
}

/**
 * Check if user can edit bookings
 */
export async function canEditBooking(
  userId: string,
  userType: "sitter" | "admin"
): Promise<boolean> {
  return hasPermission(userId, userType, "booking.edit", "write");
}

/**
 * Check if user can see pricing
 */
export async function canSeePricing(
  userId: string,
  userType: "sitter" | "admin"
): Promise<boolean> {
  return hasPermission(userId, userType, "booking.pricing", "read");
}

/**
 * Check if user can view sitter payouts
 */
export async function canViewPayouts(
  userId: string,
  userType: "sitter" | "admin"
): Promise<boolean> {
  return hasPermission(userId, userType, "sitter.payout", "read");
}



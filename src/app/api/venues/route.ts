import { prisma } from "@/lib/db";
import { ok, parseJsonSafe } from "@/lib/api";

/** GET /api/venues */
export async function GET() {
  const venues = await prisma.venue.findMany({ include: { layoutTemplates: true, _count: { select: { events: true } } } });
  return ok(
    venues.map((v) => ({
      venue_id: v.id,
      venue_code: v.venueCode,
      venue_name: v.venueName,
      venue_alias: v.venueAlias,
      venue_type: v.venueType,
      location_label: v.locationLabel,
      status: v.status,
      capacity_official: v.capacityOfficial,
      capacity_validation_status: v.capacityValidationStatus,
      element_count: parseJsonSafe<unknown[]>(v.masterLayoutElements, []).length,
      layout_templates: v.layoutTemplates.map((t) => ({
        template_id: t.id,
        template_name: t.templateName,
        version: t.version,
        booking_types: parseJsonSafe<string[]>(t.activeBookingTypes, []),
      })),
      event_count: v._count.events,
    })),
  );
}

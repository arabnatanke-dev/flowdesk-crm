import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { updateOrganizationSettings } from "@/src/server/settings/service";

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  defaultLocale: z.enum(["ru", "en"]),
  timezone: z.string().trim().min(1).max(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone"),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  taxRateBps: z.number().int().min(0).max(10_000),
  expectedVersion: z.number().int().positive(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
): Promise<NextResponse> {
  // EN: Validate and persist a version-checked organization-settings command.
  // RU: Валидирует и сохраняет version-проверенную команду настроек организации.
  try {
    assertSameOrigin(request);
    const { orgSlug } = await params;
    const context = await requireTenantApiContext(orgSlug);
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_SETTINGS", message: "Check the settings fields.", details: parsed.error.flatten() } }, { status: 400 });
    const ipHash = await hashPrivateIdentifier(getClientAddress(request));
    return NextResponse.json({ settings: await updateOrganizationSettings(context, parsed.data, ipHash) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

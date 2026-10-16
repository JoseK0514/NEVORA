import { readLogoAsset } from "@/lib/workspace-presentation/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

/** Serves a stored company logo. Assets are immutable and addressed by a
 * random id, so the response can be cached for good. Only PNG and WebP are
 * ever stored, and the headers stop a browser treating them as anything else. */
export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const asset = await readLogoAsset((await params).assetId);
    if (!asset) return NOT_FOUND();
    return new Response(new Uint8Array(asset.bytes), {
      status: 200,
      headers: {
        "Content-Type": asset.mediaType,
        "Content-Length": String(asset.bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${asset.sha256}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

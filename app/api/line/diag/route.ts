// app/api/line/diag/route.ts
export const runtime = "nodejs"

export async function GET() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const url = "https://api.line.me/v2/bot/info"

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const text = await r.text()
    return new Response(
      JSON.stringify({ ok: r.ok, status: r.status, body: text.slice(0, 500) }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
  }
}

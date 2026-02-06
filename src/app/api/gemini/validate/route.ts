export async function POST(request: Request) {
    try {
        const body = await request.json();
        const apiKey = String(body?.apiKey || '').trim();

        if (!apiKey) {
            return Response.json({ ok: false, message: 'Missing API key.' }, { status: 400 });
        }

        const payload = {
            contents: [
                {
                    parts: [{ text: 'ping' }]
                }
            ]
        };

        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const raw = await response.text();
            let message = raw;
            try {
                const parsed = JSON.parse(raw);
                message = parsed?.error?.message || parsed?.message || raw;
            } catch {
                // keep raw
            }
            return Response.json({ ok: false, status: response.status, message });
        }

        return Response.json({ ok: true });
    } catch (err) {
        console.error('Gemini validation error', err);
        return Response.json({ ok: false, message: 'Validation failed.' }, { status: 500 });
    }
}

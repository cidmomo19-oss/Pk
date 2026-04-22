export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 1. API UNTUK MEMBUAT LINK BARU (Simpan ke KV)
        if (request.method === 'POST' && path === '/api/create') {
            try {
                const body = await request.json();
                if (!body.url) return new Response('URL required', { status: 400 });

                // Generate kode acak 6 karakter (angka & huruf kecil)
                const code = Math.random().toString(36).substring(2, 8);
                
                // Simpan URL utuh ke KV
                await env.VIDEO_KV.put(code, body.url);

                return new Response(JSON.stringify({ 
                    code: code, 
                    shortlink: `${url.origin}/${code}` 
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response('Error Server', { status: 500 });
            }
        }

        // 2. API UNTUK MENGAMBIL LINK (Baca dari KV)
        if (request.method === 'GET' && path.startsWith('/api/get/')) {
            const code = path.replace('/api/get/', '');
            const videoUrl = await env.VIDEO_KV.get(code);
            
            if (!videoUrl) {
                return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
            }

            return new Response(JSON.stringify({ url: videoUrl }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. MENGATUR TAMPILAN FRONTEND (Single Page Application)
        // Ambil file statis biasa (misal index.html atau gambar favicon)
        let response = await env.ASSETS.fetch(request);
        
        // JIKA file/path tidak ditemukan (misal user akses /admin atau /abc123)
        // Cloudflare secara default akan mereturn 404.
        // Kita paksa ubah 404 tersebut agar memuat file index.html 
        // supaya routing javascript di frontend yang ambil alih.
        if (response.status === 404) {
            const indexRequest = new Request(new URL('/', request.url), request);
            return env.ASSETS.fetch(indexRequest);
        }

        return response;
    }
}

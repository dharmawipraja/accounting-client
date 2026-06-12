import { http, HttpResponse } from 'msw';

export const API = 'http://localhost:4000';

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401, headers: { 'X-Request-Id': 'trace-login' } },
      );
    }
    return HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  }),
  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'No token' }, { status: 401 });
    }
    return HttpResponse.json({ id: 'u1', email: 'admin@buku.id', role: 'ADMIN' });
  }),
];

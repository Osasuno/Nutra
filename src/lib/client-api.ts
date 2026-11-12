// Chamada às rotas /api a partir de componentes cliente.

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

export async function api<T = unknown>(url: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  const method = options.method ?? (body ? "POST" : "GET");

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body, signal: options.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Sem conexão com o servidor. Verifique sua internet.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Erro ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

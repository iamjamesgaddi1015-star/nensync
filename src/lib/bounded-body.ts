export async function boundedJson(
  request: Request,
  max = 4096,
): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new Error("Request too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Request too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

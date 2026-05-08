export async function* readNdjsonStream<T>(
  response: Response,
): AsyncGenerator<T> {
  if (!response.body) {
    throw new Error("Streaming response body is not available");
  }

  const textStream = response.body.pipeThrough(new TextDecoderStream());
  const reader = textStream.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += value;
      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex === -1) {
          break;
        }

        const line = buffer.slice(0, newlineIndex).replace(/\r$/, "").trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) {
          continue;
        }

        yield JSON.parse(line) as T;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const trailing = buffer.replace(/\r$/, "").trim();
  if (trailing) {
    yield JSON.parse(trailing) as T;
  }
}

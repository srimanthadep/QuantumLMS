/** Runs the deletes one after another so the database isn't flooded, and keeps going when one is refused. */
export async function deleteMany<T extends { id: string }>(
  items: T[],
  remove: (id: string) => Promise<unknown>,
  /** Called as each item finishes, with the reason when it was refused. */
  onItem?: (item: T, error?: string) => void,
) {
  const done: T[] = []
  const failed: { item: T; message: string }[] = []
  for (const item of items) {
    try {
      await remove(item.id)
      done.push(item)
      onItem?.(item)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong."
      failed.push({ item, message })
      onItem?.(item, message)
    }
  }
  return { done, failed }
}

/** One toast line for a bulk delete: how many went, and why the first refusal happened. */
export function bulkResultMessage(verb: string, noun: { one: string; many: string }, done: number, failed: { name: string; message: string }[]): string {
  const label = (n: number) => `${n} ${n === 1 ? noun.one : noun.many}`
  if (!failed.length) return `${verb} ${label(done)}`
  const first = `"${failed[0]!.name}": ${failed[0]!.message}`
  const more = failed.length > 1 ? ` (+${failed.length - 1} more)` : ""
  return done ? `${verb} ${done} of ${done + failed.length}. Couldn't remove ${first}${more}` : `Couldn't remove ${first}${more}`
}

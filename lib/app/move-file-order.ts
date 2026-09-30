export function moveItemInArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function remapSelectedIndex(current: number, fromIndex: number, toIndex: number): number {
  if (current === fromIndex) return toIndex;
  if (fromIndex < current && toIndex >= current) return current - 1;
  if (fromIndex > current && toIndex <= current) return current + 1;
  return current;
}

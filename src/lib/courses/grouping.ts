/** Splits items into groups by `category`, in the order given by `order`. Categories with no items are left out. */
export function groupByCategory<T extends { category: string }>(items: T[], order: readonly string[]): { category: string; items: T[] }[] {
  return order
    .map((category) => ({ category, items: items.filter((item) => item.category === category) }))
    .filter((group) => group.items.length > 0);
}

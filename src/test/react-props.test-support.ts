import { Children, isValidElement, type ReactNode } from 'react';

/** Inspect the real server-returned client boundary, including non-rendered props. */
export function findElementProps<T>(node: ReactNode, type: unknown): T {
  function visit(value: ReactNode): T | undefined {
    for (const child of Children.toArray(value)) {
      if (!isValidElement<{children?: ReactNode}>(child)) continue;
      if (child.type === type) return child.props as T;
      const found = visit(child.props.children);
      if (found) return found;
    }
  }
  const found = visit(node);
  if (!found) throw new Error('Expected component boundary not found');
  return found;
}

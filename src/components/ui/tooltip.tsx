import * as React from 'react';

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex" title={content}>
      {children}
    </span>
  );
}

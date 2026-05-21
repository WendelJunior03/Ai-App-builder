interface Props {
  direction?: 'horizontal' | 'vertical'
}

export function Resizer({ direction = 'horizontal' }: Props) {
  return (
    <div
      className={`${
        direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
      } bg-zinc-800 hover:bg-zinc-600 transition-colors shrink-0`}
    />
  )
}

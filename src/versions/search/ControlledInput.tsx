// From pmndrs/examples html-input-fields (MIT): ControlledInput.tsx, keeps the caret in place on controlled updates.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';

export const ControlledInput = forwardRef<HTMLInputElement | null, InputHTMLAttributes<HTMLInputElement>>(function ControlledInput(props, outer) {
  const { value, onChange, ...rest } = props;
  const [cursor, setCursor] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useImperativeHandle(outer, () => ref.current as HTMLInputElement);
  useEffect(() => {
    const input = ref.current;
    if (input && cursor !== null && document.activeElement === input) input.setSelectionRange(cursor, cursor);
  }, [ref, cursor, value]);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCursor(e.target.selectionStart);
    onChange?.(e);
  };
  return <input ref={ref} value={value} onChange={handleChange} {...rest} />;
});

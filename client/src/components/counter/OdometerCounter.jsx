import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";

// Rolling odometer for the hero counter, built on @number-flow/react.
// `compact` skips animation entirely and just renders live plain text, per
// spec ("no animation fanfare") for the top-bar copy of the same number.
// `rollFromZero` is the home hero's first-paint flourish: render 0 first,
// then roll up to the real value once. `reduceMotion` also renders plain
// text — prefers-reduced-motion means no digit-flip, not just a slower one.
export default function OdometerCounter({ value, compact = false, reduceMotion = false, rollFromZero = false, className = "" }) {
  const [displayValue, setDisplayValue] = useState(rollFromZero ? 0 : value);
  const [remountKey, setRemountKey] = useState(0);
  const prevValueRef = useRef(displayValue);
  const rolledInRef = useRef(!rollFromZero);

  useEffect(() => {
    if (!rolledInRef.current) {
      rolledInRef.current = true;
      const id = requestAnimationFrame(() => {
        setDisplayValue(value);
        prevValueRef.current = value;
      });
      return () => cancelAnimationFrame(id);
    }

    if (value === prevValueRef.current) return undefined;

    if (value < prevValueRef.current) {
      // Admin override / snapshot restore moved the number backwards — never
      // animate a rollback. Remounting NumberFlow gives it no prior value to
      // spin down from, so the new (lower) number just appears.
      setRemountKey((k) => k + 1);
    }

    setDisplayValue(value);
    prevValueRef.current = value;
    return undefined;
  }, [value]);

  if (compact || reduceMotion) {
    return <span className={`tabular-nums ${className}`}>{value.toLocaleString("en-US")}</span>;
  }

  return (
    <span aria-label={`${value.toLocaleString("en-US")} lifetime units sold`} className={className}>
      <NumberFlow key={remountKey} value={displayValue} format={{ useGrouping: true }} willChange />
    </span>
  );
}

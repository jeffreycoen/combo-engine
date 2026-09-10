// game/runner/Typed.jsx — bureau transmissions arrive over the wire: text
// types out. Filed documents (the AAR) stay static — carbon paper does not
// animate.
import React, { useEffect, useState } from "react";

export function Typed({ text, cps = 45, style }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const iv = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 1000 / cps);
    return () => clearInterval(iv);
  }, [text, cps]);
  return <span style={style}>{text.slice(0, n)}{n < text.length ? <span style={{ opacity: 0.6 }}>{"▌"}</span> : null}</span>;
}

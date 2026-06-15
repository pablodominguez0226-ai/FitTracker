import React from "react";

export default function Card({ children, className = "" }) {
  return <section className={`ft-card ${className}`}>{children}</section>;
}

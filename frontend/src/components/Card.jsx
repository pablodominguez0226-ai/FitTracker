import React from "react";

export default function Card({ children, className = "" }) {
  return <section className={`iron-card ${className}`}>{children}</section>;
}


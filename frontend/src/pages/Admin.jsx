import React from "react";
import AdminPanel from "./AdminPanel.jsx";

export default function Admin({ currentUser }) {
  return <AdminPanel currentUser={currentUser} />;
}

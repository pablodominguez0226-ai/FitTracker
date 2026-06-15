import React, { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

const fields = ["weight", "waist", "chest", "arm", "leg", "calf", "goal_weight"];
const labels = { weight: "Peso", waist: "Cintura", chest: "Pecho", arm: "Brazo", leg: "Pierna", calf: "Pantorrilla", goal_weight: "Objetivo" };

export default function Measurements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});

  async function load() {
    const res = await api.get("/measurements");
    setItems(res.data);
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    await api.post("/measurements", form);
    setForm({});
    await load();
  }

  return (
    <>
      <Header title="Medidas" subtitle="Seguimiento corporal con historial visual" />
      <Card>
        <form onSubmit={save} className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {fields.map((field) => (
            <label key={field} className="ft-label">
              {labels[field]}
              <input type="number" step="0.1" value={form[field] ?? ""} onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })} className="ft-input mt-2" />
            </label>
          ))}
          <button className="ft-button col-span-2">Guardar medidas</button>
        </form>
      </Card>
      <Card className="mt-4 sm:mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Histórico</h2>
          <span className="ft-chip">cm / kg</span>
        </div>
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={items} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="measured_at" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip contentStyle={{ background: "#0D111C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, color: "#F8FAFC" }} />
              <Line dataKey="weight" stroke="#60A5FA" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} connectNulls />
              <Line dataKey="waist" stroke="#22C55E" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} connectNulls />
              <Line dataKey="chest" stroke="#F97316" strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

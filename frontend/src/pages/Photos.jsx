import React, { useEffect, useMemo, useState } from "react";
import { api, uploadBase } from "../api/client";
import Card from "../components/Card";
import Header from "../components/Header";

export default function Photos() {
  const [photos, setPhotos] = useState([]);
  const [view, setView] = useState("frente");
  const [file, setFile] = useState(null);

  async function load() {
    const res = await api.get("/photos");
    setPhotos(res.data);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const data = new FormData();
    data.append("view", view);
    if (file) data.append("image", file);
    await api.post("/photos", data, { headers: { "Content-Type": "multipart/form-data" } });
    setFile(null);
    await load();
  }

  const byDate = useMemo(() => photos.reduce((acc, photo) => {
    acc[photo.taken_at] = acc[photo.taken_at] || [];
    acc[photo.taken_at].push(photo);
    return acc;
  }, {}), [photos]);

  return (
    <>
      <Header title="Fotos" subtitle="Compará frente, perfil y espalda por fecha" />
      <Card>
        <form onSubmit={save} className="space-y-3">
          <select value={view} onChange={(e) => setView(e.target.value)} className="ft-select">
            <option value="frente">Frente</option>
            <option value="perfil">Perfil</option>
            <option value="espalda">Espalda</option>
          </select>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0])} className="ft-input file:mr-3 file:rounded-xl file:border-0 file:bg-blue-500/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-100" />
          <button className="ft-button w-full">Guardar foto</button>
        </form>
      </Card>
      <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        {Object.entries(byDate).map(([date, group]) => (
          <Card key={date}>
            <h2 className="mb-3 text-base font-black sm:mb-4 sm:text-lg">{date}</h2>
            <div className="grid grid-cols-3 gap-2">
              {["frente", "perfil", "espalda"].map((slot) => {
                const photo = group.find((item) => item.view === slot);
                return (
                  <div key={slot} className="overflow-hidden rounded-2xl border border-white/10 bg-fitSurface">
                    <div className="aspect-[3/4]">
                      {photo ? <img src={`${uploadBase}${photo.file_path}`} alt={slot} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{slot}</div>}
                    </div>
                    <p className="py-2 text-center text-xs font-semibold capitalize text-slate-300">{slot}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

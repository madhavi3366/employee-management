import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  FileText,
  UploadCloud,
  RefreshCw,
  Download,
  Trash2,
  Search,
  X,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

import "./ISOCertifications.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DocCollection({ title = "Documents", basePath = "documents" }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadItems();
  }, [basePath]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/iso/items/${encodeURIComponent(basePath)}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || "Failed to load items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFiles(fileList) {
    if (uploading) return;
    setUploading(true);
    setError(null);
    setSuccess(null);
    let uploaded = 0;
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const form = new FormData();
        form.append("file", file);
        form.append("path", basePath);
        const res = await fetch(`${API}/iso/files`, { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || `Failed to upload ${file.name}`);
        uploaded++;
      }
      setSuccess(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
      await loadItems();
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInput(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadFiles(files);
  }

  function viewFile(item) {
    window.open(`${API}/iso/view/${encodeURIComponent(item.path)}`, "_blank", "noopener,noreferrer");
  }

  async function deleteItem(item) {
    const ok = window.confirm(`Delete ${item.name}?`);
    if (!ok) return;
    try {
      const res = await fetch(`${API}/iso/items`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: item.path }) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Delete failed");
      setSuccess("Deleted");
      await loadItems();
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  const filtered = items.filter((it) => (it.name || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="iso-page">
      <Sidebar />
      <main className="iso-main">
        <div className="iso-header">
          <div className="iso-title-area">
            <div className="iso-title-icon"><FileText size={25} /></div>
            <div>
              <h2>{title}</h2>
              <p>Upload and manage {title}</p>
            </div>
          </div>
          <div className="iso-header-actions">
            <label className={`iso-btn primary ${uploading ? 'disabled' : ''}`}>
              <UploadCloud size={17} /> {uploading ? 'Uploading...' : 'Upload File'}
              <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInput} />
            </label>
          </div>
        </div>

        <section className="iso-section">
          <div className="iso-toolbar">
            <div className="iso-search">
              <Search size={17} />
              <input placeholder="Search files..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {query && <button onClick={() => setQuery("")}><X size={15} /></button>}
            </div>
          </div>

          {loading && (<div className="iso-loading"><RefreshCw className="iso-spin" size={22} /> Loading...</div>)}

          {!loading && filtered.length === 0 && (<div className="iso-empty"><div className="iso-empty-icon"><Folder size={42} /></div><h3>No files</h3></div>)}

          {!loading && filtered.length > 0 && (
            <div className="iso-grid">
              {filtered.map((item) => (
                <article key={item.path} className={`iso-card ${item.type === 'folder' ? 'folder' : 'file'}`}>
                  <button type="button" className="iso-card-main" onClick={() => item.type === 'folder' ? navigate(`/iso-certifications`) : viewFile(item)}>
                    <div className="iso-card-icon">{item.type === 'folder' ? <Folder size={42} /> : <FileText size={40} />}</div>
                    <div className="iso-card-info"><div className="iso-card-name">{item.name}</div><div className="iso-card-meta">{item.type === 'folder' ? `${item.item_count ?? 0} items` : item.size_text || 'File'}</div></div>
                    <ChevronRight size={19} className="iso-card-arrow" />
                  </button>
                  <div className="iso-card-actions">
                    {item.type === 'file' && <button title="View" onClick={() => viewFile(item)}><Download size={16} /></button>}
                    <button title="Delete" onClick={() => deleteItem(item)}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}

        </section>
      </main>
    </div>
  );
}

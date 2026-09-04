import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  Folder,
  FolderOpen,
  FileText,
  UploadCloud,
  Plus,
  ChevronRight,
  ArrowLeft,
  Download,
  Trash2,
  Search,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";

import "./ISOCertifications.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const LIST_FOLDERS = [
  "Senior AI Engineer",
  "Jr AI Engineer",
  "L3 Network engineer",
  "L2 network engineer",
  "L1 network engineer",
  "Technical project manager",
  "Marketing manager",
];

const QUESTION_FOLDERS = [
  "Senior AI Questionies",
  "Jr AI Questionies",
  "L3 Network Questionies",
  "L2 network  Questionies",
  "L1 network Questionies",
  "Technical project manager Questionies",
  "marketing manager Questionies",
];

export default function JD() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("list"); // 'list' or 'questionaries'
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentPath) loadFolder(currentPath);
  }, [currentPath]);

  function makePath(folderName) {
    const base = mode === "list" ? "jd/list" : "jd/questionaries";
    return `${base}/${folderName}`;
  }

  async function loadFolder(path) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/iso/items/${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to load folder");
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.message || "Failed to load folder");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openFolder(folderName) {
    const p = makePath(folderName);
    setCurrentPath(p);
    setQuery("");
  }

  function goBack() {
    setCurrentPath("");
    setItems([]);
    setError(null);
    setSuccess(null);
  }

  async function uploadFiles(fileList) {
    if (!currentPath) return setError("Open a folder first to upload.");
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
        form.append("path", currentPath);
        const res = await fetch(`${API}/iso/files`, { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || `Failed to upload ${file.name}`);
        uploaded++;
      }
      setSuccess(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
      await loadFolder(currentPath);
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFileInput(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
  }

  function downloadFile(item) {
    // Open view endpoint to allow inline preview; users can still download via browser UI
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
      await loadFolder(currentPath);
    } catch (e) {
      setError(e?.message || "Delete failed");
    }
  }

  const folders = mode === "list" ? LIST_FOLDERS : QUESTION_FOLDERS;

  const filtered = (currentPath ? items : folders.map((n) => ({ name: n, type: "folder", path: makePath(n), item_count: 0 }))).filter((it) => (it.name || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="iso-page">
      <Sidebar />
      <main className="iso-main">
        <div className="iso-header">
          <div className="iso-title-area">
            <div className="iso-title-icon"><ShieldCheck size={25} /></div>
            <div>
              <h2>JD</h2>
              <p>Job descriptions and questionaries</p>
            </div>
          </div>
          <div className="iso-header-actions">
            <div className="jd-mode-toggle">
              <button className={`iso-btn ${mode === "list" ? "primary" : "secondary"}`} onClick={() => { setMode("list"); setCurrentPath(""); setItems([]); }}>List</button>
              <button className={`iso-btn ${mode === "questionaries" ? "primary" : "secondary"}`} onClick={() => { setMode("questionaries"); setCurrentPath(""); setItems([]); }}>Questionaries</button>
            </div>
          </div>
        </div>

        <section className="iso-section">
          

          {currentPath && (
            <div style={{ marginBottom: 12 }}>
              <button className="iso-btn secondary" onClick={goBack}><ArrowLeft size={16} /> Back</button>
              <label className={`iso-btn primary ${uploading ? 'disabled' : ''}`} style={{ marginLeft: 8 }}>
                <UploadCloud size={17} /> {uploading ? 'Uploading...' : 'Upload File'}
                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInput} disabled={uploading} />
              </label>
            </div>
          )}

          <div className="iso-toolbar">
            <div className="iso-search">
              <Search size={17} />
              <input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {query && <button onClick={() => setQuery("")}><X size={15} /></button>}
            </div>
          </div>

          {loading && (<div className="iso-loading"><RefreshCw className="iso-spin" size={22} /> Loading...</div>)}

          {!loading && filtered.length === 0 && (<div className="iso-empty"><div className="iso-empty-icon"><Folder size={42} /></div><h3>No items</h3></div>)}

          {!loading && filtered.length > 0 && (
            <div className="iso-grid">
              {filtered.map((item) => (
                <article key={item.path} className={`iso-card ${item.type === 'folder' ? 'folder' : 'file'}`}>
                  <button type="button" className="iso-card-main" onClick={() => item.type === 'folder' ? openFolder(item.name) : downloadFile(item)}>
                    <div className="iso-card-icon">{item.type === 'folder' ? <Folder size={42} /> : <FileText size={40} />}</div>
                    <div className="iso-card-info"><div className="iso-card-name">{item.name}</div><div className="iso-card-meta">{item.type === 'folder' ? `${item.item_count ?? 0} items` : item.size_text || 'File'}</div></div>
                    <ChevronRight size={19} className="iso-card-arrow" />
                  </button>
                  <div className="iso-card-actions">
                    {item.type === 'file' && <button title="Download" onClick={() => downloadFile(item)}><Download size={16} /></button>}
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

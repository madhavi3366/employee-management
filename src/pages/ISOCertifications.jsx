import React, { useEffect, useRef, useState } from "react";
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

const API =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function ISOCertifications() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [query, setQuery] = useState("");

  const fileInputRef = useRef(null);

  // ============================================================
  // LOAD CURRENT FOLDER
  // ============================================================

  useEffect(() => {
    loadFolder(currentPath);
  }, [currentPath]);

  async function loadFolder(path = "") {
    setLoading(true);
    setError(null);

    try {
      const encodedPath = encodeURIComponent(path);

      const response = await fetch(
        `${API}/iso/items/${encodedPath}`
      );

      if (!response.ok) {
        throw new Error("Failed to load ISO folder");
      }

      const data = await response.json();

      // Filter out other document-collection folders that live in the same
      // storage area but should not be shown on the ISO Certifications page.
      const blacklist = [
        "recruitment",
        "onboarding",
        "jd",
        "leave",
        "leave policy",
        "asset inventory",
        "asset",
        "exit",
        "workout",
        "workout mom",
      ];

      const itemsFromServer = Array.isArray(data?.items)
        ? data.items
        : [];

      const filtered = itemsFromServer.filter((it) => {
        if (it?.type !== "folder") return true;

        const name = String(it.name || "").toLowerCase().replace(/[-_]/g, " ").trim();

        // hide if name matches any blacklist token
        const blocked = blacklist.some((b) => name.includes(b));

        return !blocked;
      });

      setItems(filtered);
    } catch (e) {
      console.error("ISO load error:", e);

      setError(
        e?.message ||
          "Failed to load ISO certifications"
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // CREATE FOLDER
  // ============================================================

  async function createFolder() {
    const name = window.prompt(
      "Enter new folder name:"
    );

    if (!name || !name.trim()) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API}/iso/folders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: currentPath,
            name: name.trim(),
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to create folder"
        );
      }

      setSuccess(
        `"${name.trim()}" folder created successfully.`
      );

      await loadFolder(currentPath);
    } catch (e) {
      console.error(
        "Create ISO folder error:",
        e
      );

      setError(
        e?.message ||
          "Failed to create folder"
      );
    }
  }

  // ============================================================
  // FILE INPUT
  // ============================================================

  async function handleFileInput(e) {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    await uploadFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ============================================================
  // UPLOAD FILES
  // ============================================================

  async function uploadFiles(fileList) {
    if (uploading) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    let uploadedCount = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        const formData = new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "path",
          currentPath
        );

        const response = await fetch(
          `${API}/iso/files`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              `Failed to upload ${file.name}`
          );
        }

        uploadedCount++;
      }

      setSuccess(
        uploadedCount === 1
          ? "File uploaded successfully."
          : `${uploadedCount} files uploaded successfully.`
      );

      await loadFolder(currentPath);
    } catch (e) {
      console.error(
        "ISO upload error:",
        e
      );

      setError(
        e?.message ||
          "File upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================

  function onDragOver(e) {
    e.preventDefault();

    if (!uploading) {
      e.dataTransfer.dropEffect =
        "copy";
    }
  }

  async function onDrop(e) {
    e.preventDefault();

    if (uploading) {
      return;
    }

    const files =
      e.dataTransfer.files;

    if (files && files.length) {
      await uploadFiles(files);
    }
  }

  // ============================================================
  // OPEN FOLDER
  // ============================================================

  function openFolder(name) {
    const newPath = currentPath
      ? `${currentPath}/${name}`
      : name;

    setQuery("");
    setCurrentPath(newPath);
  }

  // ============================================================
  // BREADCRUMB NAVIGATION
  // ============================================================

  function goToPath(index) {
    if (index === -1) {
      setCurrentPath("");
      return;
    }

    const parts =
      currentPath
        .split("/")
        .filter(Boolean);

    const newPath =
      parts
        .slice(0, index + 1)
        .join("/");

    setCurrentPath(newPath);
  }

  function goBack() {
    if (!currentPath) {
      return;
    }

    const parts =
      currentPath
        .split("/")
        .filter(Boolean);

    parts.pop();

    setCurrentPath(
      parts.join("/")
    );
  }

  // ============================================================
  // DOWNLOAD
  // ============================================================

  function downloadFile(item) {
    const path = item.path || "";

    window.open(
      `${API}/iso/download/${encodeURIComponent(
        path
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // ============================================================
  // DELETE ITEM
  // ============================================================

  async function deleteItem(item) {
    const confirmed =
      window.confirm(
        item.type === "folder"
          ? `Delete folder "${item.name}" and everything inside it?`
          : `Delete "${item.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API}/iso/items`,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            path: item.path,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Delete failed"
        );
      }

      setSuccess(
        `"${item.name}" deleted successfully.`
      );

      await loadFolder(currentPath);
    } catch (e) {
      console.error(
        "ISO delete error:",
        e
      );

      setError(
        e?.message ||
          "Delete failed"
      );
    }
  }

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredItems =
    items.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(
          query.toLowerCase()
        )
    );

  const pathParts =
    currentPath
      .split("/")
      .filter(Boolean);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="iso-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="iso-header">

        <div className="iso-title-area">

          <div className="iso-title-icon">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2>
              ISO Certifications
            </h2>

            <p>
              Organize ISO certificates,
              audits and documents
            </p>
          </div>

        </div>

        <div className="iso-header-actions">

          <button
            type="button"
            className="iso-btn secondary"
            onClick={createFolder}
            disabled={loading}
          >
            <FolderOpen size={17} />
            New Folder
          </button>

          <label
            className={`iso-btn primary ${
              uploading
                ? "disabled"
                : ""
            }`}
          >
            <UploadCloud size={17} />

            {uploading
              ? "Uploading..."
              : "Upload File"}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              disabled={uploading}
              onChange={
                handleFileInput
              }
            />
          </label>

        </div>

      </div>

      {/* ======================================================
          BREADCRUMBS
      ====================================================== */}

      <div className="iso-breadcrumbs">

        <button
          type="button"
          className={
            !currentPath
              ? "iso-crumb active"
              : "iso-crumb"
          }
          onClick={() =>
            goToPath(-1)
          }
        >
          <ShieldCheck size={15} />
          ISO Certifications
        </button>

        {pathParts.map(
          (part, index) => (
            <React.Fragment
              key={`${part}-${index}`}
            >
              <ChevronRight
                size={16}
                className="iso-breadcrumb-arrow"
              />

              <button
                type="button"
                className={
                  index ===
                  pathParts.length - 1
                    ? "iso-crumb active"
                    : "iso-crumb"
                }
                onClick={() =>
                  goToPath(index)
                }
              >
                {part}
              </button>
            </React.Fragment>
          )
        )}

      </div>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div className="iso-message error">

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {success && (
        <div className="iso-message success">

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess(null)
            }
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ======================================================
          MAIN SECTION
      ====================================================== */}

      <section className="iso-section">

        <div className="iso-section-header">

          <div>

            <span className="iso-section-label">
              DOCUMENT ARCHIVE
            </span>

            <h3>
              {currentPath
                ? pathParts[
                    pathParts.length - 1
                  ]
                : "ISO Certification Folders"}
            </h3>

            <p>
              Create folders and organize
              certification documents.
            </p>

          </div>

          <div className="iso-count">
            {items.length}{" "}
            {items.length === 1
              ? "Item"
              : "Items"}
          </div>

        </div>

        {/* ==================================================
            TOOLBAR
        ================================================== */}

        <div className="iso-toolbar">

          <div className="iso-search">

            <Search size={17} />

            <input
              type="text"
              placeholder="Search folders and files..."
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
              >
                <X size={15} />
              </button>
            )}

          </div>

          <div
            className={`iso-drop ${
              uploading
                ? "uploading"
                : ""
            }`}
            onDragOver={
              onDragOver
            }
            onDrop={onDrop}
          >
            <UploadCloud size={18} />

            <span>
              Drag & drop files here
            </span>
          </div>

        </div>

        {/* ==================================================
            BACK BUTTON
        ================================================== */}

        {currentPath && (
          <button
            type="button"
            className="iso-back-button"
            onClick={goBack}
          >
            <ArrowLeft size={17} />
            Back
          </button>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div className="iso-loading">
            <RefreshCw
              size={22}
              className="iso-spin"
            />
            Loading...
          </div>
        )}

        {/* ==================================================
            ITEMS
        ================================================== */}

        {!loading &&
          filteredItems.length === 0 && (
            <div className="iso-empty">

              <div className="iso-empty-icon">
                <Folder size={42} />
              </div>

              <h3>
                {query
                  ? "No matching items"
                  : "This folder is empty"}
              </h3>

              <p>
                Create a folder or upload
                an ISO document here.
              </p>

              <div className="iso-empty-actions">

                <button
                  type="button"
                  className="iso-btn primary"
                  onClick={
                    createFolder
                  }
                >
                  <Plus size={17} />
                  Create Folder
                </button>

                <label className="iso-btn secondary">
                  <UploadCloud size={17} />
                  Upload File

                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={
                      handleFileInput
                    }
                  />
                </label>

              </div>

            </div>
          )}

        {!loading &&
          filteredItems.length > 0 && (
            <div
              className="iso-grid"
            >

              {filteredItems.map(
                (item) => (

                  <article
                    key={item.path}
                    className={`iso-card ${
                      item.type ===
                      "folder"
                        ? "folder"
                        : "file"
                    }`}
                  >

                    <button
                      type="button"
                      className="iso-card-main"
                      onClick={() => {
                        if (
                          item.type ===
                          "folder"
                        ) {
                          openFolder(
                            item.name
                          );
                        } else {
                          downloadFile(
                            item
                          );
                        }
                      }}
                    >

                      <div className="iso-card-icon">

                        {item.type ===
                        "folder" ? (
                          <Folder
                            size={42}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <FileText
                            size={40}
                            strokeWidth={1.8}
                          />
                        )}

                      </div>

                      <div className="iso-card-info">

                        <div className="iso-card-name">
                          {item.name}
                        </div>

                        <div className="iso-card-meta">

                          {item.type ===
                          "folder"
                            ? `${item.item_count ?? 0} items`
                            : item.size_text ||
                              "File"}

                        </div>

                      </div>

                      <ChevronRight
                        size={19}
                        className="iso-card-arrow"
                      />

                    </button>

                    <div className="iso-card-actions">

                      {item.type ===
                        "file" && (
                        <button
                          type="button"
                          title="Download"
                          onClick={() =>
                            downloadFile(
                              item
                            )
                          }
                        >
                          <Download
                            size={16}
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          deleteItem(
                            item
                          )
                        }
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>
          )}

      </section>

    </div>
  );
}
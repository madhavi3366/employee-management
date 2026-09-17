
import React, { useState, useEffect, useRef } from "react";
import "./CompanyExpenses.css";
import {
  Folder,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Search,
  Wallet,
  Plus,
  CalendarDays,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

function bytesToSize(bytes) {
  if (!bytes && bytes !== 0) return "-";

  if (bytes === 0) {
    return "0 B";
  }

  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes / Math.pow(1024, i)
  ).toFixed(2)} ${sizes[i]}`;
}

export default function CompanyExpenses() {
  // ============================================================
  // VIEW STATE
  // ============================================================

  const [view, setView] = useState("years");
  // years | months | files

  // ============================================================
  // DATA STATE
  // ============================================================

  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [files, setFiles] = useState([]);

  // ============================================================
  // UI STATE
  // ============================================================

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [query, setQuery] = useState("");

  const fileInputRef = useRef(null);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadYears();
  }, []);

  // ============================================================
  // LOAD YEARS
  // ============================================================

  async function loadYears() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/expenses/years`);

      if (!res.ok) {
        throw new Error("Failed to load years");
      }

      const data = await res.json();

      setYears(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Load years error:", e);

      setError("Failed to load expense years");
      setYears([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // OPEN YEAR
  // ============================================================

  async function openYear(year) {
    setSelectedYear(year);
    setSelectedMonth(null);
    setFiles([]);
    setQuery("");
    setView("months");

    await loadMonths(year);
  }

  // ============================================================
  // LOAD MONTHS
  // ============================================================

  async function loadMonths(year) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API}/expenses/${year}/months`
      );

      if (!res.ok) {
        throw new Error("Failed to load months");
      }

      const data = await res.json();

      setMonths(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Load months error:", e);

      setError("Failed to load months");
      setMonths([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // CREATE YEAR
  // ============================================================

  async function createYear() {
    const currentYear = new Date().getFullYear();

    const name = window.prompt(
      "Create new year (example: 2026):",
      String(currentYear)
    );

    if (!name) {
      return;
    }

    const yearNumber = Number(String(name).trim());

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 1900 ||
      yearNumber > 2100
    ) {
      setError(
        "Please enter a valid year between 1900 and 2100."
      );

      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API}/expenses/years`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            year: yearNumber,
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            "Failed to create year"
        );
      }

      setSuccess(
        `${yearNumber} folder created successfully.`
      );

      await loadYears();
    } catch (e) {
      console.error("Create year error:", e);

      setError(
        e?.message ||
          "Failed to create year"
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // DELETE YEAR
  // ============================================================

  async function deleteYear(year) {
    const confirmed = window.confirm(
      `Delete ${year} and ALL expense files inside it?\n\nThis will remove the complete ${year} folder structure and cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API}/expenses/${year}`,
        {
          method: "DELETE",
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to delete year"
        );
      }

      // If the deleted year is currently selected,
      // return to the year screen.
      if (selectedYear === year) {
        setSelectedYear(null);
        setSelectedMonth(null);
        setMonths([]);
        setFiles([]);
        setView("years");
      }

      setSuccess(
        `${year} and all expense files inside it were deleted successfully.`
      );

      await loadYears();
    } catch (e) {
      console.error("Delete year error:", e);

      setError(
        e?.message ||
          "Failed to delete year"
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // CREATE MONTH
  // ============================================================

  async function createMonth() {
    if (!selectedYear) {
      setError("Please select a year first.");
      return;
    }

    const name = window.prompt(
      "Create month (example: August):",
      "August"
    );

    if (!name) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API}/expenses/${selectedYear}/months`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            month: name,
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            "Failed to create month"
        );
      }

      setSuccess(
        `${name} folder created successfully.`
      );

      await loadMonths(selectedYear);
    } catch (e) {
      console.error("Create month error:", e);

      setError(
        e?.message ||
          "Failed to create month"
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // OPEN MONTH
  // ============================================================

  async function openMonth(month) {
    setSelectedMonth(month);
    setQuery("");
    setView("files");

    await loadFiles(
      selectedYear,
      month
    );
  }

  // ============================================================
  // LOAD FILES
  // ============================================================

  async function loadFiles(year, month) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API}/expenses/${year}/${month}/files`
      );

      if (!res.ok) {
        throw new Error(
          "Failed to load files"
        );
      }

      const data = await res.json();

      setFiles(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (e) {
      console.error(
        "Load files error:",
        e
      );

      setError(
        "Failed to load expense files"
      );

      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // FILE INPUT
  // ============================================================

  async function handleFileInput(e) {
    const list = e.target.files;

    if (!list || list.length === 0) {
      return;
    }

    await uploadFiles(list);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ============================================================
  // UPLOAD FILES
  // ============================================================

  async function uploadFiles(list) {
    if (!selectedYear || !selectedMonth) {
      setError(
        "Select a year and month first."
      );

      return;
    }

    if (uploading) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    let uploadedCount = 0;

    try {
      for (
        let i = 0;
        i < list.length;
        i++
      ) {
        const file = list[i];

        const formData = new FormData();

        formData.append(
          "file",
          file
        );

        const res = await fetch(
          `${API}/expenses/${selectedYear}/${selectedMonth}/files`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res
          .json()
          .catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.detail ||
              "Upload failed"
          );
        }

        uploadedCount += 1;

        // If an Excel workbook was uploaded, open it in a new tab (like payroll behavior)
        try {
          const ft = String((data?.file_type || "")).toLowerCase();
          if (ft === "xls" || ft === "xlsx") {
            const openUrl = `${API}/expenses/${data.year}/${data.month}/files/${data.id}/view`;
            window.open(openUrl, "_blank", "noopener,noreferrer");
          }
        } catch (e) {
          // ignore
        }
      }

      setSuccess(
        uploadedCount === 1
          ? "Expense file uploaded successfully."
          : `${uploadedCount} expense files uploaded successfully.`
      );

      await loadFiles(
        selectedYear,
        selectedMonth
      );
    } catch (e) {
      console.error(
        "Upload error:",
        e
      );

      setError(
        e?.message ||
          "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  // ============================================================
  // DRAG OVER
  // ============================================================

  function onDragOver(e) {
    e.preventDefault();

    if (!uploading) {
      e.dataTransfer.dropEffect = "copy";
    }
  }

  // ============================================================
  // DROP FILES
  // ============================================================

  async function onDrop(e) {
    e.preventDefault();

    if (uploading) {
      return;
    }

    const list = e.dataTransfer.files;

    if (list && list.length) {
      await uploadFiles(list);
    }
  }

  // ============================================================
  // DOWNLOAD FILE
  // ============================================================

  function downloadFile(file) {
    window.open(
      `${API}/expenses/${file.year}/${file.month}/files/${file.id}/download`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openFile(file) {
    const ext = String((file.file_type || "")).toLowerCase();
    const excelExts = ["xls", "xlsx"];
    const officeConvertExts = ["doc", "docx", "ppt", "pptx"];

    let endpoint;
    if (excelExts.includes(ext)) {
      endpoint = `${API}/expenses/${file.year}/${file.month}/files/${file.id}/view`;
    } else if (officeConvertExts.includes(ext)) {
      endpoint = `${API}/expenses/${file.year}/${file.month}/files/${file.id}/render`;
    } else {
      endpoint = `${API}/expenses/${file.year}/${file.month}/files/${file.id}/view`;
    }

    window.open(endpoint, "_blank", "noopener,noreferrer");
  }

  // ============================================================
  // DELETE FILE
  // ============================================================

  async function deleteFile(file) {
    const confirmed = window.confirm(
      `Delete "${file.original_filename}"?`
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `${API}/expenses/${file.year}/${file.month}/files/${file.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            "Delete failed"
        );
      }

      setSuccess(
        `"${file.original_filename}" deleted successfully.`
      );

      await loadFiles(
        selectedYear,
        selectedMonth
      );
    } catch (e) {
      console.error(
        "Delete file error:",
        e
      );

      setError(
        e?.message ||
          "Delete failed"
      );
    }
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  function goToYears() {
    setView("years");
    setSelectedYear(null);
    setSelectedMonth(null);
    setMonths([]);
    setFiles([]);
    setQuery("");
    setError(null);
  }

  function goToMonths() {
    if (!selectedYear) {
      goToYears();
      return;
    }

    setView("months");
    setSelectedMonth(null);
    setFiles([]);
    setQuery("");
    setError(null);

    loadMonths(selectedYear);
  }

  // ============================================================
  // FILTER FILES
  // ============================================================

  const filtered = files.filter(
    (file) =>
      String(
        file?.original_filename || ""
      )
        .toLowerCase()
        .includes(
          query.toLowerCase()
        )
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="expenses-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="expenses-header">

        <div className="expenses-title-area">

          <div className="expenses-title-icon">
            <Wallet size={24} />
          </div>

          <div>
            <h2>
              Company Expenses
            </h2>

            <p>
              Organize your expenses
              by year and month
            </p>
          </div>

        </div>

        {/* ====================================================
            TOP RIGHT ACTION
        ==================================================== */}

        <div className="expenses-actions">

          

         


        </div>
      </div>

      {/* ======================================================
          BREADCRUMBS
      ====================================================== */}

      <div className="breadcrumbs">

        <button
          type="button"
          className={`crumb ${
            view === "years"
              ? "active"
              : ""
          }`}
          onClick={goToYears}
        >
          <Wallet size={15} />
          Company Expenses
        </button>

        {selectedYear && (
          <>
            <ChevronRight
              size={16}
              className="breadcrumb-arrow"
            />

            <button
              type="button"
              className={`crumb ${
                view === "months"
                  ? "active"
                  : ""
              }`}
              onClick={goToMonths}
            >
              <CalendarDays size={15} />
              {selectedYear}
            </button>
          </>
        )}

        {selectedMonth && (
          <>
            <ChevronRight
              size={16}
              className="breadcrumb-arrow"
            />

            <span className="crumb current">
              <FolderOpen size={15} />
              {selectedMonth}
            </span>
          </>
        )}

      </div>

      {/* ======================================================
          SUCCESS
      ====================================================== */}

      {success && (
        <div className="expense-message success-message">

          <div className="message-icon">
            ✓
          </div>

          <span>
            {success}
          </span>

          <button
            type="button"
            onClick={() =>
              setSuccess(null)
            }
            aria-label="Close success message"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="expense-message error-message">

          <div className="message-icon">
            <AlertCircle size={17} />
          </div>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
            aria-label="Close error message"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading && (
        <div className="expenses-loading">

          <RefreshCw
            size={22}
            className="loading-spin"
          />

          <span>
            Loading...
          </span>

        </div>
      )}

      {/* ======================================================
          YEARS
      ====================================================== */}

      {view === "years" && (
        <section className="expenses-section">

          <div className="expenses-section-heading">

            <div>

              <span className="section-label">
                EXPENSE ARCHIVE
              </span>

              <h3>
                Financial Years
              </h3>

              <p>
                Choose a year to view
                its monthly expense folders.
              </p>

            </div>

            <div className="folder-count-badge">
              {years.length}{" "}
              {years.length === 1
                ? "Year"
                : "Years"}
            </div>

          </div>

          {years.length === 0 &&
            !loading && (
              <div className="expenses-empty-state">

                <div className="empty-folder-icon">
                  <Folder size={42} />
                </div>

                <h3>
                  No expense years yet
                </h3>

                <p>
                  Create your first
                  financial year to
                  start organizing
                  company expenses.
                </p>

                <button
                  type="button"
                  className="btn primary"
                  onClick={createYear}
                >
                  <Plus size={17} />
                  Create First Year
                </button>

              </div>
            )}

          {years.length > 0 && (
            <div className="grid years-grid">

              {years.map((item) => {

                const year = item.year;

                const fileCount =
                  item.file_count ?? 0;

                return (
                  <article
                    key={year}
                    className="folder-card year-folder-card"
                  >

                    {/* FOLDER OPEN AREA */}

                    <button
                      type="button"
                      className="folder-open-area"
                      onClick={() =>
                        openYear(year)
                      }
                    >

                      <div className="folder-icon-wrap">
                        <Folder
                          size={42}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className="folder-meta">

                        <div className="folder-year">
                          {year}
                        </div>

                        <div className="folder-subtitle">
                          {fileCount}{" "}
                          {fileCount === 1
                            ? "file"
                            : "files"}
                        </div>

                      </div>

                      <ChevronRight
                        size={20}
                        className="folder-arrow"
                      />

                    </button>

                    {/* DELETE YEAR */}

                    <button
                      type="button"
                      className="folder-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteYear(year);
                      }}
                      title={`Delete ${year}`}
                      aria-label={`Delete ${year}`}
                      disabled={loading}
                    >
                      <Trash2 size={16} />
                    </button>

                  </article>
                );
              })}

            </div>
          )}

        </section>
      )}

      {/* ======================================================
          MONTHS
      ====================================================== */}

      {view === "months" && (
        <section className="expenses-section">

          <div className="expenses-section-heading">

            <div>

              <span className="section-label">
                {selectedYear}
              </span>

              <h3>
                Monthly Expenses
              </h3>

              <p>
                Open a month to
                upload and manage
                expense documents.
              </p>

            </div>

            <button
              type="button"
              className="btn refresh-btn"
              onClick={() =>
                loadMonths(selectedYear)
              }
              disabled={loading}
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "loading-spin"
                    : ""
                }
              />

              Refresh
            </button>

          </div>

          <div className="grid months-grid">

            {months.map((item) => {

              const month = item.month;

              const fileCount =
                item.file_count ?? 0;

              return (
                <button
                  type="button"
                  key={month}
                  className="folder-card month-folder-card"
                  onClick={() =>
                    openMonth(month)
                  }
                >

                  <div className="month-folder-icon">
                    <Folder
                      size={38}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div className="folder-meta">

                    <div className="title">
                      {month}
                    </div>

                    <div className="subtitle">
                      {fileCount}{" "}
                      {fileCount === 1
                        ? "file"
                        : "files"}
                    </div>

                  </div>

                  <ChevronRight
                    size={19}
                    className="folder-arrow"
                  />

                </button>
              );
            })}

          </div>

        </section>
      )}

      {/* ======================================================
          FILES
      ====================================================== */}

      {view === "files" && (
        <section className="expenses-section">

          <div className="expenses-section-heading">

            <div>

              <span className="section-label">
                {selectedYear} / {selectedMonth}
              </span>

              <h3>
                Expense Files
              </h3>

              <p>
                Upload and manage
                expense documents for
                this month.
              </p>

            </div>

            <div className="folder-count-badge">
              {files.length}{" "}
              {files.length === 1
                ? "File"
                : "Files"}
            </div>

          </div>

          {/* FILE TOOLBAR */}

          <div className="files-toolbar">

            <div className="search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search expenses..."
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    setQuery("")
                  }
                  className="clear-search"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <div className="files-toolbar-right" style={{ display: "flex", gap: 10, alignItems: "center" }}>

              <label className="btn upload" style={{ cursor: "pointer" }}>
                <UploadCloud size={14} />
                Upload Expense
                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInput} />
              </label>

              <div
                className={`upload-drop ${
                  uploading ? "uploading" : ""
                }`}
                onDragOver={onDragOver}
                onDrop={onDrop}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >

                <UploadCloud size={19} />

                <span>
                  {uploading ? "Uploading..." : "Drag & drop files here"}
                </span>

              </div>

            </div>

          </div>

          {/* FILES GRID */}

          <div className="files-grid">

            {filtered.length === 0 &&
              !loading && (
                <div className="empty">

                  <div className="empty-file-icon">
                    <FileText size={38} />
                  </div>

                  <h3>
                    {query
                      ? "No matching files"
                      : "No expense files"}
                  </h3>

                  <p>
                    {query
                      ? "Try another search."
                      : "Upload an expense document to this month."}
                  </p>

                </div>
              )}

            {filtered.map((file) => (
              <article
                key={file.id}
                className="file-card"
              >

                <div className="file-card-top">

                  <div className="file-icon">
                    <FileText size={27} />
                  </div>

                  <span className="file-type-badge">
                    {String(
                      file.file_type || "FILE"
                    ).toUpperCase()}
                  </span>

                </div>

                <div className="file-info">

                  <div
                    className="file-name"
                    title={
                      file.original_filename
                    }
                  >
                    {file.original_filename}
                  </div>

                  <div className="file-meta-small">
                    {file.file_type ||
                      "Document"}{" "}
                    •{" "}
                    {bytesToSize(
                      file.file_size
                    )}
                  </div>

                </div>

                <div className="file-upload-date">

                  <CalendarDays size={14} />

                  <span>
                    {file.uploaded_at
                      ? new Date(
                          file.uploaded_at
                        ).toLocaleString()
                      : "Date unavailable"}
                  </span>

                </div>

                <div className="file-actions">

                  <button
                    type="button"
                    className="btn small download-button"
                    onClick={() =>
                      downloadFile(file)
                    }
                  >
                    <Download size={14} />
                    Download
                  </button>

                  <button
                    type="button"
                    className="btn small"
                    onClick={() => openFile(file)}
                  >
                    <FolderOpen size={14} />
                    Open
                  </button>

                  <button
                    type="button"
                    className="btn danger small"
                    onClick={() =>
                      deleteFile(file)
                    }
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>

                </div>

              </article>
            ))}

          </div>

        </section>
      )}

    </div>
  );
}


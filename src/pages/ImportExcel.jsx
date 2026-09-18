import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Database,
  X,
  Trash2,
  History,
  RefreshCw,
  Users,
  ExternalLink,
} from "lucide-react";

import "./ImportExcel.css";

const API_URL = "https://hr-dashboard-backend-lyb1.onrender.com";

export default function ImportExcel() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [importHistory, setImportHistory] = useState([]);

  const [deletingId, setDeletingId] = useState(null);

  // ============================================================
  // LOAD IMPORT HISTORY
  // ============================================================

  const loadImportHistory = async () => {
    setHistoryLoading(true);

    try {
      const response = await fetch(`${API_URL}/imports`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load import history"
        );
      }

      setImportHistory(data);
    } catch (err) {
      console.error(
        "Failed to load import history:",
        err
      );

      setError(
        err.message ||
          "Unable to load import history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // LOAD HISTORY WHEN PAGE OPENS
  // ============================================================

  useEffect(() => {
    loadImportHistory();
  }, []);

  // ============================================================
  // HANDLE FILE
  // ============================================================

  const handleFile = (selectedFile) => {
    setError("");
    setResult(null);

    if (!selectedFile) {
      return;
    }

    const validExtensions = [
      ".xlsx",
      ".xls",
    ];

    const extension =
      selectedFile.name
        .substring(
          selectedFile.name.lastIndexOf(".")
        )
        .toLowerCase();

    if (!validExtensions.includes(extension)) {
      setError(
        "Please select an Excel file (.xlsx or .xls)"
      );

      return;
    }

    setFile(selectedFile);
  };

  // ============================================================
  // FILE CHANGE
  // ============================================================

  const handleFileChange = (event) => {
    handleFile(
      event.target.files[0]
    );

    // Allow selecting the same file again
    event.target.value = "";
  };

  // ============================================================
  // DROP FILE
  // ============================================================

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    const droppedFile =
      event.dataTransfer.files[0];

    handleFile(droppedFile);
  };

  // ============================================================
  // REMOVE SELECTED FILE
  // ============================================================

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  // ============================================================
  // IMPORT EXCEL
  // ============================================================

  const importExcel = async () => {
    if (!file) {
      setError(
        "Please select an Excel file first."
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      const response = await fetch(
        `${API_URL}/employees/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Excel import failed"
        );
      }

      setResult(data);

      setFile(null);

      // Refresh import history
      await loadImportHistory();

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Something went wrong while importing."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // OPEN ORIGINAL EXCEL WORKBOOK
  // ============================================================

  

  // ============================================================
  // DELETE IMPORT
  // ============================================================

  const deleteImport = async (importId) => {
    const confirmed =
      window.confirm(
        "Delete this Excel import?\n\nAll employees associated with this import will be deleted."
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(importId);
    setError("");

    try {
      const response =
        await fetch(
          `${API_URL}/imports/${importId}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to delete import"
        );
      }

      // Remove deleted import from UI
      setImportHistory(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== importId
          )
      );

      // Clear success message
      setResult({
        message:
          data.message ||
          "Import deleted successfully.",
      });

    } catch (err) {
      console.error(
        "Delete import error:",
        err
      );

      setError(
        err.message ||
          "Failed to delete import."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "—";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="app">

      <Sidebar />

      <main className="main import-page">

        {/* ==================================================
            HEADER
            ================================================== */}

        <div className="import-header">

          <div>

            <div className="import-badge">
              <Database size={15} />

              Data Management
            </div>

            <h1>
              Import Employee Data
            </h1>

            <p>
              Upload Excel files to add or update
              employee information.
            </p>

          </div>

          <div className="import-header-icon">
            <FileSpreadsheet size={32} />
          </div>

        </div>


        {/* ==================================================
            UPLOAD CARD
            ================================================== */}

        <div className="import-card">

          <div className="import-card-title">

            <div>

              <h2>
                Upload Excel File
              </h2>

              <p>
                Supported formats: .xlsx and .xls
              </p>

            </div>

            <FileSpreadsheet size={28} />

          </div>


          {/* ==================================================
              DROP AREA
              ================================================== */}

          {!file && (

            <label
              className={`drop-zone ${
                dragging
                  ? "dragging"
                  : ""
              }`}

              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}

              onDragLeave={() => {
                setDragging(false);
              }}

              onDrop={handleDrop}
            >

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                hidden
              />

              <div className="upload-icon">
                <Upload size={30} />
              </div>

              <h3>
                Drop your Excel file here
              </h3>

              <p>
                or click to browse from your computer
              </p>

              <span className="browse-button">
                Choose Excel File
              </span>

            </label>

          )}


          {/* ==================================================
              SELECTED FILE
              ================================================== */}

          {file && (

            <div className="selected-file">

              <div className="selected-file-icon">
                <FileSpreadsheet size={25} />
              </div>

              <div className="selected-file-info">

                <strong>
                  {file.name}
                </strong>

                <span>
                  {(file.size / 1024).toFixed(1)}
                  {" KB"}
                </span>

              </div>

              <button
                type="button"
                className="remove-file"
                onClick={removeFile}
              >
                <X size={18} />
              </button>

            </div>

          )}


          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (

            <div className="import-message error">

              <AlertCircle size={20} />

              <span>
                {error}
              </span>

            </div>

          )}


          {/* ==================================================
              SUCCESS
              ================================================== */}

          {result && (

            <div className="import-message success">

              <CheckCircle size={20} />

              <div>

                <strong>
                  {result.message ||
                    "Operation successful"}
                </strong>

                {result.imported !== undefined && (

                  <p>
                    {result.imported}
                    {" employees imported"}
                    {" • "}
                    {result.updated || 0}
                    {" updated"}
                  </p>

                )}

              </div>

            </div>

          )}


          {/* ==================================================
              IMPORT BUTTON
              ================================================== */}

          <div className="import-actions">

            <button
              type="button"
              className="import-button"

              onClick={importExcel}

              disabled={
                !file ||
                loading
              }
            >

              {loading ? (

                <>
                  <span className="spinner"></span>

                  Importing...
                </>

              ) : (

                <>
                  <Upload size={18} />

                  Import Excel
                </>

              )}

            </button>

          </div>

        </div>


        {/* ==================================================
            IMPORT HISTORY
            ================================================== */}

        <section className="import-history">

          <div className="history-header">

            <div>

              <div className="history-title">

                <History size={22} />

                <h2>
                  Import History
                </h2>

              </div>

              <p>
                View and manage previously imported
                Excel files.
              </p>

            </div>

            <button
              type="button"
              className="refresh-history"
              onClick={loadImportHistory}
              disabled={historyLoading}
            >

              <RefreshCw
                size={17}
                className={
                  historyLoading
                    ? "refresh-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>


          {/* ==================================================
              HISTORY LOADING
              ================================================== */}

          {historyLoading ? (

            <div className="history-loading">

              <span className="spinner"></span>

              Loading import history...

            </div>

          ) : importHistory.length === 0 ? (

            /* ==================================================
               EMPTY HISTORY
               ================================================== */

            <div className="history-empty">

              <div className="history-empty-icon">
                <FileSpreadsheet size={30} />
              </div>

              <h3>
                No imports yet
              </h3>

              <p>
                Your uploaded Excel files will
                appear here.
              </p>

            </div>

          ) : (

            /* ==================================================
               HISTORY TABLE
               ================================================== */

            <div className="history-table-wrapper">

              <table className="history-table">

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      Excel File
                    </th>

                    <th>
                      Imported On
                    </th>

                    <th>
                      Employees
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {importHistory.map(
                    (item, index) => (

                      <tr
                        key={item.id}
                      >

                        {/* NUMBER */}

                        <td>

                          <div className="history-number">
                            {index + 1}
                          </div>

                        </td>


                        {/* FILE */}

                        <td>

                          <div className="history-file">

                            <div className="history-file-icon">

                              <FileSpreadsheet
                                size={20}
                              />

                            </div>

                            <div>

                              <strong>
                                {item.filename ||
                                  "Excel File"}
                              </strong>

                              <span>
                                Import ID:{" "}
                                {item.id}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* DATE */}

                        <td>

                          <span className="history-date">

                            {formatDate(
                              item.imported_at
                            )}

                          </span>

                        </td>


                        {/* RECORDS */}

                        <td>

                          <div className="history-records">

                            <Users size={16} />

                            <strong>
                              {item.records ??
                                0}
                            </strong>

                          </div>

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`history-status ${
                              (
                                item.status ||
                                "Completed"
                              )
                                .toLowerCase()
                                .includes(
                                  "complete"
                                )
                                ? "completed"
                                : ""
                            }`}
                          >

                            <CheckCircle
                              size={14}
                            />

                            {item.status ||
                              "Completed"}

                          </span>

                        </td>


                        {/* ACTIONS */}

                        <td>

                          <div className="history-actions">

                            


                            {/* DELETE */}

                            <button
                              type="button"
                              className="delete-import-button"

                              onClick={() =>
                                deleteImport(
                                  item.id
                                )
                              }

                              disabled={
                                deletingId ===
                                item.id
                              }
                            >

                              {deletingId ===
                              item.id ? (

                                <>
                                  <span className="small-spinner"></span>

                                  Deleting...
                                </>

                              ) : (

                                <>
                                  <Trash2
                                    size={16}
                                  />

                                  Delete
                                </>

                              )}

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* ==================================================
            PROCESS
            ================================================== */}

        <div className="import-process">

          <h2>
            How it works
          </h2>

          <div className="process-grid">

            <div className="process-item">

              <div className="process-number">
                1
              </div>

              <div>

                <strong>
                  Choose Excel
                </strong>

                <p>
                  Select your employee Excel file.
                </p>

              </div>

            </div>


            <div className="process-item">

              <div className="process-number">
                2
              </div>

              <div>

                <strong>
                  Validate
                </strong>

                <p>
                  The backend checks the Excel data.
                </p>

              </div>

            </div>


            <div className="process-item">

              <div className="process-number">
                3
              </div>

              <div>

                <strong>
                  Import
                </strong>

                <p>
                  Employee records are imported.
                </p>

              </div>

            </div>


            <div className="process-item">

              <div className="process-number">
                4
              </div>

              <div>

                <strong>
                  Database Updated
                </strong>

                <p>
                  HR Dashboard shows the latest data.
                </p>

              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
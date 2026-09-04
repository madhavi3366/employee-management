
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Upload,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  CalendarDays,
  FileText,
  ExternalLink,
  Download,
  Trash2,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import "./PayrollDetails.css";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// PAYROLL ENDPOINT
// ============================================================

const PAYROLL_FILES_URL =
  `${API_URL}/payroll/files`;

// ============================================================
// PAYROLL DETAILS
// ============================================================

export default function PayrollDetails() {

  const fileInputRef =
    useRef(null);

  // ==========================================================
  // STATE
  // ==========================================================

  const [files, setFiles] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [fileToDelete, setFileToDelete] =
    useState(null);

  // ==========================================================
  // CLEAR MESSAGES
  // ==========================================================

  const clearMessages = () => {

    setError("");
    setSuccess("");

  };

  // ==========================================================
  // LOAD PAYROLL FILES
  // ==========================================================

  const loadPayrollFiles = async () => {

    setLoading(true);
    setError("");

    try {

      const response =
        await fetch(
          PAYROLL_FILES_URL,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      let data = [];

      try {

        data =
          await response.json();

      } catch {

        data = [];

      }

      if (!response.ok) {

        throw new Error(
          data?.detail ||
          data?.message ||
          `Server returned ${response.status}`
        );

      }

      let normalizedFiles = [];

      if (
        Array.isArray(data)
      ) {

        normalizedFiles = data;

      } else if (
        Array.isArray(
          data?.files
        )
      ) {

        normalizedFiles =
          data.files;

      } else if (
        Array.isArray(
          data?.data
        )
      ) {

        normalizedFiles =
          data.data;

      }

      setFiles(
        normalizedFiles
      );

    } catch (err) {

      console.error(
        "Payroll files loading error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load payroll files."
      );

      setFiles([]);

    } finally {

      setLoading(false);

    }

  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadPayrollFiles();

  }, []);

  // ==========================================================
  // OPEN FILE PICKER
  // ==========================================================

  const openFilePicker = () => {

    clearMessages();

    if (
      uploading ||
      deleting
    ) {

      return;

    }

    fileInputRef.current?.click();

  };

  // ==========================================================
  // FILE SELECTED
  // ==========================================================

  const handleFileChange =
    async (event) => {

      const selectedFile =
        event.target.files?.[0];

      if (!selectedFile) {

        return;

      }

      await uploadPayrollFile(
        selectedFile
      );

      // Allow selecting
      // the same file again.

      event.target.value = "";

    };

  // ==========================================================
  // INSERT PAYROLL EXCEL
  // ==========================================================

  const uploadPayrollFile =
    async (file) => {

      clearMessages();

      if (!file) {

        setError(
          "Please select a payroll Excel file."
        );

        return;

      }

      const fileName =
        file.name?.toLowerCase() ||
        "";

      const validExcel =
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".xls");

      if (!validExcel) {

        setError(
          "Please select an Excel file (.xlsx or .xls)."
        );

        return;

      }

      if (file.size === 0) {

        setError(
          "The selected Excel file is empty."
        );

        return;

      }

      setUploading(true);

      try {

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const response =
          await fetch(
            PAYROLL_FILES_URL,
            {
              method: "POST",
              body: formData,
            }
          );

        let data = {};

        try {

          data =
            await response.json();

        } catch {

          data = {};

        }

        if (!response.ok) {

          throw new Error(
            data?.detail ||
            data?.message ||
            "Failed to insert payroll Excel file."
          );

        }

        const importedCount =
          data?.records ??
          data?.payroll_count ??
          data?.row_count ??
          data?.count ??
          data?.imported ??
          null;

        const countNumber =
          Number(importedCount);

        if (
          importedCount !== null &&
          Number.isFinite(
            countNumber
          ) &&
          countNumber > 0
        ) {

          setSuccess(
            `"${file.name}" inserted successfully — ${countNumber} payroll records.`
          );

        } else {

          setSuccess(
            `"${file.name}" inserted successfully.`
          );

        }

        await loadPayrollFiles();

      } catch (err) {

        console.error(
          "Payroll insert error:",
          err
        );

        setError(
          err?.message ||
          "Unable to insert payroll Excel file."
        );

      } finally {

        setUploading(false);

      }

    };

  // ==========================================================
  // DRAG OVER
  // ==========================================================

  const handleDragOver =
    (event) => {

      event.preventDefault();

      if (
        !uploading &&
        !deleting
      ) {

        event.dataTransfer.dropEffect =
          "copy";

      }

    };

  // ==========================================================
  // DROP FILE
  // ==========================================================

  const handleDrop =
    async (event) => {

      event.preventDefault();

      clearMessages();

      if (
        uploading ||
        deleting
      ) {

        return;

      }

      const droppedFile =
        event.dataTransfer.files?.[0];

      if (!droppedFile) {

        return;

      }

      await uploadPayrollFile(
        droppedFile
      );

    };

  // ==========================================================
  // FILE NAME
  // ==========================================================

  function getFileName(file) {

    return (
      file?.filename ||
      file?.original_filename ||
      file?.file_name ||
      file?.name ||
      "Payroll Workbook"
    );

  }

  // ==========================================================
  // FILE DATE
  // ==========================================================

  function getFileDate(file) {

    const date =
      file?.imported_at ||
      file?.uploaded_at ||
      file?.created_at ||
      file?.date;

    if (!date) {

      return "Date not available";

    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {

      return "Date not available";

    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  }

  // ==========================================================
  // FILE SIZE
  // ==========================================================

  function getFileSize(file) {

    const size =
      Number(
        file?.size ??
        file?.file_size ??
        0
      );

    if (
      !Number.isFinite(size) ||
      size <= 0
    ) {

      return "Size unavailable";

    }

    if (size < 1024) {

      return `${size} B`;

    }

    if (
      size <
      1024 * 1024
    ) {

      return `${(
        size / 1024
      ).toFixed(1)} KB`;

    }

    if (
      size <
      1024 *
      1024 *
      1024
    ) {

      return `${(
        size /
        (1024 * 1024)
      ).toFixed(1)} MB`;

    }

    return `${(
      size /
      (1024 *
        1024 *
        1024)
    ).toFixed(1)} GB`;

  }

  // ==========================================================
  // PAYROLL RECORD COUNT
  // ==========================================================

  function getRecordCount(file) {

    const count =
      file?.records ??
      file?.payroll_count ??
      file?.row_count ??
      file?.rows ??
      file?.imported ??
      file?.count;

    if (
      count === undefined ||
      count === null ||
      count === ""
    ) {

      return null;

    }

    const number =
      Number(count);

    if (
      Number.isFinite(number)
    ) {

      return number;

    }

    return String(count);

  }

  // ==========================================================
  // STATUS
  // ==========================================================

  function getStatus(file) {

    return (
      file?.status ||
      "Available"
    );

  }

  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  function getStatusClass(file) {

    const status =
      String(
        getStatus(file)
      )
        .trim()
        .toLowerCase();

    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "successful" ||
      status === "available"
    ) {

      return "payroll-status-completed";

    }

    if (
      status === "processing" ||
      status === "pending" ||
      status === "in progress"
    ) {

      return "payroll-status-processing";

    }

    if (
      status === "failed" ||
      status === "error"
    ) {

      return "payroll-status-failed";

    }

    return "payroll-status-default";

  }

  // ==========================================================
  // GET FILE ID
  // ==========================================================

  function getFileId(file) {

    return (
      file?.id ??
      file?.file_id ??
      null
    );

  }

  // ==========================================================
  // GET VIEW URL
  // ==========================================================

  function getViewUrl(file) {

    const url =
      file?.open_url ||
      file?.view_url;

    if (!url) {

      return null;

    }

    return makeAbsoluteUrl(
      url
    );

  }

  // ==========================================================
  // GET DOWNLOAD URL
  // ==========================================================

  function getDownloadUrl(file) {

    const url =
      file?.download_url;

    if (!url) {

      return null;

    }

    return makeAbsoluteUrl(
      url
    );

  }

  // ==========================================================
  // GET DELETE URL
  // ==========================================================

  function getDeleteUrl(file) {

    const fileId =
      getFileId(file);

    if (!fileId) {

      return null;

    }

    // Always build the URL
    // from the ID.

    return (
      `${PAYROLL_FILES_URL}/` +
      encodeURIComponent(
        String(fileId)
      )
    );

  }

  // ==========================================================
  // ABSOLUTE URL
  // ==========================================================

  function makeAbsoluteUrl(url) {

    if (!url) {

      return null;

    }

    const stringUrl =
      String(url);

    if (
      stringUrl.startsWith(
        "http://"
      ) ||
      stringUrl.startsWith(
        "https://"
      )
    ) {

      return stringUrl;

    }

    if (
      stringUrl.startsWith("/")
    ) {

      return (
        `${API_URL}${stringUrl}`
      );

    }

    return (
      `${API_URL}/${stringUrl}`
    );

  }

  // ==========================================================
  // OPEN PAYROLL FILE
  // ==========================================================

  const openPayrollFile =
    (file) => {

      clearMessages();

      const viewUrl =
        getViewUrl(file);

      if (viewUrl) {

        window.open(
          viewUrl,
          "_blank",
          "noopener,noreferrer"
        );

        return;

      }

      setSelectedFile(file);

    };

  // ==========================================================
  // DOWNLOAD PAYROLL FILE
  // ==========================================================

  const downloadPayrollFile =
    (file) => {

      clearMessages();

      const downloadUrl =
        getDownloadUrl(file);

      if (!downloadUrl) {

        setError(
          "Download URL is not available for this payroll workbook."
        );

        return;

      }

      const link =
        document.createElement(
          "a"
        );

      link.href =
        downloadUrl;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

    };

  // ==========================================================
  // ASK DELETE CONFIRMATION
  // ==========================================================

  const askDeletePayrollFile =
    (file) => {

      clearMessages();

      const fileId =
        getFileId(file);

      if (!fileId) {

        setError(
          "Unable to delete this payroll file because its file ID is missing."
        );

        return;

      }

      setFileToDelete(file);

    };

  // ==========================================================
  // CANCEL DELETE
  // ==========================================================

  const cancelDelete =
    () => {

      if (deleting) {

        return;

      }

      setFileToDelete(
        null
      );

    };

  // ==========================================================
  // DELETE PAYROLL FILE
  // ==========================================================

  const deletePayrollFile =
    async () => {

      if (
        !fileToDelete ||
        deleting
      ) {

        return;

      }

      const fileId =
        getFileId(
          fileToDelete
        );

      if (!fileId) {

        setError(
          "Unable to delete this payroll file because its file ID is missing."
        );

        setFileToDelete(
          null
        );

        return;

      }

      const fileName =
        getFileName(
          fileToDelete
        );

      const deleteUrl =
        getDeleteUrl(
          fileToDelete
        );

      if (!deleteUrl) {

        setError(
          "Delete URL could not be created."
        );

        return;

      }

      setDeleting(true);
      clearMessages();

      try {

        console.log(
          "Deleting payroll file:",
          {
            fileId,
            fileName,
            deleteUrl,
          }
        );

        const response =
          await fetch(
            deleteUrl,
            {
              method: "DELETE",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );

        let data = {};

        try {

          data =
            await response.json();

        } catch {

          data = {};

        }

        if (!response.ok) {

          throw new Error(
            data?.detail ||
            data?.message ||
            `Failed to delete payroll file. Server returned ${response.status}`
          );

        }

        // Remove immediately
        // from the UI.

        setFiles(
          (currentFiles) =>
            currentFiles.filter(
              (item) =>
                String(
                  getFileId(item)
                ) !==
                String(fileId)
            )
        );

        // Close details if
        // this was the selected file.

        if (
          selectedFile &&
          String(
            getFileId(
              selectedFile
            )
          ) ===
            String(fileId)
        ) {

          setSelectedFile(
            null
          );

        }

        setFileToDelete(
          null
        );

        setSuccess(
          `"${fileName}" deleted successfully.`
        );

        // Reload from backend
        // to ensure UI and
        // index.json are synchronized.

        await loadPayrollFiles();

      } catch (err) {

        console.error(
          "Payroll delete error:",
          err
        );

        setError(
          err?.message ||
          "Unable to delete payroll file."
        );

      } finally {

        setDeleting(false);

      }

    };

  // ==========================================================
  // CLOSE DETAILS
  // ==========================================================

  const closeDetails =
    () => {

      setSelectedFile(
        null
      );

    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="app payroll-app">

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <Sidebar />

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="main payroll-details-page">

        {/* ==================================================
            HERO
        ================================================== */}

        <section className="payroll-hero">

          <div
            className="payroll-hero-decoration payroll-circle-one"
          />

          <div
            className="payroll-hero-decoration payroll-circle-two"
          />

          <div className="payroll-hero-icon">

            <FileSpreadsheet
              size={34}
              strokeWidth={1.8}
            />

          </div>

          <div className="payroll-hero-content">

            <div className="payroll-eyebrow">

              PAYROLL ARCHIVE

            </div>

            <h1>

              Payroll Details

            </h1>

            <p>

              Insert and manage your
              monthly payroll Excel
              workbooks.

            </p>

          </div>

          {/* INSERT EXCEL */}

          <button
            type="button"
            className="payroll-hero-upload"
            onClick={
              openFilePicker
            }
            disabled={
              uploading ||
              deleting
            }
          >

            <Upload
              size={18}
            />

            {uploading
              ? "Inserting..."
              : "Insert Excel"}

          </button>

        </section>

        {/* ==================================================
            HIDDEN FILE INPUT
        ================================================== */}

        <input
          ref={
            fileInputRef
          }
          type="file"
          accept=".xlsx,.xls"
          className="payroll-hidden-input"
          onChange={
            handleFileChange
          }
        />

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {success && (

          <div
            className="payroll-message payroll-success"
          >

            <CheckCircle
              size={19}
            />

            <span>
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              aria-label="Dismiss success"
            >

              <X
                size={16}
              />

            </button>

          </div>

        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (

          <div
            className="payroll-message payroll-error"
          >

            <AlertCircle
              size={19}
            />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={
                clearMessages
              }
              aria-label="Dismiss error"
            >

              <X
                size={16}
              />

            </button>

          </div>

        )}

        {/* ==================================================
            PAYROLL FILES
        ================================================== */}

        <section
          className="payroll-files-section"
        >

          {/* SECTION HEADER */}

          <div
            className="payroll-section-header"
          >

            <div>

              <span
                className="payroll-section-eyebrow"
              >

                PAYROLL EXCEL ARCHIVE

              </span>

              <h2>

                Payroll Files

              </h2>

              <p>

                Your inserted monthly
                payroll workbooks.

              </p>

            </div>

            <div
              className="payroll-file-count"
            >

              <strong>

                {files.length}

              </strong>

              <span>

                {files.length === 1
                  ? "file"
                  : "files"}

              </span>

            </div>

          </div>

          {/* TOOLBAR */}

          <div
            className="payroll-toolbar"
          >

            <button
              type="button"
              className="payroll-refresh-button"
              onClick={
                loadPayrollFiles
              }
              disabled={
                loading ||
                uploading ||
                deleting
              }
            >

              <RefreshCw
                size={16}
                className={
                  loading
                    ? "payroll-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>

          {/* LOADING */}

          {loading && (

            <div
              className="payroll-loading"
            >

              <div
                className="payroll-loading-spinner"
              />

              <h3>

                Loading payroll files...

              </h3>

              <p>

                Please wait while your
                payroll Excel archive
                is loaded.

              </p>

            </div>

          )}

          {/* ERROR STATE */}

          {!loading &&
            error &&
            files.length === 0 && (

              <div
                className="payroll-error-state"
              >

                <div
                  className="payroll-error-icon"
                >

                  <AlertCircle
                    size={30}
                  />

                </div>

                <h3>

                  Unable to load payroll files

                </h3>

                <p>

                  {error}

                </p>

                <button
                  type="button"
                  onClick={
                    loadPayrollFiles
                  }
                >

                  <RefreshCw
                    size={16}
                  />

                  Try Again

                </button>

              </div>

            )}

          {/* EMPTY STATE */}

          {!loading &&
            !error &&
            files.length === 0 && (

              <div
                className="payroll-empty"
                onDragOver={
                  handleDragOver
                }
                onDrop={
                  handleDrop
                }
              >

                <div
                  className="payroll-empty-icon"
                >

                  <FolderOpen
                    size={39}
                  />

                </div>

                <div
                  className="payroll-empty-badge"
                >

                  <FileSpreadsheet
                    size={15}
                  />

                  PAYROLL EXCEL

                </div>

                <h3>

                  No payroll files yet

                </h3>

                <p>

                  Insert your first
                  monthly payroll Excel
                  workbook using the{" "}

                  <strong>

                    Insert Excel

                  </strong>{" "}

                  button above.

                </p>

                <span
                  className="payroll-drop-hint"
                >

                  or drag and drop a
                  payroll Excel file here

                </span>

              </div>

            )}

          {/* =================================================
              FILE CARDS
          ================================================= */}

          {!loading &&
            files.length > 0 && (

              <div
                className="payroll-file-grid"
              >

                {files.map(
                  (
                    file,
                    index
                  ) => {

                    const fileName =
                      getFileName(
                        file
                      );

                    const recordCount =
                      getRecordCount(
                        file
                      );

                    const status =
                      getStatus(
                        file
                      );

                    const viewUrl =
                      getViewUrl(
                        file
                      );

                    const downloadUrl =
                      getDownloadUrl(
                        file
                      );

                    const fileId =
                      getFileId(
                        file
                      ) ||
                      `${fileName}-${index}`;

                    return (

                      <article
                        className="payroll-file-card"
                        key={
                          fileId
                        }
                      >

                        {/* CARD STRIPE */}

                        <div
                          className="payroll-card-stripe"
                        />

                        {/* CARD TOP */}

                        <div
                          className="payroll-file-card-top"
                        >

                          <div
                            className="payroll-excel-icon"
                          >

                            <FileSpreadsheet
                              size={27}
                            />

                          </div>

                          <span
                            className="payroll-file-type"
                          >

                            {fileName
                              .toLowerCase()
                              .endsWith(".xls") &&
                            !fileName
                              .toLowerCase()
                              .endsWith(".xlsx")
                              ? "XLS"
                              : "XLSX"}

                          </span>

                        </div>

                        {/* FILE INFO */}

                        <div
                          className="payroll-file-info"
                        >

                          <h3
                            title={
                              fileName
                            }
                          >

                            {fileName}

                          </h3>

                          <div
                            className="payroll-file-meta"
                          >

                            <span>

                              <CalendarDays
                                size={14}
                              />

                              {getFileDate(
                                file
                              )}

                            </span>

                            <span>

                              <FileText
                                size={14}
                              />

                              {getFileSize(
                                file
                              )}

                            </span>

                          </div>

                        </div>

                        {/* RECORD INFORMATION */}

                        <div
                          className="payroll-file-record-info"
                        >

                          {recordCount !==
                          null ? (

                            <>

                              <FileText
                                size={14}
                              />

                              <span>

                                {recordCount}{" "}

                                {recordCount ===
                                1
                                  ? "payroll record"
                                  : "payroll records"}

                              </span>

                            </>

                          ) : (

                            <>

                              <FileText
                                size={14}
                              />

                              <span>

                                Original Excel
                                workbook

                              </span>

                            </>

                          )}

                        </div>

                        {/* STATUS */}

                        <div
                          className="payroll-file-status"
                        >

                          <span
                            className={`payroll-status-badge ${getStatusClass(
                              file
                            )}`}
                          >

                            {status}

                          </span>

                        </div>

                        {/* FOOTER */}

                        <div
                          className="payroll-file-actions"
                        >

                          <div
                            className="payroll-import-info"
                          >

                            <FileSpreadsheet
                              size={15}
                            />

                            <span>

                              Excel workbook
                              archived

                            </span>

                          </div>

                          <div
                            className="payroll-file-action-buttons"
                          >

                            {/* OPEN / VIEW */}

                            <button
                              type="button"
                              className="payroll-open-button"
                              onClick={() =>
                                openPayrollFile(
                                  file
                                )
                              }
                              disabled={
                                deleting
                              }
                              title={
                                viewUrl
                                  ? "Open Excel workbook preview"
                                  : "View payroll file details"
                              }
                            >

                              {viewUrl ? (

                                <ExternalLink
                                  size={16}
                                />

                              ) : (

                                <FileText
                                  size={16}
                                />

                              )}

                              <span>

                                {viewUrl
                                  ? "Open"
                                  : "View Details"}

                              </span>

                            </button>

                            {/* DOWNLOAD */}

                            {downloadUrl && (

                              <button
                                type="button"
                                className="payroll-download-button"
                                onClick={() =>
                                  downloadPayrollFile(
                                    file
                                  )
                                }
                                disabled={
                                  deleting
                                }
                                title="Download original Excel workbook"
                              >

                                <Download
                                  size={16}
                                />

                                <span>

                                  Download

                                </span>

                              </button>

                            )}

                            {/* DELETE */}

                            <button
                              type="button"
                              className="payroll-delete-button"
                              onClick={() =>
                                askDeletePayrollFile(
                                  file
                                )
                              }
                              disabled={
                                deleting
                              }
                              title="Delete payroll workbook"
                            >

                              <Trash2
                                size={16}
                              />

                              <span>

                                Delete

                              </span>

                            </button>

                          </div>

                        </div>

                      </article>

                    );

                  }
                )}

              </div>

            )}

        </section>

        {/* ==================================================
            BOTTOM INFORMATION
        ================================================== */}

        <section
          className="payroll-info-strip"
        >

          <div
            className="payroll-info-strip-icon"
          >

            <FileSpreadsheet
              size={23}
            />

          </div>

          <div>

            <strong>

              Payroll Excel files are archived separately

            </strong>

            <p>

              Payroll workbooks uploaded
              through this page are stored
              in the payroll archive. They
              are not sent through the
              employee master-data import
              endpoint.

            </p>

          </div>

        </section>

      </main>

      {/* ====================================================
          FILE DETAILS MODAL
      ==================================================== */}

      {selectedFile && (

        <div
          className="payroll-modal-overlay"
          onClick={
            closeDetails
          }
        >

          <div
            className="payroll-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div
              className="payroll-modal-header"
            >

              <div
                className="payroll-modal-title"
              >

                <div
                  className="payroll-modal-icon"
                >

                  <FileSpreadsheet
                    size={22}
                  />

                </div>

                <div>

                  <span>

                    PAYROLL EXCEL

                  </span>

                  <h2>

                    Workbook Details

                  </h2>

                </div>

              </div>

              <button
                type="button"
                className="payroll-modal-close"
                onClick={
                  closeDetails
                }
                aria-label="Close"
              >

                <X
                  size={20}
                />

              </button>

            </div>

            {/* MODAL BODY */}

            <div
              className="payroll-modal-body"
            >

              <div
                className="payroll-detail-row"
              >

                <span>

                  Workbook

                </span>

                <strong>

                  {getFileName(
                    selectedFile
                  )}

                </strong>

              </div>

              <div
                className="payroll-detail-row"
              >

                <span>

                  Upload Date

                </span>

                <strong>

                  {getFileDate(
                    selectedFile
                  )}

                </strong>

              </div>

              <div
                className="payroll-detail-row"
              >

                <span>

                  File Size

                </span>

                <strong>

                  {getFileSize(
                    selectedFile
                  )}

                </strong>

              </div>

              <div
                className="payroll-detail-row"
              >

                <span>

                  Status

                </span>

                <strong>

                  {getStatus(
                    selectedFile
                  )}

                </strong>

              </div>

              {getRecordCount(
                selectedFile
              ) !== null && (

                <div
                  className="payroll-detail-row"
                >

                  <span>

                    Payroll Records

                  </span>

                  <strong>

                    {getRecordCount(
                      selectedFile
                    )}

                  </strong>

                </div>

              )}

              {/* WORKBOOK ACTIONS */}

              <div
                className="payroll-modal-actions"
              >

                {getViewUrl(
                  selectedFile
                ) && (

                  <button
                    type="button"
                    className="payroll-open-button"
                    onClick={() =>
                      openPayrollFile(
                        selectedFile
                      )
                    }
                  >

                    <ExternalLink
                      size={17}
                    />

                    Open Workbook

                  </button>

                )}

                {getDownloadUrl(
                  selectedFile
                ) && (

                  <button
                    type="button"
                    className="payroll-download-button"
                    onClick={() =>
                      downloadPayrollFile(
                        selectedFile
                      )
                    }
                  >

                    <Download
                      size={17}
                    />

                    Download Original

                  </button>

                )}

                {/* DELETE FROM DETAILS */}

                <button
                  type="button"
                  className="payroll-delete-button"
                  onClick={() =>
                    askDeletePayrollFile(
                      selectedFile
                    )
                  }
                  disabled={
                    deleting
                  }
                >

                  <Trash2
                    size={17}
                  />

                  Delete Workbook

                </button>

              </div>

              {/* BACKEND INFORMATION */}

              {!getViewUrl(
                selectedFile
              ) && (

                <div
                  className="payroll-modal-notice"
                >

                  <FileText
                    size={20}
                  />

                  <div>

                    <strong>

                      Workbook preview unavailable

                    </strong>

                    <p>

                      The backend did not
                      return a preview URL
                      for this workbook.

                    </p>

                  </div>

                </div>

              )}

            </div>

            {/* MODAL FOOTER */}

            <div
              className="payroll-modal-footer"
            >

              <button
                type="button"
                className="payroll-modal-close-button"
                onClick={
                  closeDetails
                }
                disabled={
                  deleting
                }
              >

                Close

              </button>

            </div>

          </div>

        </div>

      )}

      {/* ====================================================
          DELETE CONFIRMATION MODAL
      ==================================================== */}

      {fileToDelete && (

        <div
          className="payroll-modal-overlay payroll-delete-overlay"
          onClick={
            deleting
              ? undefined
              : cancelDelete
          }
        >

          <div
            className="payroll-modal payroll-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* DELETE HEADER */}

            <div
              className="payroll-modal-header"
            >

              <div
                className="payroll-modal-title"
              >

                <div
                  className="payroll-modal-icon payroll-delete-icon"
                >

                  <Trash2
                    size={22}
                  />

                </div>

                <div>

                  <span>

                    PAYROLL EXCEL

                  </span>

                  <h2>

                    Delete Workbook

                  </h2>

                </div>

              </div>

              {!deleting && (

                <button
                  type="button"
                  className="payroll-modal-close"
                  onClick={
                    cancelDelete
                  }
                  aria-label="Close"
                >

                  <X
                    size={20}
                  />

                </button>

              )}

            </div>

            {/* DELETE BODY */}

            <div
              className="payroll-modal-body"
            >

              <div
                className="payroll-delete-warning"
              >

                <AlertCircle
                  size={25}
                />

                <div>

                  <strong>

                    Are you sure you want to delete this workbook?

                  </strong>

                  <p>

                    This will permanently remove the Excel file
                    from the payroll archive and from
                    <strong> index.json</strong>.

                  </p>

                </div>

              </div>

              <div
                className="payroll-detail-row"
              >

                <span>

                  Workbook

                </span>

                <strong>

                  {getFileName(
                    fileToDelete
                  )}

                </strong>

              </div>

              <div
                className="payroll-detail-row"
              >

                <span>

                  File ID

                </span>

                <strong
                  className="payroll-file-id"
                >

                  {getFileId(
                    fileToDelete
                  )}

                </strong>

              </div>

            </div>

            {/* DELETE FOOTER */}

            <div
              className="payroll-modal-footer"
            >

              <button
                type="button"
                className="payroll-modal-close-button"
                onClick={
                  cancelDelete
                }
                disabled={
                  deleting
                }
              >

                Cancel

              </button>

              <button
                type="button"
                className="payroll-delete-confirm-button"
                onClick={
                  deletePayrollFile
                }
                disabled={
                  deleting
                }
              >

                {deleting ? (

                  <>

                    <RefreshCw
                      size={16}
                      className="payroll-spin"
                    />

                    Deleting...

                  </>

                ) : (

                  <>

                    <Trash2
                      size={16}
                    />

                    Delete Permanently

                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

